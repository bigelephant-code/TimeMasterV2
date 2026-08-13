"use strict";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TODO_COMPLETIONS = 2000;

const validYmd = (value) => YMD_RE.test(String(value || "")) ? String(value) : null;

function normalizeTodoCompletionRecord(record) {
  if (!record || typeof record !== "object") return null;
  const date = validYmd(record.date);
  if (!date) return null;
  return {
    date,
    status: "completed",
    completedAt: Math.max(0, Number(record.completedAt) || 0),
    title: String(record.title || "").slice(0, 200),
    listId: record.listId ? String(record.listId).slice(0, 100) : null
  };
}

function normalizeTodoCompletionHistory(todo) {
  if (!todo || typeof todo !== "object") return false;
  const source = Array.isArray(todo.completionHistory) ? todo.completionHistory : [];
  const seen = new Set();
  const normalized = [];
  for (const raw of source) {
    const record = normalizeTodoCompletionRecord(raw);
    if (!record || seen.has(record.date)) continue;
    seen.add(record.date);
    normalized.push(record);
  }
  normalized.sort((a, b) => a.date.localeCompare(b.date) || a.completedAt - b.completedAt);
  const kept = normalized.slice(-MAX_TODO_COMPLETIONS);
  const changed = JSON.stringify(todo.completionHistory) !== JSON.stringify(kept);
  todo.completionHistory = kept;
  return changed;
}

function recordTodoCompletion(todo, completedAt = Date.now()) {
  if (!todo || todo.done) return null;
  const date = validYmd(todo.date);
  if (!date) return null;
  normalizeTodoCompletionHistory(todo);
  const existing = todo.completionHistory.find((record) => record.date === date);
  if (existing) return existing;
  const record = {
    date,
    status: "completed",
    completedAt: Math.max(0, Number(completedAt) || Date.now()),
    title: String(todo.title || "").slice(0, 200),
    listId: todo.listId ? String(todo.listId).slice(0, 100) : null
  };
  todo.completionHistory.push(record);
  if (todo.completionHistory.length > MAX_TODO_COMPLETIONS) {
    todo.completionHistory = todo.completionHistory.slice(-MAX_TODO_COMPLETIONS);
  }
  return record;
}

module.exports = {
  MAX_TODO_COMPLETIONS,
  normalizeTodoCompletionHistory,
  recordTodoCompletion
};
