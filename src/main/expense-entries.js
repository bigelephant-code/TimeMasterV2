const MAX_EXPENSE_NOTE_LENGTH = 60;

function roundExpenseAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return { ok: false, reason: "请输入有效金额。" };
  }
  const amount = Math.round(numeric * 100) / 100;
  if (!Number.isFinite(amount)) {
    return { ok: false, reason: "金额过大，请输入较小的数值。" };
  }
  if (amount === 0) {
    return { ok: false, reason: "金额不能为 0。" };
  }
  return { ok: true, amount };
}

function normalizeExpenseNote(value) {
  return [...String(value ?? "")].slice(0, MAX_EXPENSE_NOTE_LENGTH).join("");
}

function expenseEntryVersion(entry) {
  const updatedAt = Number(entry?.updatedAt);
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt;
  const createdAt = Number(entry?.at);
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0;
}

/**
 * Update the two fields exposed by the single-entry editor. Identity, ledger,
 * category, accounting date and original registration time are immutable here.
 */
function updateExpenseEntry(entries, id, patch = {}, now = Date.now()) {
  const entry = Array.isArray(entries) ? entries.find((item) => item?.id === id) : null;
  if (!entry) return { ok: false, reason: "这笔费用已不存在，请刷新后重试。" };

  if (patch.expectedUpdatedAt !== void 0) {
    const expected = Number(patch.expectedUpdatedAt);
    if (!Number.isFinite(expected) || expected !== expenseEntryVersion(entry)) {
      return { ok: false, reason: "这笔费用已在其他窗口中修改，请重新打开后再编辑。" };
    }
  }

  let amount = entry.amount;
  if (patch.amount !== void 0) {
    const normalized = roundExpenseAmount(patch.amount);
    if (!normalized.ok) return normalized;
    amount = normalized.amount;
  }
  const note = patch.note === void 0 ? String(entry.note || "") : normalizeExpenseNote(patch.note);
  const changed = amount !== entry.amount || note !== String(entry.note || "");
  if (!changed) return { ok: true, changed: false, entry };

  entry.amount = amount;
  entry.note = note;
  entry.updatedAt = Math.max(Number(now) || 0, expenseEntryVersion(entry) + 1);
  return { ok: true, changed: true, entry };
}

module.exports = {
  MAX_EXPENSE_NOTE_LENGTH,
  roundExpenseAmount,
  normalizeExpenseNote,
  expenseEntryVersion,
  updateExpenseEntry
};
