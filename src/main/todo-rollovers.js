"use strict";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TODO_ROLLOVERS = 2000;

const validYmd = (value) => YMD_RE.test(String(value || "")) ? String(value) : null;

function normalizeTodoRolloverRecord(record) {
  if (!record || typeof record !== "object") return null;
  const fromDate = validYmd(record.fromDate);
  const rolledTo = validYmd(record.rolledTo);
  if (!fromDate || !rolledTo || fromDate >= rolledTo) return null;
  return {
    fromDate,
    rolledTo,
    status: "incomplete",
    recordedAt: Math.max(0, Number(record.recordedAt) || 0),
    title: String(record.title || "").slice(0, 200),
    listId: record.listId ? String(record.listId).slice(0, 100) : null
  };
}

function normalizeTodoRolloverHistory(todo) {
  if (!todo || typeof todo !== "object") return false;
  const source = Array.isArray(todo.rolloverHistory) ? todo.rolloverHistory : [];
  const seen = new Set();
  const normalized = [];
  for (const raw of source) {
    const record = normalizeTodoRolloverRecord(raw);
    if (!record) continue;
    const key = `${record.fromDate}>${record.rolledTo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(record);
  }
  normalized.sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.recordedAt - b.recordedAt);
  const kept = normalized.slice(-MAX_TODO_ROLLOVERS);
  const changed = JSON.stringify(todo.rolloverHistory) !== JSON.stringify(kept);
  todo.rolloverHistory = kept;
  return changed;
}

function recordTodoRollover(todo, rolledTo, recordedAt = Date.now()) {
  if (!todo || todo.done) return null;
  const fromDate = validYmd(todo.date);
  const targetDate = validYmd(rolledTo);
  if (!fromDate || !targetDate || fromDate >= targetDate) return null;
  normalizeTodoRolloverHistory(todo);
  const existing = todo.rolloverHistory.find(
    (record) => record.fromDate === fromDate && record.rolledTo === targetDate
  );
  if (existing) return existing;
  const record = {
    fromDate,
    rolledTo: targetDate,
    status: "incomplete",
    recordedAt: Math.max(0, Number(recordedAt) || Date.now()),
    title: String(todo.title || "").slice(0, 200),
    listId: todo.listId ? String(todo.listId).slice(0, 100) : null
  };
  todo.rolloverHistory.push(record);
  if (todo.rolloverHistory.length > MAX_TODO_ROLLOVERS) {
    todo.rolloverHistory = todo.rolloverHistory.slice(-MAX_TODO_ROLLOVERS);
  }
  return record;
}

module.exports = {
  MAX_TODO_ROLLOVERS,
  normalizeTodoRolloverHistory,
  recordTodoRollover
};
