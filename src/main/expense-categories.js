"use strict";

const DEFAULT_EXPENSE_CATEGORIES = Object.freeze([
  { id: "freight", name: "运杂费", short: "运杂", color: "#4c8dff", group: "opex", order: 0, builtin: true, archivedAt: null },
  { id: "office", name: "办公费", short: "办公", color: "#3ecf8e", group: "opex", order: 1, builtin: true, archivedAt: null },
  { id: "tax", name: "税费", short: "税费", color: "#ffb020", group: "opex", order: 2, builtin: true, archivedAt: null },
  { id: "admin", name: "管理费", short: "管理", color: "#a78bfa", group: "opex", order: 3, builtin: true, archivedAt: null },
  { id: "travel", name: "差旅费", short: "差旅", color: "#22d3ee", group: "opex", order: 4, builtin: true, archivedAt: null },
  { id: "welfare", name: "福利费", short: "福利", color: "#f472b6", group: "opex", order: 5, builtin: true, archivedAt: null },
  { id: "goods", name: "货款", short: "货款", color: "#ff7a45", group: "cogs", order: 6, builtin: true, archivedAt: null }
]);

const DEFAULT_BY_ID = new Map(DEFAULT_EXPENSE_CATEGORIES.map((category) => [category.id, category]));
const CATEGORY_COLORS = ["#5c8ff1", "#43c59e", "#f4b942", "#9d7cf2", "#30b9ca", "#e875a8", "#ef8354", "#7aa2c9"];
const MAX_EXPENSE_CATEGORY_NAME = 12;
const MAX_ACTIVE_EXPENSE_CATEGORIES = 24;

const cloneCategory = (category) => ({ ...category });
const shortOf = (name) => Array.from(String(name || "")).slice(0, 2).join("");
const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
const categoryId = (value) => value === null || value === void 0 ? "" : String(value);

function normalizeExpenseCategoryName(value) {
  const normalized = String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
  return Array.from(normalized).slice(0, MAX_EXPENSE_CATEGORY_NAME).join("") || null;
}

function categoryNameKey(value) {
  return normalizeExpenseCategoryName(value)?.toLocaleLowerCase("zh-CN") || "";
}

function defaultExpenseCategories(catNames = null) {
  return DEFAULT_EXPENSE_CATEGORIES.map((category) => {
    const customName = normalizeExpenseCategoryName(catNames?.[category.id]);
    const name = customName || category.name;
    return { ...category, name, short: shortOf(name) };
  });
}

function normalizeStoredCategory(input, fallback, order) {
  // Category ids are foreign keys stored on every expense entry. Treat them as
  // opaque strings: trimming or truncating here would silently detach old rows.
  const id = categoryId(input?.id ?? fallback?.id);
  if (!id) return null;
  const base = fallback || {
    id,
    name: "未命名分类",
    short: "未命",
    color: CATEGORY_COLORS[order % CATEGORY_COLORS.length],
    group: "opex",
    order,
    builtin: false,
    archivedAt: null
  };
  const name = normalizeExpenseCategoryName(input?.name) || base.name;
  const group = ["opex", "cogs", "unclassified"].includes(input?.group) ? input.group : base.group;
  const archivedAt = Number.isFinite(Number(input?.archivedAt)) && Number(input.archivedAt) > 0 ? Number(input.archivedAt) : null;
  return {
    id,
    name,
    short: shortOf(name),
    color: validColor(input?.color, base.color),
    group,
    order: Number.isFinite(Number(input?.order)) ? Number(input.order) : order,
    builtin: Boolean(input?.builtin || fallback),
    archivedAt
  };
}

function migrateExpenseCategories(goal, entries = []) {
  if (!goal || goal.mode !== "ledger") return { categories: [], changed: false };
  const before = JSON.stringify(goal.expenseCategories ?? null);
  const existing = Array.isArray(goal.expenseCategories) ? goal.expenseCategories : defaultExpenseCategories(goal.catNames);
  const categories = [];
  const seen = new Set();

  existing.forEach((input, index) => {
    const fallback = DEFAULT_BY_ID.get(categoryId(input?.id));
    const category = normalizeStoredCategory(input, fallback, index);
    if (!category || seen.has(category.id)) return;
    seen.add(category.id);
    categories.push(category);
  });

  for (const fallback of DEFAULT_EXPENSE_CATEGORIES) {
    if (seen.has(fallback.id)) continue;
    const category = cloneCategory(fallback);
    category.order = categories.length;
    categories.push(category);
    seen.add(category.id);
  }

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry?.goalId !== goal.id) continue;
    const id = categoryId(entry?.cat);
    if (!id || seen.has(id)) continue;
    const suffix = Array.from(id).slice(0, 6).join("");
    const name = normalizeExpenseCategoryName(`遗留分类 ${suffix}`) || "遗留分类";
    categories.push({
      id,
      name,
      short: "遗留",
      color: "#7f8b9a",
      group: "unclassified",
      order: categories.length,
      builtin: false,
      archivedAt: 1
    });
    seen.add(id);
  }

  categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));
  categories.forEach((category, index) => {
    category.order = index;
  });
  goal.expenseCategories = categories;
  return { categories, changed: before !== JSON.stringify(categories) };
}

function categoriesOf(goal) {
  if (!goal || goal.mode !== "ledger") return [];
  const source = Array.isArray(goal.expenseCategories) ? goal.expenseCategories : defaultExpenseCategories(goal.catNames);
  return source.map((input, index) => normalizeStoredCategory(input, DEFAULT_BY_ID.get(categoryId(input?.id)), index)).filter(Boolean).sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN")
  );
}

const activeCategoriesOf = (goal) => categoriesOf(goal).filter((category) => !category.archivedAt);
const categoryOf = (goal, id) => {
  const wanted = categoryId(id);
  return categoriesOf(goal).find((category) => category.id === wanted) || null;
};

function duplicateName(goal, name, exceptId = null) {
  const key = categoryNameKey(name);
  return categoriesOf(goal).find((category) => category.id !== exceptId && categoryNameKey(category.name) === key) || null;
}

function addExpenseCategory(goal, input = {}, { idFactory, now = Date.now } = {}) {
  if (!goal || goal.mode !== "ledger") return { ok: false, reason: "找不到要管理的费用台账。" };
  const name = normalizeExpenseCategoryName(input.name);
  if (!name) return { ok: false, reason: "请输入类别名称。" };
  if (duplicateName(goal, name)) return { ok: false, reason: "已经有同名类别；如已停用，请直接恢复。" };
  const active = activeCategoriesOf(goal);
  if (active.length >= MAX_ACTIVE_EXPENSE_CATEGORIES) return { ok: false, reason: `每本台账最多保留 ${MAX_ACTIVE_EXPENSE_CATEGORIES} 个使用中的类别。` };
  const factory = typeof idFactory === "function" ? idFactory : () => `${now()}-${Math.random().toString(16).slice(2)}`;
  const id = `expense-${String(factory()).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80)}`;
  const all = categoriesOf(goal);
  const category = {
    id,
    name,
    short: shortOf(name),
    color: validColor(input.color, CATEGORY_COLORS[all.length % CATEGORY_COLORS.length]),
    group: "opex",
    order: all.length,
    builtin: false,
    archivedAt: null
  };
  goal.expenseCategories = [...all, category];
  return { ok: true, category };
}

function renameExpenseCategory(goal, categoryId, value) {
  const categories = categoriesOf(goal);
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return { ok: false, reason: "找不到这个类别。" };
  const fallback = DEFAULT_BY_ID.get(category.id);
  const name = normalizeExpenseCategoryName(value) || fallback?.name || null;
  if (!name) return { ok: false, reason: "类别名称不能为空。" };
  if (duplicateName(goal, name, category.id)) return { ok: false, reason: "类别名称不能重复。" };
  category.name = name;
  category.short = shortOf(name);
  goal.expenseCategories = categories;
  return { ok: true, category };
}

function archiveExpenseCategory(goal, categoryId, { now = Date.now } = {}) {
  const categories = categoriesOf(goal);
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return { ok: false, reason: "找不到这个类别。" };
  if (category.archivedAt) return { ok: true, category };
  if (category.group === "cogs") return { ok: false, reason: "货款单列是台账的固定口径，只能改名，不能停用。" };
  if (category.group === "unclassified") return { ok: false, reason: "遗留分类用于保留旧账对应关系，不能再次停用。" };
  const activeOpex = categories.filter((item) => item.group === "opex" && !item.archivedAt);
  if (activeOpex.length <= 1) return { ok: false, reason: "至少需要保留一个可用的期间费用类别。" };
  category.archivedAt = Number(now()) || Date.now();
  goal.expenseCategories = categories;
  return { ok: true, category };
}

function restoreExpenseCategory(goal, categoryId) {
  const categories = categoriesOf(goal);
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return { ok: false, reason: "找不到这个类别。" };
  if (!category.archivedAt) return { ok: true, category };
  if (category.group === "unclassified") return { ok: false, reason: "遗留分类只能用于查看和导出旧账。" };
  if (duplicateName(goal, category.name, category.id)) return { ok: false, reason: "已有同名类别，请先修改名称。" };
  if (activeCategoriesOf(goal).length >= MAX_ACTIVE_EXPENSE_CATEGORIES) {
    return { ok: false, reason: `每本台账最多保留 ${MAX_ACTIVE_EXPENSE_CATEGORIES} 个使用中的类别。` };
  }
  category.archivedAt = null;
  goal.expenseCategories = categories;
  return { ok: true, category };
}

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

function summarizeExpenseEntries(goal, entries = []) {
  const categories = categoriesOf(goal);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const byCat = Object.create(null);
  for (const category of categories) byCat[category.id] = { count: 0, amount: 0 };
  const out = { count: 0, opex: 0, cogs: 0, unclassified: 0, total: 0, byCat, unknownIds: [] };
  const unknown = new Set();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const amount = Number(entry?.amount) || 0;
    const entryCategoryId = categoryId(entry?.cat);
    const category = byId.get(entryCategoryId);
    out.count += 1;
    if (!category) {
      out.unclassified += amount;
      unknown.add(entryCategoryId);
      continue;
    }
    byCat[category.id].count += 1;
    byCat[category.id].amount += amount;
    if (category.group === "cogs") out.cogs += amount;
    else if (category.group === "opex") out.opex += amount;
    else out.unclassified += amount;
  }
  out.opex = round2(out.opex);
  out.cogs = round2(out.cogs);
  out.unclassified = round2(out.unclassified);
  out.total = round2(out.opex + out.cogs + out.unclassified);
  for (const value of Object.values(byCat)) value.amount = round2(value.amount);
  out.unknownIds = [...unknown].filter(Boolean);
  return out;
}

module.exports = {
  DEFAULT_EXPENSE_CATEGORIES,
  MAX_EXPENSE_CATEGORY_NAME,
  MAX_ACTIVE_EXPENSE_CATEGORIES,
  normalizeExpenseCategoryName,
  defaultExpenseCategories,
  migrateExpenseCategories,
  categoriesOf,
  activeCategoriesOf,
  categoryOf,
  addExpenseCategory,
  renameExpenseCategory,
  archiveExpenseCategory,
  restoreExpenseCategory,
  summarizeExpenseEntries,
  shortOf
};
