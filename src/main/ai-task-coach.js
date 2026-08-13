"use strict";

const crypto = require("node:crypto");

const DEFAULT_AI_TASK_COACH_ENDPOINT = "http://127.0.0.1:18789/v1/responses";
const DEFAULT_AI_TASK_COACH_AGENT_ID = "timemaster-coach";
const TASK_PLAN_TOOL_NAME = "submit_timemaster_task_plan";
const DAY_PLAN_TOOL_NAME = "submit_timemaster_day_plan";
const AI_TASK_COACH_TIMEOUT_MS = 90 * 1e3;
const AI_TASK_COACH_MAX_RESPONSE_BYTES = 512 * 1024;
const AI_TASK_COACH_STATE_VERSION = 1;
const MAX_TASK_PLANS = 500;
const MAX_DAY_PLANS = 30;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const AGENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ALLOWED_TOOLS = new Set([TASK_PLAN_TOOL_NAME, DAY_PLAN_TOOL_NAME]);

function cleanText(value, maxLength, { required = false } = {}) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
  if (required && !text) throw new Error("AI 返回了空的必填文本字段。");
  return text;
}

function normalizeTime(value) {
  const text = String(value ?? "").trim();
  return TIME_RE.test(text) ? text : null;
}

function taskStartTime(todo) {
  return normalizeTime(todo?.startTime);
}

function taskEndTime(todo) {
  return normalizeTime(todo?.endTime !== undefined ? todo.endTime : todo?.time);
}

function timeMinutes(value) {
  const time = normalizeTime(value);
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesTime(value) {
  const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.round(Number(value) || 0)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function normalizedMinutes(value, { fallback = null, min = 1, max = 7 * 24 * 60 } = {}) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) {
    if (fallback === null) throw new Error("AI 返回了无效的预计时长。");
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function normalizeLoopbackResponsesEndpoint(value) {
  try {
    const url = new URL(String(value || DEFAULT_AI_TASK_COACH_ENDPOINT));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "http:") return null;
    if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/v1/responses") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeWorkPeriod(raw, fallback) {
  const start = normalizeTime(raw?.start) || fallback.start;
  const end = normalizeTime(raw?.end) || fallback.end;
  if (timeMinutes(start) >= timeMinutes(end)) return { ...fallback };
  return { start, end };
}

function normalizeAiTaskCoachConfig(input = {}) {
  const endpoint = normalizeLoopbackResponsesEndpoint(input.endpoint);
  const agentCandidate = cleanText(input.agentId || DEFAULT_AI_TASK_COACH_AGENT_ID, 64);
  const agentId = AGENT_ID_RE.test(agentCandidate) ? agentCandidate : DEFAULT_AI_TASK_COACH_AGENT_ID;
  const workday = normalizeWorkPeriod(input.workday, { start: "09:00", end: "18:00" });
  let lunch = normalizeWorkPeriod(input.lunch, { start: "12:00", end: "13:00" });
  if (timeMinutes(lunch.end) <= timeMinutes(workday.start) || timeMinutes(lunch.start) >= timeMinutes(workday.end)) {
    lunch = { start: "12:00", end: "13:00" };
  }
  return {
    enabled: input.enabled === true && !!endpoint,
    endpoint,
    agentId,
    includeNote: input.includeNote === true,
    autoPlanNewTodos: input.autoPlanNewTodos === true,
    workday,
    lunch,
    bufferMinutes: Math.min(60, Math.max(0, Math.round(Number(input.bufferMinutes ?? input.buffer ?? 10) || 0)))
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function taskSourceHash(todo, { includeNote = false } = {}) {
  const source = {
    id: cleanText(todo?.id, 100),
    title: cleanText(todo?.title, 200),
    note: includeNote ? cleanText(todo?.note, 2e3) : "",
    priority: Math.min(3, Math.max(0, Math.round(Number(todo?.priority) || 0))),
    quadrant: Math.min(4, Math.max(0, Math.round(Number(todo?.quadrant) || 0))),
    repeat: ["none", "daily", "weekly", "monthly", "yearly"].includes(todo?.repeat) ? todo.repeat : "none"
  };
  return crypto.createHash("sha256").update(stableJson(source)).digest("hex");
}

function normalizeStringArray(value, { maxItems, maxLength }) {
  if (!Array.isArray(value)) throw new Error("AI 返回的列表字段格式无效。");
  return value.slice(0, maxItems).map((item) => cleanText(item, maxLength, { required: true }));
}

function normalizeHttpsUrl(value) {
  const text = cleanText(value, 2048, { required: true });
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      throw new Error("AI 返回的链接必须是无账号信息的 HTTPS 地址。");
    }
    return url.toString();
  } catch (error) {
    if (/必须是/.test(String(error?.message || ""))) throw error;
    throw new Error("AI 返回了无效的官方链接。");
  }
}

function normalizeTaskPlan(raw, { todoId, sourceHash, generatedAt = Date.now() } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("AI 任务方案不是对象。");
  const normalizedTodoId = cleanText(todoId || raw.todoId, 100, { required: true });
  const normalizedHash = cleanText(sourceHash || raw.sourceHash, 64).toLowerCase();
  if (!HASH_RE.test(normalizedHash)) throw new Error("AI 任务方案缺少有效的来源指纹。");
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) throw new Error("AI 任务方案至少需要一个执行步骤。");
  if (!Array.isArray(raw.officialLinks)) throw new Error("AI 任务方案缺少官方链接列表。");
  const steps = raw.steps.slice(0, 30).map((step, index) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) throw new Error("AI 返回了无效的步骤。");
    return {
      id: `step-${index + 1}`,
      title: cleanText(step.title, 120, { required: true }),
      detail: cleanText(step.detail, 800),
      estimatedMinutes: normalizedMinutes(step.estimatedMinutes, { min: 1, max: 24 * 60 }),
      done: step.done === true
    };
  });
  const officialLinks = raw.officialLinks.slice(0, 12).map((link) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) throw new Error("AI 返回了无效的官方链接。");
    return {
      label: cleanText(link.label, 100, { required: true }),
      url: normalizeHttpsUrl(link.url),
      purpose: cleanText(link.purpose, 300)
    };
  });
  return {
    todoId: normalizedTodoId,
    sourceHash: normalizedHash,
    generatedAt: Math.max(0, Number(generatedAt) || Date.now()),
    summary: cleanText(raw.summary, 600, { required: true }),
    nextAction: cleanText(raw.nextAction, 300, { required: true }),
    questions: normalizeStringArray(raw.questions, { maxItems: 8, maxLength: 300 }),
    prerequisites: normalizeStringArray(raw.prerequisites, { maxItems: 20, maxLength: 400 }),
    steps,
    officialLinks,
    cautions: normalizeStringArray(raw.cautions, { maxItems: 15, maxLength: 500 }),
    followUps: normalizeStringArray(raw.followUps, { maxItems: 15, maxLength: 500 }),
    estimatedMinutes: normalizedMinutes(raw.estimatedMinutes, { min: 1, max: 7 * 24 * 60 })
  };
}

const STRING_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };
const TASK_PLAN_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "nextAction", "questions", "prerequisites", "steps", "officialLinks", "cautions", "followUps", "estimatedMinutes"],
  properties: {
    summary: { type: "string" },
    nextAction: { type: "string" },
    questions: STRING_ARRAY_SCHEMA,
    prerequisites: STRING_ARRAY_SCHEMA,
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "estimatedMinutes"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          estimatedMinutes: { type: "integer", minimum: 1 }
        }
      }
    },
    officialLinks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "url", "purpose"],
        properties: { label: { type: "string" }, url: { type: "string" }, purpose: { type: "string" } }
      }
    },
    cautions: STRING_ARRAY_SCHEMA,
    followUps: STRING_ARRAY_SCHEMA,
    estimatedMinutes: { type: "integer", minimum: 1 }
  }
};

const DAY_PLAN_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["todoId", "rank", "estimatedMinutes", "reason"],
        properties: {
          todoId: { type: "string" },
          rank: { type: "integer", minimum: 1 },
          estimatedMinutes: { type: "integer", minimum: 1 },
          reason: { type: "string" }
        }
      }
    }
  }
};

function baseRequest(toolName, parameters, input, instructions, agentId) {
  return {
    model: `openclaw/${agentId}`,
    input,
    instructions,
    tools: [{
      type: "function",
      name: toolName,
      description: "Return the TimeMaster plan through this function only.",
      parameters,
      strict: true
    }],
    tool_choice: { type: "function", name: toolName },
    stream: false,
    max_output_tokens: 8e3
  };
}

function publicTodo(todo, includeNote) {
  const row = {
    id: cleanText(todo?.id, 100),
    title: cleanText(todo?.title, 200),
    date: YMD_RE.test(String(todo?.date || "")) ? String(todo.date) : null,
    startTime: taskStartTime(todo),
    endTime: taskEndTime(todo),
    priority: Math.min(3, Math.max(0, Math.round(Number(todo?.priority) || 0))),
    quadrant: Math.min(4, Math.max(0, Math.round(Number(todo?.quadrant) || 0))),
    repeat: cleanText(todo?.repeat || "none", 20)
  };
  if (includeNote) row.note = cleanText(todo?.note, 2e3);
  return row;
}

function normalizeRequestContext(context = {}) {
  return {
    locale: cleanText(context.locale || "zh-CN", 20),
    today: YMD_RE.test(String(context.today || "")) ? String(context.today) : null,
    date: YMD_RE.test(String(context.date || "")) ? String(context.date) : null,
    now: cleanText(context.now, 40),
    timezone: cleanText(context.timezone, 100),
    listName: cleanText(context.listName, 100),
    userGoal: cleanText(context.userGoal, 500)
  };
}

function buildTaskPlanRequest(todo, context = {}, configInput = {}) {
  const config = normalizeAiTaskCoachConfig(configInput);
  const payload = { task: publicTodo(todo, config.includeNote), context: normalizeRequestContext(context) };
  return baseRequest(
    TASK_PLAN_TOOL_NAME,
    TASK_PLAN_PARAMETERS,
    JSON.stringify(payload),
    "你是时间大师的任务教练。请把任务拆成低阻力、可执行的步骤；需要查证时只给官方 HTTPS 入口，不能编造。问题无法确定时写入 questions。只调用指定函数返回中文结构化方案。",
    config.agentId
  );
}

function buildDayPlanRequest(todos, context = {}, configInput = {}) {
  const config = normalizeAiTaskCoachConfig(configInput);
  const payload = {
    tasks: (Array.isArray(todos) ? todos : []).slice(0, 200).map((todo) => publicTodo(todo, config.includeNote)),
    context: normalizeRequestContext(context)
  };
  return baseRequest(
    DAY_PLAN_TOOL_NAME,
    DAY_PLAN_PARAMETERS,
    JSON.stringify(payload),
    "你是时间大师的任务排序教练。只判断任务顺序和现实预计时长，不生成具体钟点；本地调度器会避开固定日程、午休与缓冲。优先考虑四象限、依赖和用户精力。只调用指定函数返回结果。",
    config.agentId
  );
}

function extractFunctionCall(response, expectedTool) {
  if (!ALLOWED_TOOLS.has(expectedTool)) throw new Error("不支持的 AI 方案工具。");
  if (!response || typeof response !== "object" || !Array.isArray(response.output)) throw new Error("OpenClaw 返回格式无效。");
  const calls = response.output.filter((item) => item?.type === "function_call");
  if (calls.length !== 1 || calls[0].name !== expectedTool || !ALLOWED_TOOLS.has(calls[0].name)) {
    throw new Error("OpenClaw 未返回唯一且匹配的结构化方案。");
  }
  const rawArguments = calls[0].arguments;
  if (typeof rawArguments !== "string" && (!rawArguments || typeof rawArguments !== "object" || Array.isArray(rawArguments))) {
    throw new Error("OpenClaw 返回的函数参数格式无效。");
  }
  if (typeof rawArguments === "string" && Buffer.byteLength(rawArguments, "utf8") > AI_TASK_COACH_MAX_RESPONSE_BYTES) {
    throw new Error("OpenClaw 返回的函数参数过大。");
  }
  try {
    const parsed = typeof rawArguments === "string" ? JSON.parse(rawArguments) : rawArguments;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new Error("OpenClaw 返回的函数参数不是有效 JSON 对象。");
  }
}

async function readResponseBodyLimited(response, maxBytes = AI_TASK_COACH_MAX_RESPONSE_BYTES) {
  const declared = Number(response?.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("OpenClaw 响应体超过安全上限。");
  if (response?.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new Error("OpenClaw 响应体超过安全上限。");
        }
        chunks.push(chunk);
      }
      return Buffer.concat(chunks, total).toString("utf8");
    } finally {
      reader.releaseLock?.();
    }
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("OpenClaw 响应体超过安全上限。");
  return text;
}

async function requestOpenClawPlan(request, dependencies = {}) {
  const endpoint = normalizeLoopbackResponsesEndpoint(request?.endpoint);
  if (!endpoint) throw new Error("AI Gateway 必须是本机 HTTP /v1/responses 地址。");
  if (!ALLOWED_TOOLS.has(request?.expectedTool)) throw new Error("不支持的 AI 方案工具。");
  const agentId = AGENT_ID_RE.test(String(request?.agentId || "")) ? String(request.agentId) : DEFAULT_AI_TASK_COACH_AGENT_ID;
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("当前环境不支持 HTTP 请求。");
  const clock = dependencies.clock || globalThis;
  const controller = new AbortController();
  const timeout = clock.setTimeout(() => controller.abort(), AI_TASK_COACH_TIMEOUT_MS);
  const token = cleanText(request?.token, 4096);
  try {
    const headers = { "content-type": "application/json", "x-openclaw-agent-id": agentId };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(request.body),
      redirect: "error",
      signal: controller.signal
    });
    const text = await readResponseBodyLimited(response);
    if (!response.ok) throw new Error(`OpenClaw 请求失败（HTTP ${response.status}）。`);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("OpenClaw 响应不是有效 JSON。");
    }
    return { responseId: cleanText(parsed.id, 200), arguments: extractFunctionCall(parsed, request.expectedTool) };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("OpenClaw 生成方案超时（90 秒）。");
    const message = String(error?.message || "OpenClaw 请求失败。");
    const safeMessage = token ? message.replaceAll(token, "[已隐藏]") : message;
    throw new Error(safeMessage);
  } finally {
    clock.clearTimeout(timeout);
  }
}

function scheduleSnapshot(todo) {
  return {
    date: YMD_RE.test(String(todo?.date || "")) ? String(todo.date) : null,
    startTime: taskStartTime(todo),
    endTime: taskEndTime(todo),
    time: normalizeTime(todo?.time ?? todo?.endTime),
    notifiedKey: todo?.notifiedKey == null ? null : cleanText(todo.notifiedKey, 300),
    updatedAt: Math.max(0, Number(todo?.updatedAt) || 0)
  };
}

function scheduleSignature(todo) {
  const snapshot = scheduleSnapshot(todo);
  return crypto.createHash("sha256").update(stableJson({
    date: snapshot.date,
    startTime: snapshot.startTime,
    endTime: snapshot.endTime,
    time: snapshot.time,
    updatedAt: snapshot.updatedAt
  })).digest("hex");
}

function localYmd(now) {
  const date = now instanceof Date ? now : new Date(now);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ceilQuarter(minutes) {
  return Math.ceil(minutes / 15) * 15;
}

function normalizeAiDayItems(raw, todosById) {
  const rows = Array.isArray(raw?.items) ? raw.items : [];
  const seen = new Set();
  return rows.slice(0, 500).flatMap((row, index) => {
    const todoId = cleanText(row?.todoId, 100);
    if (!todoId || !todosById.has(todoId) || seen.has(todoId)) return [];
    seen.add(todoId);
    return [{
      todoId,
      rank: normalizedMinutes(row?.rank, { fallback: index + 1, min: 1, max: 1e4 }),
      estimatedMinutes: normalizedMinutes(row?.estimatedMinutes, { fallback: 30, min: 1, max: 24 * 60 }),
      reason: cleanText(row?.reason, 300)
    }];
  });
}

function fallbackTaskCompare(a, b) {
  const aq = Number(a.quadrant) >= 1 && Number(a.quadrant) <= 4 ? Number(a.quadrant) : 5;
  const bq = Number(b.quadrant) >= 1 && Number(b.quadrant) <= 4 ? Number(b.quadrant) : 5;
  return aq - bq || Number(b.priority || 0) - Number(a.priority || 0) || Number(a.order || 0) - Number(b.order || 0) || String(a.id).localeCompare(String(b.id));
}

function taskFixedInterval(todo, date, bufferMinutes) {
  if (todo?.date !== date) return null;
  const start = timeMinutes(todo?.startTime);
  const end = timeMinutes(taskEndTime(todo));
  if (start === null && end === null) return null;
  let from;
  let to;
  if (start !== null && end !== null) {
    from = start;
    to = end > start ? end : 24 * 60;
  } else if (start !== null) {
    from = start;
    to = Math.min(24 * 60, start + 30);
  } else {
    from = Math.max(0, end - 30);
    to = end;
  }
  return { start: Math.max(0, from - bufferMinutes), end: Math.min(24 * 60, to + bufferMinutes), todoId: String(todo.id), fixed: true };
}

function mergeIntervals(intervals) {
  const sorted = intervals.filter((row) => row.end > row.start).sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (!last || interval.start > last.end) merged.push({ ...interval });
    else last.end = Math.max(last.end, interval.end);
  }
  return merged;
}

function findSlot(earliest, duration, workEnd, blocked) {
  let cursor = earliest;
  for (const interval of mergeIntervals(blocked)) {
    if (interval.end <= cursor) continue;
    if (cursor + duration <= interval.start) return { start: cursor, end: cursor + duration };
    cursor = Math.max(cursor, interval.end);
    if (cursor + duration > workEnd) return null;
  }
  return cursor + duration <= workEnd ? { start: cursor, end: cursor + duration } : null;
}

function createDeterministicDayPlan({ date, todos, aiPlan = {}, config: configInput = {}, now = Date.now() } = {}) {
  if (!YMD_RE.test(String(date || ""))) throw new Error("日程草案日期无效。");
  const config = normalizeAiTaskCoachConfig(configInput);
  const rows = Array.isArray(todos) ? todos : [];
  const todosById = new Map(rows.map((todo) => [String(todo?.id || ""), todo]).filter(([id]) => id));
  const aiItems = normalizeAiDayItems(aiPlan, todosById);
  const aiById = new Map(aiItems.map((item) => [item.todoId, item]));
  const workStart = timeMinutes(config.workday.start);
  const workEnd = timeMinutes(config.workday.end);
  const lunchStart = Math.max(workStart, timeMinutes(config.lunch.start));
  const lunchEnd = Math.min(workEnd, timeMinutes(config.lunch.end));
  const nowDate = now instanceof Date ? now : new Date(now);
  let earliest = workStart;
  if (localYmd(nowDate) === date) earliest = Math.max(workStart, ceilQuarter(nowDate.getHours() * 60 + nowDate.getMinutes()));
  const blocked = [];
  if (lunchEnd > lunchStart) blocked.push({ start: lunchStart, end: lunchEnd, lunch: true });
  const preserved = [];
  for (const todo of rows) {
    if (todo?.done || !(taskStartTime(todo) || taskEndTime(todo))) continue;
    preserved.push({
      todoId: String(todo.id),
      startTime: taskStartTime(todo),
      endTime: taskEndTime(todo),
      reason: "fixed_schedule",
      locked: true
    });
    const interval = taskFixedInterval(todo, date, config.bufferMinutes);
    if (interval) blocked.push(interval);
  }
  const eligible = rows.filter((todo) => todo && !todo.done && !(taskStartTime(todo) || taskEndTime(todo)));
  const ordered = [...eligible].sort((a, b) => {
    const aiA = aiById.get(String(a.id));
    const aiB = aiById.get(String(b.id));
    if (aiA && aiB) return aiA.rank - aiB.rank || fallbackTaskCompare(a, b);
    if (aiA) return -1;
    if (aiB) return 1;
    return fallbackTaskCompare(a, b);
  });
  const items = [];
  const unscheduled = [];
  for (const todo of ordered) {
    const ai = aiById.get(String(todo.id));
    const estimatedMinutes = normalizedMinutes(ai?.estimatedMinutes, { fallback: 30, min: 1, max: 24 * 60 });
    if (todo.startedAt) {
      unscheduled.push({ todoId: String(todo.id), estimatedMinutes, reason: "running" });
      continue;
    }
    if (todo.repeat && todo.repeat !== "none") {
      unscheduled.push({ todoId: String(todo.id), estimatedMinutes, reason: "repeating" });
      continue;
    }
    const duration = Math.max(15, ceilQuarter(estimatedMinutes));
    const slot = findSlot(earliest, duration, workEnd, blocked);
    if (!slot) {
      unscheduled.push({ todoId: String(todo.id), estimatedMinutes, reason: "no_capacity" });
      continue;
    }
    const item = {
      todoId: String(todo.id),
      startTime: minutesTime(slot.start),
      endTime: minutesTime(slot.end),
      estimatedMinutes,
      reason: cleanText(ai?.reason || "按四象限和优先级安排", 300)
    };
    items.push(item);
    blocked.push({
      start: Math.max(workStart, slot.start - config.bufferMinutes),
      end: Math.min(workEnd, slot.end + config.bufferMinutes),
      todoId: item.todoId
    });
    earliest = slot.end + config.bufferMinutes;
  }
  const createdAt = Math.max(0, nowDate.getTime() || Date.now());
  return {
    id: `day-plan-${date}-${createdAt}`,
    date: String(date),
    status: "draft",
    createdAt,
    sourceSchedules: rows.filter((todo) => todo?.id && !todo.done).map((todo) => ({ todoId: String(todo.id), signature: scheduleSignature(todo) })),
    items,
    preserved,
    unscheduled,
    warnings: unscheduled.some((item) => item.reason === "no_capacity") ? ["工作时段容量不足，部分任务未自动安排。"] : []
  };
}

function sameSchedule(todo, expected) {
  return scheduleSignature(todo) === expected;
}

function currentConflictIds(todosById, sourceSchedules) {
  const conflicts = [];
  for (const source of Array.isArray(sourceSchedules) ? sourceSchedules : []) {
    const todo = todosById.get(String(source?.todoId || ""));
    if (!todo || !HASH_RE.test(String(source?.signature || "")) || !sameSchedule(todo, source.signature)) conflicts.push(String(source?.todoId || ""));
  }
  return [...new Set(conflicts.filter(Boolean))];
}

function validateDayPlanItems(plan, todosById) {
  if (!YMD_RE.test(String(plan?.date || "")) || !Array.isArray(plan?.items)) return { ok: false, reason: "invalid_plan", conflictTodoIds: [] };
  const seen = new Set();
  const intervals = [];
  for (const item of plan.items) {
    const todoId = String(item?.todoId || "");
    const todo = todosById.get(todoId);
    const start = timeMinutes(item?.startTime);
    const end = timeMinutes(item?.endTime);
    if (!todoId || seen.has(todoId) || !todo || todo.done || todo.startedAt || todo.repeat && todo.repeat !== "none" || start === null || end === null || end <= start) {
      return { ok: false, reason: "invalid_plan_item", conflictTodoIds: todoId ? [todoId] : [] };
    }
    if (taskStartTime(todo) || taskEndTime(todo)) {
      return { ok: false, reason: "task_already_scheduled", conflictTodoIds: [todoId] };
    }
    seen.add(todoId);
    intervals.push({ todoId, start, end });
  }
  intervals.sort((a, b) => a.start - b.start);
  for (let index = 1; index < intervals.length; index++) {
    if (intervals[index].start < intervals[index - 1].end) {
      return { ok: false, reason: "overlapping_plan", conflictTodoIds: [intervals[index - 1].todoId, intervals[index].todoId] };
    }
  }
  for (const todo of todosById.values()) {
    if (seen.has(String(todo.id)) || todo.done || todo.date !== plan.date) continue;
    const fixed = taskFixedInterval(todo, plan.date, 0);
    if (!fixed) continue;
    for (const interval of intervals) {
      if (interval.start < fixed.end && fixed.start < interval.end) {
        return { ok: false, reason: "overlaps_fixed_task", conflictTodoIds: [String(todo.id), interval.todoId] };
      }
    }
  }
  return { ok: true };
}

function applyDayPlan(todos, plan, { now = Date.now() } = {}) {
  const rows = Array.isArray(todos) ? todos : [];
  const todosById = new Map(rows.filter((todo) => todo?.id).map((todo) => [String(todo.id), todo]));
  const sourceRows = Array.isArray(plan?.sourceSchedules) ? plan.sourceSchedules : [];
  const sourceIds = new Set();
  for (const source of sourceRows) {
    const todoId = String(source?.todoId || "");
    if (!todoId || sourceIds.has(todoId) || !HASH_RE.test(String(source?.signature || ""))) {
      return { ok: false, reason: "invalid_plan_sources", conflictTodoIds: todoId ? [todoId] : [] };
    }
    sourceIds.add(todoId);
  }
  const missingSourceIds = (Array.isArray(plan?.items) ? plan.items : [])
    .map((item) => String(item?.todoId || ""))
    .filter((todoId) => todoId && !sourceIds.has(todoId));
  if (missingSourceIds.length) {
    return { ok: false, reason: "invalid_plan_sources", conflictTodoIds: [...new Set(missingSourceIds)] };
  }
  const sourceConflicts = currentConflictIds(todosById, plan?.sourceSchedules);
  if (sourceConflicts.length) return { ok: false, reason: "stale_plan", conflictTodoIds: sourceConflicts };
  const itemValidation = validateDayPlanItems(plan, todosById);
  if (!itemValidation.ok) return itemValidation;
  const stamp = Math.max(0, Number(now) || Date.now());
  const changes = plan.items.map((item) => {
    const todo = todosById.get(String(item.todoId));
    const before = scheduleSnapshot(todo);
    const after = {
      date: plan.date,
      startTime: normalizeTime(item.startTime),
      endTime: normalizeTime(item.endTime),
      time: normalizeTime(item.endTime),
      notifiedKey: null,
      updatedAt: stamp
    };
    return { todo, todoId: String(todo.id), before, after };
  });
  for (const change of changes) Object.assign(change.todo, change.after);
  const undo = {
    id: `undo-${cleanText(plan.id, 180) || plan.date}-${stamp}`,
    planId: cleanText(plan.id, 200),
    date: plan.date,
    createdAt: stamp,
    items: changes.map(({ todoId, before, after }) => ({
      todoId,
      before,
      after,
      afterSignature: scheduleSignature(after)
    }))
  };
  return { ok: true, changedTodoIds: changes.map((change) => change.todoId), undo };
}

function undoDayPlan(todos, undo, { now = Date.now() } = {}) {
  const rows = Array.isArray(todos) ? todos : [];
  const todosById = new Map(rows.filter((todo) => todo?.id).map((todo) => [String(todo.id), todo]));
  if (!undo || !Array.isArray(undo.items)) return { ok: false, reason: "invalid_undo", conflictTodoIds: [] };
  const conflicts = [];
  const prepared = [];
  const seen = new Set();
  for (const item of undo.items) {
    const todoId = String(item?.todoId || "");
    const todo = todosById.get(todoId);
    if (!todoId || seen.has(todoId) || !todo || !item.before || !item.after) {
      conflicts.push(todoId);
      continue;
    }
    seen.add(todoId);
    const expected = HASH_RE.test(String(item.afterSignature || "")) ? item.afterSignature : scheduleSignature(item.after);
    if (!sameSchedule(todo, expected)) {
      conflicts.push(todoId);
      continue;
    }
    prepared.push({ todo, todoId, before: item.before });
  }
  if (conflicts.length) return { ok: false, reason: "undo_conflict", conflictTodoIds: [...new Set(conflicts.filter(Boolean))] };
  const stamp = Math.max(0, Number(now) || Date.now());
  for (const change of prepared) {
    Object.assign(change.todo, {
      date: YMD_RE.test(String(change.before.date || "")) ? String(change.before.date) : null,
      startTime: normalizeTime(change.before.startTime),
      endTime: normalizeTime(change.before.endTime),
      time: normalizeTime(change.before.time ?? change.before.endTime),
      notifiedKey: change.before.notifiedKey == null ? null : cleanText(change.before.notifiedKey, 300),
      updatedAt: stamp
    });
  }
  return { ok: true, changedTodoIds: prepared.map((change) => change.todoId) };
}

function normalizeStoredDayPlan(raw) {
  if (!raw || typeof raw !== "object" || !YMD_RE.test(String(raw.date || ""))) return null;
  const status = ["draft", "applied", "undone"].includes(raw.status) ? raw.status : "draft";
  const normalized = {
    id: cleanText(raw.id || `day-plan-${raw.date}`, 200),
    date: String(raw.date),
    status,
    createdAt: Math.max(0, Number(raw.createdAt) || 0),
    appliedAt: Math.max(0, Number(raw.appliedAt) || 0) || null,
    undoneAt: Math.max(0, Number(raw.undoneAt) || 0) || null,
    sourceSchedules: (Array.isArray(raw.sourceSchedules) ? raw.sourceSchedules : []).slice(0, 500).flatMap((source) => {
      const todoId = cleanText(source?.todoId, 100);
      const signature = cleanText(source?.signature, 64).toLowerCase();
      return todoId && HASH_RE.test(signature) ? [{ todoId, signature }] : [];
    }),
    items: (Array.isArray(raw.items) ? raw.items : []).slice(0, 200).flatMap((item) => {
      const todoId = cleanText(item?.todoId, 100);
      const startTime = normalizeTime(item?.startTime);
      const endTime = normalizeTime(item?.endTime);
      return todoId && startTime && endTime && endTime > startTime ? [{
        todoId,
        startTime,
        endTime,
        estimatedMinutes: normalizedMinutes(item.estimatedMinutes, { fallback: 30, min: 1, max: 24 * 60 }),
        reason: cleanText(item.reason, 300)
      }] : [];
    }),
    preserved: (Array.isArray(raw.preserved) ? raw.preserved : []).slice(0, 500).flatMap((item) => {
      const todoId = cleanText(item?.todoId, 100);
      return todoId ? [{
        todoId,
        startTime: normalizeTime(item?.startTime),
        endTime: normalizeTime(item?.endTime),
        reason: cleanText(item?.reason, 80),
        locked: true
      }] : [];
    }),
    unscheduled: (Array.isArray(raw.unscheduled) ? raw.unscheduled : []).slice(0, 500).flatMap((item) => {
      const todoId = cleanText(item?.todoId, 100);
      return todoId ? [{
        todoId,
        estimatedMinutes: normalizedMinutes(item?.estimatedMinutes, { fallback: 30, min: 1, max: 24 * 60 }),
        reason: cleanText(item?.reason, 80)
      }] : [];
    }),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.slice(0, 20).map((item) => cleanText(item, 300)).filter(Boolean) : []
  };
  const normalizedUndo = normalizeStoredUndo(raw.undo, normalized.id, normalized.date);
  if (normalizedUndo) normalized.undo = normalizedUndo;
  return normalized;
}

function normalizeStoredUndo(raw, fallbackPlanId, fallbackDate) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) return null;
  const date = YMD_RE.test(String(raw.date || "")) ? String(raw.date) : fallbackDate;
  const seen = new Set();
  const items = [];
  for (const item of raw.items.slice(0, 200)) {
    const todoId = cleanText(item?.todoId, 100);
    if (!todoId || seen.has(todoId) || !item?.before || !item?.after) continue;
    seen.add(todoId);
    const before = scheduleSnapshot(item.before);
    const after = scheduleSnapshot(item.after);
    items.push({ todoId, before, after, afterSignature: scheduleSignature(after) });
  }
  return {
    id: cleanText(raw.id || `undo-${fallbackPlanId}`, 200),
    planId: cleanText(raw.planId || fallbackPlanId, 200),
    date,
    createdAt: Math.max(0, Number(raw.createdAt) || 0),
    items
  };
}

function normalizeAiTaskCoachState(raw, { now = Date.now() } = {}) {
  const taskPlansInput = raw?.taskPlans && typeof raw.taskPlans === "object" && !Array.isArray(raw.taskPlans) ? Object.values(raw.taskPlans) : [];
  const taskPlans = Object.create(null);
  for (const candidate of taskPlansInput.sort((a, b) => Number(b?.generatedAt || 0) - Number(a?.generatedAt || 0)).slice(0, MAX_TASK_PLANS)) {
    try {
      const plan = normalizeTaskPlan(candidate, {
        todoId: candidate?.todoId,
        sourceHash: candidate?.sourceHash,
        generatedAt: candidate?.generatedAt
      });
      taskPlans[plan.todoId] = plan;
    } catch {
      // Corrupt or older partial plans are ignored instead of blocking app startup.
    }
  }
  const byDate = new Map();
  for (const candidate of Array.isArray(raw?.dayPlans) ? raw.dayPlans : []) {
    const plan = normalizeStoredDayPlan(candidate);
    if (!plan) continue;
    const previous = byDate.get(plan.date);
    const planIsActive = plan.status === "applied" && !plan.undoneAt && !!plan.undo;
    const previousIsActive = previous?.status === "applied" && !previous.undoneAt && !!previous.undo;
    if (!previous || planIsActive && !previousIsActive || planIsActive === previousIsActive && plan.createdAt >= previous.createdAt) {
      byDate.set(plan.date, plan);
    }
  }
  const dayPlans = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, MAX_DAY_PLANS);
  return {
    version: AI_TASK_COACH_STATE_VERSION,
    taskPlans,
    dayPlans
  };
}

module.exports = {
  DEFAULT_AI_TASK_COACH_ENDPOINT,
  DEFAULT_AI_TASK_COACH_AGENT_ID,
  TASK_PLAN_TOOL_NAME,
  DAY_PLAN_TOOL_NAME,
  AI_TASK_COACH_TIMEOUT_MS,
  AI_TASK_COACH_MAX_RESPONSE_BYTES,
  normalizeLoopbackResponsesEndpoint,
  normalizeAiTaskCoachConfig,
  taskSourceHash,
  normalizeTaskPlan,
  buildTaskPlanRequest,
  buildDayPlanRequest,
  extractFunctionCall,
  requestOpenClawPlan,
  scheduleSignature,
  createDeterministicDayPlan,
  applyDayPlan,
  undoDayPlan,
  normalizeAiTaskCoachState
};
