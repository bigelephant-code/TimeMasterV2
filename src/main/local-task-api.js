"use strict";

// 给 OpenClaw Agent 用的窄权限只读接口：只回答「今天有哪些待办」。
//
// 鉴权用能力 URL：地址里带一段随机串，本身就是凭据。它会写进 Agent 指令，
// 因而会进入模型上下文与会话日志——所以泄露后果必须被限定死：
// 只读、只有今天、只有规划字段。备注、费用、专注、目标、历史一律不返回，
// 与设置里的「发送待办备注」无关；也没有任何写入或删除入口。
//
// 请求处理写成纯函数，服务器只负责适配，便于完整测试鉴权与裁剪。

const crypto = require("node:crypto");

const DEFAULT_LOCAL_TASK_API_PORT = 18930;
const TOKEN_RE = /^[a-f0-9]{32}$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TODOS = 200;
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function createCapabilityToken() {
  return crypto.randomBytes(16).toString("hex");
}

function normalizeLocalTaskApiConfig(input = {}) {
  const port = Math.round(Number(input.port));
  return {
    enabled: input.enabled === true,
    port: Number.isFinite(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_LOCAL_TASK_API_PORT
  };
}

function capabilityUrl(config, token) {
  const normalized = normalizeLocalTaskApiConfig(config);
  return TOKEN_RE.test(String(token || ""))
    ? `http://127.0.0.1:${normalized.port}/v1/${token}/todos/today`
    : "";
}

function tokensMatch(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isLoopbackAddress(value) {
  return LOOPBACK_ADDRESSES.has(String(value || "").trim());
}

function taskTime(value) {
  const text = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(text) ? text : null;
}

// 只保留规划字段。刻意不返回 id、备注、清单、耗时与任何历史。
function publicTodo(todo) {
  return {
    title: String(todo?.title ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200),
    startTime: taskTime(todo?.startTime),
    endTime: taskTime(todo?.endTime !== undefined ? todo.endTime : todo?.time),
    priority: Math.min(3, Math.max(0, Math.round(Number(todo?.priority) || 0))),
    quadrant: Math.min(4, Math.max(0, Math.round(Number(todo?.quadrant) || 0))),
    done: todo?.done === true
  };
}

function todayTodosPayload(todos, { today, now = Date.now() } = {}) {
  const date = YMD_RE.test(String(today || "")) ? String(today) : null;
  if (!date) return { date: null, generatedAt: Math.max(0, Number(now) || 0), todos: [] };
  const rows = (Array.isArray(todos) ? todos : [])
    .filter((todo) => todo && todo.date === date)
    .map(publicTodo)
    .filter((todo) => todo.title)
    .slice(0, MAX_TODOS);
  return { date, generatedAt: Math.max(0, Number(now) || 0), todos: rows };
}

// 返回 {status, body}。凭据不符一律 404：不确认这个地址是否存在。
function handleTaskApiRequest(request = {}, context = {}) {
  if (String(request.method || "").toUpperCase() !== "GET") {
    return { status: 405, body: { error: "method_not_allowed" } };
  }
  if (!isLoopbackAddress(request.remoteAddress)) {
    return { status: 403, body: { error: "forbidden" } };
  }
  let pathname = String(request.url || "");
  const queryAt = pathname.indexOf("?");
  if (queryAt >= 0) pathname = pathname.slice(0, queryAt);

  const match = /^\/v1\/([a-f0-9]{32})\/todos\/today$/.exec(pathname);
  if (!match) return { status: 404, body: { error: "not_found" } };
  if (!TOKEN_RE.test(String(context.token || "")) || !tokensMatch(match[1], context.token)) {
    return { status: 404, body: { error: "not_found" } };
  }
  return {
    status: 200,
    body: todayTodosPayload(context.todos, { today: context.today, now: context.now })
  };
}

module.exports = {
  DEFAULT_LOCAL_TASK_API_PORT,
  MAX_TODOS,
  createCapabilityToken,
  normalizeLocalTaskApiConfig,
  capabilityUrl,
  isLoopbackAddress,
  todayTodosPayload,
  handleTaskApiRequest
};
