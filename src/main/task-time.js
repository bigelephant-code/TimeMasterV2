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

module.exports = { normalizeTaskTime, taskStartTime, taskEndTime };
