#!/usr/bin/env node
// 时间大师 MCP server：把「今天的待办」作为一个只读工具暴露给 OpenClaw Agent。
//
// 为什么需要它：OpenClaw 的 web_fetch 带 SSRF 防护，禁止访问回环地址，且该
// 限制不可配置（tools.web.fetch.ssrfPolicy 是 strict 的，只有两个无关字段）。
// MCP 是官方扩展点，服务进程由 OpenClaw 直接拉起，不受那道防护约束。
//
// 凭据从环境变量读取，由 openclaw.json 的 mcp.servers.<name>.env 提供，
// 因此不会进入模型上下文或会话日志——这比把地址写进 Agent 指令更安全。
//
// 手写最小 JSON-RPC 以避免引入依赖：只实现 initialize / tools/list / tools/call。

import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2024-11-05";
const REQUEST_TIMEOUT_MS = 8000;
const URL_RE = /^http:\/\/127\.0\.0\.1:\d+\/v1\/[a-f0-9]{32}\/todos\/today$/;

const endpoint = String(process.env.TIMEMASTER_TODAY_URL || "").trim();

const TOOL = {
  name: "list_today_todos",
  description:
    "读取时间大师中今天的待办。只读，只有今天，返回标题、起止时间、优先级(0无/1低/2中/3高)、" +
    "四象限(1重要且紧急/2重要不紧急/3紧急不重要/4都不)与完成状态。不含备注、费用、专注记录与历史。",
  inputSchema: { type: "object", properties: {}, additionalProperties: false }
};

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

// 工具执行失败按 isError 返回，让模型能如实告知用户，而不是整轮崩掉。
function toolFailure(text) {
  return { content: [{ type: "text", text }], isError: true };
}

async function listTodayTodos() {
  if (!URL_RE.test(endpoint)) {
    return toolFailure("时间大师接口地址未配置或格式不正确，请在时间大师设置中重新生成并更新 MCP 配置。");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, { signal: controller.signal, redirect: "error" });
    if (!response.ok) {
      // 不回显地址，也不回显响应体：两者都可能含凭据。
      return toolFailure(`时间大师接口返回 HTTP ${response.status}，请确认时间大师正在运行且接口开关已开启。`);
    }
    const payload = await response.json();
    const todos = Array.isArray(payload?.todos) ? payload.todos : [];
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ date: payload?.date ?? null, count: todos.length, todos })
      }]
    };
  } catch (error) {
    return toolFailure(error?.name === "AbortError"
      ? "读取时间大师超时，请确认它正在运行。"
      : "连接不上时间大师，请确认它正在运行。");
  } finally {
    clearTimeout(timer);
  }
}

async function handle(message) {
  const { id, method } = message;
  if (method === "initialize") {
    return reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "timemaster", version: "1.0.0" }
    });
  }
  if (method === "tools/list") return reply(id, { tools: [TOOL] });
  if (method === "tools/call") {
    if (message.params?.name !== TOOL.name) {
      return reply(id, toolFailure(`未知工具：${String(message.params?.name || "")}`));
    }
    return reply(id, await listTodayTodos());
  }
  // 通知没有 id，不需要回复。
  if (id === undefined || id === null) return;
  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const text = line.trim();
  if (!text) return;
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return;
  }
  void handle(message).catch(() => {
    if (message?.id !== undefined && message?.id !== null) {
      send({ jsonrpc: "2.0", id: message.id, error: { code: -32603, message: "Internal error" } });
    }
  });
});
