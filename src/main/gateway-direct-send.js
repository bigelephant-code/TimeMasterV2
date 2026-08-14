"use strict";

// 直投桥：绕开 /hooks/agent 与 LLM 复述，直接通过 OpenClaw Gateway 的 WebSocket
// `send` 方法投递提醒原文。返回结构与 remote-reminders.js 的 deliverOpenClawReminder
// 保持一致，因此 outbox、分类与退避重试逻辑无需改动。
//
// 代价：`send` 需要 operator.write，即 Gateway 的 operator 凭据，权限高于 Hook Token。
// 收益：提醒文本按字节原样送达，且投递结果来自通道本身，不再是「Agent 已受理」。

const GATEWAY_DIRECT_TIMEOUT_MS = 20 * 1000;
const GATEWAY_PROTOCOL_VERSION = 4;
const MAX_MESSAGE_LENGTH = 4096;
const EVENT_ID_RE = /^[A-Za-z0-9._:-]{1,200}$/;
const ALLOWED_LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

const CONNECTION_RETRY_CODES = new Set([
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENETDOWN",
  "EAI_AGAIN",
  "ENOTFOUND"
]);

function boundedText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

// 复用提醒侧的 loopback 约束，再转成 WebSocket origin；不接受远端地址。
function normalizeGatewayWsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "http:" && url.protocol !== "ws:") return null;
    if (!ALLOWED_LOOPBACK_HOSTS.has(host)) return null;
    if (url.username || url.password) return null;
    if (!url.port) return null;
    return `ws://${url.host}`;
  } catch {
    return null;
  }
}

function errorCodeOf(error) {
  const visited = new Set();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const code = boundedText(current.code, 80).toUpperCase();
    if (code) return code;
    current = current.cause;
  }
  return "";
}

function classifyGatewayError(error) {
  const code = boundedText(error?.code, 80).toUpperCase();
  if (error?.retryable === true) return { classification: "retry", reason: "gateway_retryable" };
  if (["UNAUTHORIZED", "FORBIDDEN", "INVALID_REQUEST"].includes(code)) {
    return { classification: "blocked", reason: `gateway_${code.toLowerCase()}` };
  }
  return { classification: "blocked", reason: "gateway_rejected" };
}

function buildConnectParams(token, clientVersion) {
  return {
    minProtocol: GATEWAY_PROTOCOL_VERSION,
    maxProtocol: GATEWAY_PROTOCOL_VERSION,
    // 外部应用固定使用 gateway-client / backend；其它取值会被 Gateway 的枚举校验拒绝。
    client: { id: "gateway-client", version: clientVersion, platform: "win32", mode: "backend" },
    role: "operator",
    scopes: ["operator.write"],
    caps: [],
    commands: [],
    permissions: {},
    auth: { token },
    locale: "zh-CN",
    userAgent: `timemaster/${clientVersion}`
  };
}

function buildDirectSendParams(request) {
  const target = boundedText(request?.target, 500);
  const message = boundedText(request?.message, MAX_MESSAGE_LENGTH);
  const accountId = boundedText(request?.accountId, 200);
  const params = {
    channel: "qqbot",
    to: target,
    message,
    idempotencyKey: request.eventId
  };
  if (accountId) params.accountId = accountId;
  return params;
}

// 只做握手并确认 send 可用，不发送任何消息。连接检查必须走投递真正会用的
// 那条路径：直投用的是 Gateway operator 凭据，拿它去敲 /hooks/agent 只会得到
// 401，让填对了的用户以为自己填错。
async function probeDirectGateway(request, dependencies = {}) {
  const url = normalizeGatewayWsUrl(request?.endpoint);
  const token = boundedText(request?.token, 4096);
  if (!url) return { ok: false, reason: "invalid_endpoint" };
  if (!token) return { ok: false, reason: "missing_token" };

  const WebSocketImpl = dependencies.WebSocket || globalThis.WebSocket;
  if (typeof WebSocketImpl !== "function") return { ok: false, reason: "websocket_unavailable" };
  const clock = dependencies.clock || globalThis;
  const clientVersion = boundedText(dependencies.clientVersion || "0.0.0", 32);

  return new Promise((resolve) => {
    let socket = null;
    let settled = false;
    let timer = null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clock.clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        // 结论已确定，关闭失败不影响。
      }
      resolve(result);
    };
    timer = clock.setTimeout(() => finish({ ok: false, reason: "timeout" }), GATEWAY_DIRECT_TIMEOUT_MS);

    try {
      socket = new WebSocketImpl(url);
    } catch {
      return finish({ ok: false, reason: "connection_unavailable" });
    }
    socket.addEventListener("error", () => finish({ ok: false, reason: "connection_unavailable" }));
    socket.addEventListener("close", () => finish({ ok: false, reason: "connection_unavailable" }));
    socket.addEventListener("message", (event) => {
      let frame;
      try {
        frame = JSON.parse(typeof event?.data === "string" ? event.data : String(event?.data ?? ""));
      } catch {
        return;
      }
      if (frame?.type === "event" && frame.event === "connect.challenge") {
        socket.send(JSON.stringify({ type: "req", id: "connect", method: "connect", params: buildConnectParams(token, clientVersion) }));
        return;
      }
      if (frame?.type === "res" && frame.id === "connect") {
        if (!frame.ok) return finish({ ok: false, reason: "gateway_auth_failed" });
        const methods = frame.payload?.features?.methods;
        if (Array.isArray(methods) && !methods.includes("send")) return finish({ ok: false, reason: "send_unsupported" });
        return finish({ ok: true, scopes: frame.payload?.auth?.scopes || [] });
      }
    });
  });
}

async function deliverDirectReminder(request, dependencies = {}) {
  const source = request && typeof request === "object" ? request : {};
  const url = normalizeGatewayWsUrl(source.endpoint);
  const token = boundedText(source.token, 4096);
  const target = boundedText(source.target, 500);
  const message = boundedText(source.message, MAX_MESSAGE_LENGTH);
  const eventId = EVENT_ID_RE.test(String(source.eventId || "")) ? String(source.eventId) : null;

  if (!url) return { classification: "blocked", status: null, reason: "invalid_endpoint" };
  if (!token) return { classification: "blocked", status: null, reason: "missing_token" };
  if (!eventId) return { classification: "blocked", status: null, reason: "invalid_event_id" };
  if (!target) return { classification: "blocked", status: null, reason: "invalid_target" };
  if (!message) return { classification: "blocked", status: null, reason: "empty_message" };

  const WebSocketImpl = dependencies.WebSocket || globalThis.WebSocket;
  if (typeof WebSocketImpl !== "function") {
    return { classification: "blocked", status: null, reason: "websocket_unavailable" };
  }
  const clock = dependencies.clock || globalThis;
  const clientVersion = boundedText(dependencies.clientVersion || "0.0.0", 32);

  return new Promise((resolve) => {
    let socket = null;
    let settled = false;
    let timer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clock.clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        // 关闭失败不影响已经确定的投递结论。
      }
      resolve(result);
    };

    timer = clock.setTimeout(
      () => finish({ classification: "uncertain", status: null, reason: "request_aborted" }),
      GATEWAY_DIRECT_TIMEOUT_MS
    );

    try {
      socket = new WebSocketImpl(url);
    } catch (error) {
      const code = errorCodeOf(error);
      return finish(CONNECTION_RETRY_CODES.has(code)
        ? { classification: "retry", status: null, reason: "connection_unavailable", errorCode: code }
        : { classification: "blocked", status: null, reason: "connect_failed" });
    }

    socket.addEventListener("error", (event) => {
      const code = errorCodeOf(event?.error || event);
      finish(CONNECTION_RETRY_CODES.has(code)
        ? { classification: "retry", status: null, reason: "connection_unavailable", errorCode: code }
        : { classification: "retry", status: null, reason: "connection_unavailable" });
    });

    socket.addEventListener("close", () => {
      // 结论未定就断开时按不确定处理：消息可能已经发出，不能盲目重发。
      finish({ classification: "uncertain", status: null, reason: "connection_closed" });
    });

    socket.addEventListener("message", (event) => {
      let frame;
      try {
        frame = JSON.parse(typeof event?.data === "string" ? event.data : String(event?.data ?? ""));
      } catch {
        return;
      }

      if (frame?.type === "event" && frame.event === "connect.challenge") {
        socket.send(JSON.stringify({
          type: "req",
          id: "connect",
          method: "connect",
          params: buildConnectParams(token, clientVersion)
        }));
        return;
      }

      if (frame?.type === "res" && frame.id === "connect") {
        if (!frame.ok) return finish({ classification: "blocked", status: null, reason: "gateway_auth_failed" });
        const methods = frame.payload?.features?.methods;
        if (Array.isArray(methods) && !methods.includes("send")) {
          return finish({ classification: "blocked", status: null, reason: "send_unsupported" });
        }
        socket.send(JSON.stringify({
          type: "req",
          id: eventId,
          method: "send",
          params: buildDirectSendParams({ target, message, accountId: source.accountId, eventId })
        }));
        return;
      }

      if (frame?.type === "res" && frame.id === eventId) {
        if (frame.ok) {
          const messageId = boundedText(
            frame.payload?.result?.id ?? frame.payload?.messageId ?? frame.payload?.id,
            200
          );
          return finish({
            classification: "accepted",
            status: 200,
            ...messageId ? { runId: messageId } : { reason: "delivered_without_id" }
          });
        }
        const mapped = classifyGatewayError(frame.error);
        return finish({ classification: mapped.classification, status: null, reason: mapped.reason });
      }
    });
  });
}

module.exports = {
  GATEWAY_DIRECT_TIMEOUT_MS,
  GATEWAY_PROTOCOL_VERSION,
  MAX_MESSAGE_LENGTH,
  normalizeGatewayWsUrl,
  buildConnectParams,
  buildDirectSendParams,
  classifyGatewayError,
  probeDirectGateway,
  deliverDirectReminder
};
