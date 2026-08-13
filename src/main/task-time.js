"use strict";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeTaskTime(value) {
  const text = String(value || "").trim();
  return TIME_RE.test(text) ? text : null;
}

function taskStartTime(todo) {
  return normalizeTaskTime(todo?.startTime);
}

function taskEndTime(todo) {
  const value = todo?.endTime !== void 0 ? todo.endTime : todo?.time;
  return normalizeTaskTime(value);
}

function taskEndsNextDay(todo) {
  const startTime = taskStartTime(todo);
  const endTime = taskEndTime(todo);
  return Boolean(startTime && endTime && endTime < startTime);
}

function taskRolloverEligible(todo, now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime()) || !taskEndsNextDay(todo)) return true;
  const sourceDate = String(todo?.date || "");
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sourceDate);
  const endTime = taskEndTime(todo);
  if (!parts || !endTime) return true;
  const [hours, minutes] = endTime.split(":").map(Number);
  const endAt = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + 1, hours, minutes, 0, 0);
  return date.getTime() >= endAt.getTime();
}

module.exports = { normalizeTaskTime, taskStartTime, taskEndTime, taskEndsNextDay, taskRolloverEligible };
