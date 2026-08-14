"use strict";

// 把 AI 拆解出的行动步骤提升为独立待办。
//
// 与「AI 安排今天」同级的安全约束：先预览、用户确认后整批创建、记录批次、
// 冲突时整批拒绝零写入、撤销只删除本批次亲手创建且此后未被改动的待办。
//
// 刻意不改 todo schema：父子关联记录在批次里，避免为一个新功能引入数据迁移。

const crypto = require("node:crypto");

const MAX_STEPS_PER_BATCH = 30;
const MAX_STEP_BATCHES = 50;
const MAX_TITLE_LENGTH = 200;
const MAX_NOTE_LENGTH = 2000;
const HASH_RE = /^[a-f0-9]{64}$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

// 覆盖创建时写入的全部字段加上 updatedAt：此后任何改动都会让签名失配，
// 撤销随即整批拒绝，绝不删除用户已经投入过的内容。
function stepTodoSignature(todo) {
  return crypto.createHash("sha256").update(stableJson({
    title: cleanText(todo?.title, MAX_TITLE_LENGTH),
    note: cleanText(todo?.note, MAX_NOTE_LENGTH),
    listId: cleanText(todo?.listId, 100),
    priority: Math.min(3, Math.max(0, Math.round(Number(todo?.priority) || 0))),
    quadrant: Math.min(4, Math.max(0, Math.round(Number(todo?.quadrant) || 0))),
    done: todo?.done === true,
    date: YMD_RE.test(String(todo?.date || "")) ? String(todo.date) : null,
    startTime: cleanText(todo?.startTime, 5) || null,
    endTime: cleanText(todo?.endTime, 5) || null,
    updatedAt: Math.max(0, Number(todo?.updatedAt) || 0)
  })).digest("hex");
}

function activeBatchesFor(batches, parentTodoId, planSourceHash) {
  return (Array.isArray(batches) ? batches : []).filter((batch) => batch
    && batch.status === "applied"
    && !batch.undoneAt
    && batch.parentTodoId === parentTodoId
    && batch.planSourceHash === planSourceHash);
}

// 只在同一份拆解（planSourceHash 相同）内判定「已提升」。重新生成拆解后步骤
// 内容已经变了，沿用旧批次去拦截新步骤只会造成误判。
function promotedStepIds(batches, parentTodoId, planSourceHash) {
  const ids = new Set();
  for (const batch of activeBatchesFor(batches, parentTodoId, planSourceHash)) {
    for (const item of batch.items || []) if (item?.stepId) ids.add(String(item.stepId));
  }
  return ids;
}

function buildDraft(step, parentTodo, plan) {
  const detail = cleanText(step.detail, 1200);
  const estimate = Math.max(1, Math.round(Number(step.estimatedMinutes) || 0));
  const provenance = `来自 AI 拆解：${cleanText(parentTodo.title, 120)}（步骤 ${step.id}，预计 ${estimate} 分钟）`;
  return {
    stepId: String(step.id),
    title: cleanText(step.title, MAX_TITLE_LENGTH),
    note: cleanText(detail ? `${provenance}\n${detail}` : provenance, MAX_NOTE_LENGTH),
    listId: parentTodo.listId || null,
    priority: Math.min(3, Math.max(0, Math.round(Number(parentTodo.priority) || 0))),
    quadrant: Math.min(4, Math.max(0, Math.round(Number(parentTodo.quadrant) || 0))),
    estimatedMinutes: estimate
  };
}

// 返回 {ok:true, drafts} 或 {ok:false, reason, ...}。不产生任何副作用。
function buildStepTodoDrafts({ plan, parentTodo, stepIds, batches = [] } = {}) {
  if (!plan || typeof plan !== "object") return { ok: false, reason: "plan_missing" };
  if (!parentTodo || typeof parentTodo !== "object") return { ok: false, reason: "parent_missing" };
  if (parentTodo.done === true) return { ok: false, reason: "parent_done" };
  if (!HASH_RE.test(String(plan.sourceHash || ""))) return { ok: false, reason: "plan_missing" };

  const requested = Array.isArray(stepIds) ? stepIds.map((id) => String(id ?? "")).filter(Boolean) : [];
  if (!requested.length) return { ok: false, reason: "no_steps_selected" };
  if (new Set(requested).size !== requested.length) return { ok: false, reason: "duplicate_steps" };
  if (requested.length > MAX_STEPS_PER_BATCH) return { ok: false, reason: "too_many_steps" };

  const stepsById = new Map((Array.isArray(plan.steps) ? plan.steps : []).map((step) => [String(step?.id || ""), step]));
  const unknown = requested.filter((id) => !stepsById.has(id));
  if (unknown.length) return { ok: false, reason: "unknown_step", stepIds: unknown };

  const alreadyPromoted = promotedStepIds(batches, String(parentTodo.id), plan.sourceHash);
  const duplicated = requested.filter((id) => alreadyPromoted.has(id));
  if (duplicated.length) return { ok: false, reason: "already_promoted", stepIds: duplicated };

  const drafts = requested.map((id) => buildDraft(stepsById.get(id), parentTodo, plan));
  const untitled = drafts.filter((draft) => !draft.title);
  if (untitled.length) return { ok: false, reason: "empty_step_title", stepIds: untitled.map((d) => d.stepId) };

  return { ok: true, drafts };
}

// 全部校验通过后才开始创建，因此不存在部分写入。createTodo 由调用方注入。
function createStepTodos({ plan, parentTodo, stepIds, batches = [], createTodo, now = Date.now() } = {}) {
  if (typeof createTodo !== "function") return { ok: false, reason: "create_unavailable" };
  const prepared = buildStepTodoDrafts({ plan, parentTodo, stepIds, batches });
  if (!prepared.ok) return prepared;

  const stamp = Math.max(0, Number(now) || Date.now());
  const created = [];
  for (const draft of prepared.drafts) {
    const todo = createTodo({
      listId: draft.listId,
      title: draft.title,
      note: draft.note,
      priority: draft.priority,
      quadrant: draft.quadrant
    });
    created.push({ draft, todo });
  }

  const batch = {
    id: `step-batch-${cleanText(parentTodo.id, 100)}-${stamp}`,
    parentTodoId: String(parentTodo.id),
    planSourceHash: plan.sourceHash,
    status: "applied",
    createdAt: stamp,
    undoneAt: null,
    items: created.map(({ draft, todo }) => ({
      stepId: draft.stepId,
      todoId: String(todo.id),
      title: draft.title,
      signature: stepTodoSignature(todo)
    }))
  };

  return { ok: true, batch, createdTodoIds: batch.items.map((item) => item.todoId) };
}

// 已被用户删除的条目视为「早已撤销」直接跳过；只要还存在的条目里有任何一条
// 被改动过，就整批拒绝，一条也不删。
function undoStepBatch({ todos, batch } = {}) {
  if (!batch || batch.status !== "applied" || batch.undoneAt) return { ok: false, reason: "not_applied" };
  const items = Array.isArray(batch.items) ? batch.items : [];
  if (!items.length) return { ok: false, reason: "not_applied" };

  const byId = new Map((Array.isArray(todos) ? todos : []).filter((todo) => todo?.id).map((todo) => [String(todo.id), todo]));
  const removeTodoIds = [];
  const missingTodoIds = [];
  const conflictTodoIds = [];

  for (const item of items) {
    const todoId = String(item?.todoId || "");
    if (!todoId) continue;
    const todo = byId.get(todoId);
    if (!todo) {
      missingTodoIds.push(todoId);
      continue;
    }
    if (!HASH_RE.test(String(item.signature || "")) || stepTodoSignature(todo) !== item.signature) {
      conflictTodoIds.push(todoId);
      continue;
    }
    removeTodoIds.push(todoId);
  }

  if (conflictTodoIds.length) return { ok: false, reason: "undo_conflict", conflictTodoIds };
  return { ok: true, removeTodoIds, missingTodoIds };
}

function normalizeStepBatch(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const parentTodoId = cleanText(raw.parentTodoId, 100);
  const planSourceHash = cleanText(raw.planSourceHash, 64).toLowerCase();
  if (!parentTodoId || !HASH_RE.test(planSourceHash)) return null;
  const seen = new Set();
  const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_STEPS_PER_BATCH).flatMap((item) => {
    const todoId = cleanText(item?.todoId, 100);
    const stepId = cleanText(item?.stepId, 40);
    const signature = cleanText(item?.signature, 64).toLowerCase();
    if (!todoId || !stepId || !HASH_RE.test(signature) || seen.has(todoId)) return [];
    seen.add(todoId);
    return [{ stepId, todoId, title: cleanText(item?.title, MAX_TITLE_LENGTH), signature }];
  });
  if (!items.length) return null;
  const createdAt = Math.max(0, Number(raw.createdAt) || 0);
  const undoneAt = Math.max(0, Number(raw.undoneAt) || 0) || null;
  return {
    id: cleanText(raw.id || `step-batch-${parentTodoId}-${createdAt}`, 200),
    parentTodoId,
    planSourceHash,
    status: raw.status === "undone" || undoneAt ? "undone" : "applied",
    createdAt,
    undoneAt,
    items
  };
}

function normalizeStepBatches(raw) {
  const rows = (Array.isArray(raw) ? raw : []).flatMap((row) => {
    const batch = normalizeStepBatch(row);
    return batch ? [batch] : [];
  });
  const byId = new Map();
  for (const batch of rows) {
    const previous = byId.get(batch.id);
    if (!previous || batch.createdAt >= previous.createdAt) byId.set(batch.id, batch);
  }
  return [...byId.values()]
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
    .slice(0, MAX_STEP_BATCHES);
}

module.exports = {
  MAX_STEPS_PER_BATCH,
  MAX_STEP_BATCHES,
  stepTodoSignature,
  promotedStepIds,
  buildStepTodoDrafts,
  createStepTodos,
  undoStepBatch,
  normalizeStepBatches
};
