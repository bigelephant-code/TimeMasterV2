import { o as openBlock, c as createElementBlock, a as createBaseVNode, b as createVNode, _ as _sfc_main$b, u as unref, s as state, r as ref, d as actions, n as normalizeClass, t as toDisplayString, F as Fragment, e as renderList, f as normalizeStyle, g as countOpen, w as withDirectives, v as vModelText, h as withKeys, i as createCommentVNode, j as withModifiers, k as createBlock, l as relativeLabel, m as createTextVNode, p as listById, P as PRIORITIES, q as todayYmd, x as computed, y as taskTimeLabel, z as todoState, A as now, B as stopwatchLabel, C as elapsedMsOf, D as durationLabel, E as remainingLabel, G as deadlineState, H as timerDeadlineState, I as _export_sfc, J as watch, K as isoWeekNumber, L as isSameMonth, M as lunarInfo, N as todosOn, O as formatGoalNumber, Q as nextTick, R as addMonths, S as addDays, T as parseYmd, U as weekdayLabels, V as OPEX_CATS, W as weekGrid, X as monthGrid, Y as taskSortTime, Z as summarize, $ as expensesOn, a0 as cogsLabel, a1 as ledgerGoals, a2 as catsOf, a3 as visibleTodos, a4 as QUADRANTS, a5 as normalizeYmd, a6 as onMounted, a7 as onUnmounted, a8 as expenseCat, a9 as EXPENSE_CATS, aa as MAX_CAT_NAME, ab as periodShortLabel, ac as periodBounds, ad as expensesOfGoal, ae as ymdOf, af as periodKeyOfYmd, ag as compareWithPrev, ah as opexRanking, ai as periodSeries, aj as groupByDate, ak as groupByPeriod, al as stepPeriod, am as vModelSelect, an as REPEATS, ao as REMIND_OPTIONS, ap as taskDurationMinutes, aq as createStaticVNode, ar as resolveDynamicComponent, as as initStore, at as createApp } from "./styles-4HYtOQXD.js";

/* AI 任务教练只保存结构化草案；任何链接都交给主进程校验后打开。 */
const aiCoachUi = ref({
  open: false,
  mode: "task",
  todoId: null,
  date: todayYmd(),
  plan: null,
  busy: "",
  error: "",
  notice: ""
});
const aiCoachConfig = () => state.aiCoachConfig?.config || state.aiCoachConfig || {};
// 同样以 state.settings.aiTaskCoach 为准。state.aiCoachConfig 只在 initStore 里
// 赋值一次，被 isMainRenderer 门控且错误被 catch 吞成 null，之后再不刷新；
// 用它判断「AI 是否可用」会让按钮消失、自动拆解静默失效且没有任何报错。
const aiCoachEnabled = () => {
  const fromSettings = state.settings?.aiTaskCoach;
  if (fromSettings && typeof fromSettings.enabled === "boolean") return fromSettings.enabled === true;
  return Boolean(aiCoachConfig().enabled);
};
const coachArray = (value) => Array.isArray(value) ? value : [];
function coachTaskPlan(todoId) {
  const plans = state.aiTaskCoach?.taskPlans;
  if (Array.isArray(plans)) return plans.find((plan) => plan?.todoId === todoId) || null;
  return plans?.[todoId] || Object.values(plans || {}).find((plan) => plan?.todoId === todoId) || null;
}
function coachDayPlan(date) {
  const plans = coachArray(state.aiTaskCoach?.dayPlans);
  return [...plans].reverse().find((plan) => plan?.date === date) || null;
}
function coachErrorMessage(error, fallback = "AI 任务教练暂时不可用，待办没有被改动。") {
  const raw = String(error?.message || error?.reason || error || fallback);
  const clean = raw.replace(/^Error invoking remote method '[^']+':\s*/i, "").replace(/^Error:\s*/i, "").trim();
  return clean || fallback;
}
function closeAICoach() {
  if (aiCoachUi.value.busy) return;
  aiCoachUi.value.open = false;
  aiCoachUi.value.error = "";
  aiCoachUi.value.notice = "";
}
async function runTaskCoach(todoId) {
  aiCoachUi.value.busy = "task";
  aiCoachUi.value.error = "";
  aiCoachUi.value.notice = "";
  try {
    const result = await actions.planAITask(todoId);
    if (!result?.ok || !result?.plan) throw new Error(result?.message || result?.reason || "AI 返回的任务计划不完整");
    aiCoachUi.value.plan = result.plan;
    aiCoachUi.value.notice = "拆解已生成，原待办尚未被改动。";
  } catch (error) {
    aiCoachUi.value.error = coachErrorMessage(error);
  } finally {
    aiCoachUi.value.busy = "";
  }
}
async function openTaskCoach(todoOrId, generate = true) {
  const todoId = typeof todoOrId === "string" ? todoOrId : todoOrId?.id;
  if (!todoId) return;
  aiCoachUi.value = {
    open: true,
    mode: "task",
    todoId,
    date: state.todos.find((todo) => todo.id === todoId)?.date || todayYmd(),
    plan: coachTaskPlan(todoId),
    busy: "",
    error: aiCoachEnabled() ? "" : "请先在设置中启用并连接 AI 任务教练。",
    notice: ""
  };
  if (generate && aiCoachEnabled()) await runTaskCoach(todoId);
}
async function runDayCoach(date) {
  aiCoachUi.value.busy = "day";
  aiCoachUi.value.error = "";
  aiCoachUi.value.notice = "";
  try {
    const result = await actions.planAIDay(date);
    if (!result?.ok || !result?.plan) throw new Error(result?.message || result?.reason || "AI 返回的今日排程不完整");
    aiCoachUi.value.plan = result.plan;
    aiCoachUi.value.notice = "今日排程是草案，确认应用前不会修改时间。";
  } catch (error) {
    aiCoachUi.value.error = coachErrorMessage(error);
  } finally {
    aiCoachUi.value.busy = "";
  }
}
async function openDayCoach(date = todayYmd(), generate = true) {
  aiCoachUi.value = {
    open: true,
    mode: "day",
    todoId: null,
    date,
    plan: coachDayPlan(date),
    busy: "",
    error: aiCoachEnabled() ? "" : "请先在设置中启用并连接 AI 任务教练。",
    notice: ""
  };
  if (generate && aiCoachEnabled()) await runDayCoach(date);
}
const _hoisted_1$a = { class: "titlebar" };
const _hoisted_2$a = { class: "brand" };
const _hoisted_3$8 = { class: "tools" };
const _hoisted_4$8 = ["disabled"];
const _hoisted_5$8 = {
  class: "tools",
  style: { "margin-left": "6px" }
};
const _hoisted_6$8 = ["disabled"];
const _hoisted_7$8 = ["disabled"];
const _sfc_main$a = {
  __name: "TitleBar",
  setup(__props) {
    const api = window.api;
    const toggleTheme = () => actions.patchSettings({ theme: state.settings?.theme === "light" ? "dark" : "light" });
    const switchingWindow = ref(false);
    const runWindowTransition = async (action) => {
      if (switchingWindow.value) return;
      switchingWindow.value = true;
      try {
        await action();
      } finally {
        switchingWindow.value = false;
      }
    };
    const returnToWidget = () => runWindowTransition(api.win.close);
    const minimizeToWidget = () => runWindowTransition(api.win.minimize);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$a, [
        createBaseVNode("div", _hoisted_2$a, [
          createVNode(_sfc_main$b, {
            name: "calendar",
            size: 15
          }),
          _cache[2] || (_cache[2] = createBaseVNode("span", null, "时间大师", -1))
        ]),
        _cache[3] || (_cache[3] = createBaseVNode("div", { class: "spacer" }, null, -1)),
        createBaseVNode("div", _hoisted_3$8, [
          createBaseVNode("button", {
            class: "tbtn",
            title: "返回桌面组件",
            style: { "color": "var(--accent)" },
            disabled: switchingWindow.value,
            onClick: returnToWidget
          }, [
            createVNode(_sfc_main$b, { name: "widget" })
          ], 8, _hoisted_4$8),
          createBaseVNode("button", {
            class: "tbtn",
            title: "切换主题",
            onClick: toggleTheme
          }, [
            createVNode(_sfc_main$b, {
              name: unref(state).settings?.theme === "light" ? "moon" : "sun"
            }, null, 8, ["name"])
          ]),
          createBaseVNode("button", {
            class: "tbtn",
            title: "设置",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(state).settingsOpen = true)
          }, [
            createVNode(_sfc_main$b, { name: "settings" })
          ])
        ]),
        createBaseVNode("div", _hoisted_5$8, [
          createBaseVNode("button", {
            class: "wbtn",
            title: "最小化",
            disabled: switchingWindow.value,
            onClick: minimizeToWidget
          }, [
            createVNode(_sfc_main$b, {
              name: "min",
              size: 14
            })
          ], 8, _hoisted_6$8),
          createBaseVNode("button", {
            class: "wbtn",
            title: "最大化",
            onClick: _cache[1] || (_cache[1] = ($event) => unref(api).win.toggleMaximize())
          }, [
            createVNode(_sfc_main$b, {
              name: "max",
              size: 12
            })
          ]),
          createBaseVNode("button", {
            class: "wbtn close",
            title: "关闭",
            disabled: switchingWindow.value,
            onClick: returnToWidget
          }, [
            createVNode(_sfc_main$b, {
              name: "x",
              size: 14
            })
          ], 8, _hoisted_7$8)
        ])
      ]);
    };
  }
};
const _hoisted_1$9 = { class: "sidebar" };
const _hoisted_2$9 = { class: "count" };
const _hoisted_3$7 = { class: "nav-section" };
const _hoisted_4$7 = { class: "list-scroll" };
const _hoisted_5$7 = ["onClick"];
const _hoisted_6$7 = { style: { "overflow": "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" } };
const _hoisted_7$7 = { class: "count" };
const _hoisted_8$7 = {
  key: 0,
  style: { "padding": "4px 6px" }
};
const _sfc_main$9 = {
  __name: "SideBar",
  setup(__props) {
    const adding = ref(false);
    const newName = ref("");
    const inputEl = ref(null);
    async function startAdd() {
      adding.value = true;
      newName.value = "";
      await Promise.resolve();
      inputEl.value?.focus();
    }
    async function commitAdd() {
      const name = newName.value.trim();
      adding.value = false;
      if (!name) return;
      const list = await actions.createList(name);
      if (list) {
        state.activeListId = list.id;
        state.view = "todo";
      }
    }
    function pickList(id) {
      state.activeListId = id;
      state.view = "todo";
    }
    const openTotal = () => state.todos.filter((t) => !t.done).length;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("aside", _hoisted_1$9, [
        createBaseVNode("button", {
          class: normalizeClass(["nav-item", { active: unref(state).view === "calendar" }]),
          onClick: _cache[0] || (_cache[0] = ($event) => unref(state).view = "calendar")
        }, [
          createVNode(_sfc_main$b, {
            name: "calendar",
            size: 15
          }),
          _cache[6] || (_cache[6] = createBaseVNode("span", null, "日历", -1))
        ], 2),
        createBaseVNode("button", {
          class: normalizeClass(["nav-item", { active: unref(state).view === "todo" && !unref(state).activeListId }]),
          onClick: _cache[1] || (_cache[1] = () => {
            unref(state).view = "todo";
            unref(state).activeListId = null;
          })
        }, [
          createVNode(_sfc_main$b, {
            name: "list",
            size: 15
          }),
          _cache[7] || (_cache[7] = createBaseVNode("span", null, "全部待办", -1)),
          createBaseVNode("span", _hoisted_2$9, toDisplayString(openTotal() || ""), 1)
        ], 2),
        createBaseVNode("button", {
          class: normalizeClass(["nav-item", { active: unref(state).view === "matrix" }]),
          onClick: _cache[2] || (_cache[2] = ($event) => unref(state).view = "matrix")
        }, [
          createVNode(_sfc_main$b, {
            name: "matrix",
            size: 15
          }),
          _cache[8] || (_cache[8] = createBaseVNode("span", null, "四象限", -1))
        ], 2),
        createBaseVNode("button", {
          class: normalizeClass(["nav-item", { active: unref(state).view === "expense" }]),
          onClick: _cache[3] || (_cache[3] = ($event) => unref(state).view = "expense")
        }, [
          createVNode(_sfc_main$b, {
            name: "wallet",
            size: 15
          }),
          _cache[9] || (_cache[9] = createBaseVNode("span", null, "费用", -1))
        ], 2),
        createBaseVNode("div", _hoisted_3$7, [
          _cache[10] || (_cache[10] = createBaseVNode("span", null, "清单", -1)),
          createBaseVNode("button", {
            class: "add",
            title: "新建清单",
            onClick: startAdd
          }, [
            createVNode(_sfc_main$b, {
              name: "plus",
              size: 13
            })
          ])
        ]),
        createBaseVNode("div", _hoisted_4$7, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(state).lists, (list) => {
            return openBlock(), createElementBlock("button", {
              key: list.id,
              class: normalizeClass(["nav-item", { active: unref(state).view === "todo" && unref(state).activeListId === list.id }]),
              onClick: ($event) => pickList(list.id)
            }, [
              createBaseVNode("span", {
                class: "dot",
                style: normalizeStyle({ background: list.color })
              }, null, 4),
              createBaseVNode("span", _hoisted_6$7, toDisplayString(list.name), 1),
              createBaseVNode("span", _hoisted_7$7, toDisplayString(unref(countOpen)(list.id) || ""), 1)
            ], 10, _hoisted_5$7);
          }), 128)),
          adding.value ? (openBlock(), createElementBlock("div", _hoisted_8$7, [
            withDirectives(createBaseVNode("input", {
              ref_key: "inputEl",
              ref: inputEl,
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => newName.value = $event),
              placeholder: "清单名称",
              style: { "width": "100%" },
              onKeyup: [
                withKeys(commitAdd, ["enter"]),
                _cache[5] || (_cache[5] = withKeys(($event) => adding.value = false, ["esc"]))
              ],
              onBlur: commitAdd
            }, null, 544), [
              [vModelText, newName.value]
            ])
          ])) : createCommentVNode("", true)
        ])
      ]);
    };
  }
};
const _hoisted_1$8 = ["draggable"];
const _hoisted_2$8 = ["title"];
const _hoisted_3$6 = ["title"];
const _hoisted_4$6 = { class: "body" };
const _hoisted_5$6 = { class: "title" };
const _hoisted_6$6 = { class: "tags" };
const _hoisted_7$6 = {
  key: 1,
  style: { "display": "inline-flex", "align-items": "center", "gap": "3px" }
};
const _hoisted_8$6 = {
  key: 2,
  class: "tag-run"
};
const _hoisted_9$5 = {
  key: 3,
  class: "tag-spent"
};
const _hoisted_10$5 = {
  key: 4,
  class: "tag-paused"
};
const _hoisted_11$5 = {
  key: 6,
  style: { "display": "inline-flex", "align-items": "center" }
};
const _hoisted_12$5 = {
  key: 7,
  style: { "display": "inline-flex", "align-items": "center" }
};
const _hoisted_13$5 = { key: 8 };
const _sfc_main$8 = {
  __name: "TodoItem",
  props: {
    todo: { type: Object, required: true },
    showDate: { type: Boolean, default: false },
    showList: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false },
    /** 显示开始/结束计时按钮 —— 四象限里开着 */
    timer: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const priColor = (p) => PRIORITIES.find((x) => x.id === p)?.color || "transparent";
    const overdue = (t) => !t.done && t.date && t.date < todayYmd();
    const state2 = computed(() => todoState(props.todo, now.value));
    const deadline = computed(() => deadlineState(props.todo, now.value));
    const ring = computed(() => timerDeadlineState(props.todo, now.value));
    const watchText = computed(() => stopwatchLabel(elapsedMsOf(props.todo, now.value)));
    const spentText = computed(() => durationLabel(props.todo.elapsedMs));
    const leftText = computed(() => remainingLabel(props.todo, now.value));
    const timeText = computed(() => taskTimeLabel(props.todo));
    const aiPlan = computed(() => coachTaskPlan(props.todo.id));
    const aiPlanStatus = computed(() => {
      if (aiCoachUi.value.busy === "task" && aiCoachUi.value.todoId === props.todo.id) return "planning";
      if (!aiPlan.value) return "";
      if (aiPlan.value.stale) return "stale";
      return aiPlan.value.status === "error" ? "error" : "ready";
    });
    const aiPlanLabel = computed(() => ({ planning: "规划中", ready: "已拆解", stale: "需更新", error: "生成失败" })[aiPlanStatus.value] || "");
    function onDragStart(e) {
      e.dataTransfer.setData("text/todo-id", props.todo.id);
      e.dataTransfer.effectAllowed = "move";
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["todo", [`st-${state2.value}`, ring.value ? `ring-${ring.value}` : "", { done: __props.todo.done }]]),
        draggable: __props.draggable,
        onClick: _cache[3] || (_cache[3] = ($event) => unref(actions).openEditor(__props.todo)),
        onDragstart: onDragStart
      }, [
        __props.todo.priority ? (openBlock(), createElementBlock("span", {
          key: 0,
          class: "pri",
          style: normalizeStyle({ background: priColor(__props.todo.priority) })
        }, null, 4)) : createCommentVNode("", true),
        __props.timer && !__props.todo.done ? (openBlock(), createElementBlock("button", {
          key: 1,
          class: normalizeClass(["runbtn", { on: __props.todo.startedAt }]),
          title: __props.todo.startedAt ? "结束计时" : "开始",
          onClick: _cache[0] || (_cache[0] = withModifiers(($event) => unref(actions).toggleTimer(__props.todo), ["stop"]))
        }, [
          createVNode(_sfc_main$b, {
            name: __props.todo.startedAt ? "stop" : "play",
            size: 10
          }, null, 8, ["name"])
        ], 10, _hoisted_2$8)) : createCommentVNode("", true),
        createBaseVNode("button", {
          class: "check",
          title: __props.todo.done ? "取消完成" : "标记完成",
          onClick: _cache[1] || (_cache[1] = withModifiers(($event) => unref(actions).toggleTodo(__props.todo.id), ["stop"]))
        }, [
          __props.todo.done ? (openBlock(), createBlock(_sfc_main$b, {
            key: 0,
            name: "check",
            size: 10
          })) : createCommentVNode("", true)
        ], 8, _hoisted_3$6),
        createBaseVNode("div", _hoisted_4$6, [
          createBaseVNode("div", _hoisted_5$6, toDisplayString(__props.todo.title || "(无标题)"), 1),
          createBaseVNode("div", _hoisted_6$6, [
            __props.showDate && __props.todo.date ? (openBlock(), createElementBlock("span", {
              key: 0,
              class: normalizeClass({ overdue: overdue(__props.todo) })
            }, toDisplayString(unref(relativeLabel)(__props.todo.date)), 3)) : createCommentVNode("", true),
            timeText.value ? (openBlock(), createElementBlock("span", _hoisted_7$6, [
              createVNode(_sfc_main$b, {
                name: "clock",
                size: 11
              }),
              createTextVNode(toDisplayString(timeText.value), 1)
            ])) : createCommentVNode("", true),
            state2.value === "running" ? (openBlock(), createElementBlock("span", _hoisted_8$6, toDisplayString(watchText.value), 1)) : __props.todo.done && spentText.value ? (openBlock(), createElementBlock("span", _hoisted_9$5, " 完成用时：" + toDisplayString(spentText.value), 1)) : spentText.value ? (openBlock(), createElementBlock("span", _hoisted_10$5, "已计 " + toDisplayString(spentText.value), 1)) : createCommentVNode("", true),
            !__props.todo.done && leftText.value ? (openBlock(), createElementBlock("span", {
              key: 5,
              class: normalizeClass(`tag-${deadline.value}`)
            }, toDisplayString(leftText.value), 3)) : createCommentVNode("", true),
            __props.todo.remindBefore !== null && __props.todo.remindBefore !== void 0 ? (openBlock(), createElementBlock("span", _hoisted_11$5, [
              createVNode(_sfc_main$b, {
                name: "bell",
                size: 11
              })
            ])) : createCommentVNode("", true),
            __props.todo.repeat && __props.todo.repeat !== "none" ? (openBlock(), createElementBlock("span", _hoisted_12$5, [
              createVNode(_sfc_main$b, {
                name: "repeat",
                size: 11
              })
            ])) : createCommentVNode("", true),
            __props.showList && unref(listById).get(__props.todo.listId) ? (openBlock(), createElementBlock("span", _hoisted_13$5, toDisplayString(unref(listById).get(__props.todo.listId).name), 1)) : createCommentVNode("", true)
            , aiPlanLabel.value ? createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["todo-ai-badge", `is-${aiPlanStatus.value}`]),
              title: aiPlanStatus.value === "stale" ? "任务已变化，点击重新拆解" : "查看 AI 拆解",
              onClick: withModifiers(() => openTaskCoach(__props.todo, aiPlanStatus.value === "stale"), ["stop"])
            }, aiPlanLabel.value, 2) : createCommentVNode("", true)
          ])
        ]),
        createBaseVNode("button", {
          type: "button",
          class: normalizeClass(["todo-ai-action", { active: Boolean(aiPlan.value), busy: aiPlanStatus.value === "planning" }]),
          title: aiCoachEnabled() ? aiPlan.value ? "查看或重新生成 AI 拆解" : "让 AI 拆解任务" : "先在设置中启用 AI 任务教练",
          "aria-label": aiPlan.value ? "查看 AI 拆解" : "让 AI 拆解任务",
          onClick: withModifiers(() => openTaskCoach(__props.todo, !aiPlan.value || aiPlanStatus.value === "stale"), ["stop"])
        }, [
          createVNode(_sfc_main$b, { name: "route", size: 13 })
        ], 2),
        createBaseVNode("button", {
          class: "del",
          title: "删除",
          onClick: _cache[2] || (_cache[2] = withModifiers(($event) => unref(actions).removeTodo(__props.todo.id), ["stop"]))
        }, [
          createVNode(_sfc_main$b, {
            name: "trash",
            size: 13
          })
        ])
      ], 42, _hoisted_1$8);
    };
  }
};
const _hoisted_1$7 = { class: "main" };
const _hoisted_2$7 = { class: "toolbar" };
const _hoisted_3$5 = {
  key: 0,
  style: { "color": "var(--text-dim)", "margin-left": "4px" }
};
const _hoisted_4$5 = { class: "seg" };
const _hoisted_5$5 = ["onClick"];
const _hoisted_6$5 = {
  key: 0,
  class: "calendar-month-pane"
};
const _hoisted_7$5 = { class: "grid-head" };
const _hoisted_8$5 = { class: "month-grid" };
const _hoisted_9$4 = ["onClick", "onDblclick", "onContextmenu"];
const _hoisted_10$4 = { class: "cell-head" };
const _hoisted_11$4 = { class: "num" };
const _hoisted_12$4 = ["title", "aria-label"];
const _hoisted_13$4 = { class: "month-todo-status" };
const _hoisted_14$2 = { class: "month-todo-density" };
const _hoisted_15$2 = ["title"];
const _hoisted_16$2 = { class: "mix" };
const _hoisted_17$2 = {
  key: 0,
  class: "cogs-dot"
};
const _hoisted_18$2 = {
  key: 1,
  class: "week-cols"
};
const _hoisted_19$2 = ["onClick", "onDblclick", "onContextmenu"];
const _hoisted_20$2 = { style: { "font-size": "11px", "color": "var(--text-dim)" } };
const _hoisted_21$2 = { style: { "font-size": "18px", "font-weight": "600" } };
const _hoisted_22$2 = ["title"];
const _hoisted_23$2 = {
  key: 0,
  class: "cogs-dot"
};
const _hoisted_24$1 = { class: "week-col-body" };
const _hoisted_25$1 = {
  key: 0,
  class: "empty",
  style: { "padding": "10px 4px" }
};
const _hoisted_26$1 = {
  key: 2,
  style: { "display": "flex", "flex-direction": "column", "min-height": "0" }
};
const _hoisted_27$1 = {
  key: 0,
  class: "tl-row",
  style: { "flex": "none", "border-bottom-width": "2px" }
};
const _hoisted_28$1 = { class: "tl-body" };
const _hoisted_29$1 = { class: "tl-hour" };
const _hoisted_30$1 = { class: "tl-body" };
const _hoisted_31$1 = {
  key: 3,
  class: "day-panel"
};
const _hoisted_32$1 = { class: "big" };
const _hoisted_33$1 = { class: "meta" };
const _hoisted_34$1 = { style: { "color": "var(--ok)" } };
const _hoisted_35$1 = { style: { "color": "var(--accent)" } };
const _hoisted_36$1 = { class: "day-exp-head" };
const _hoisted_37$1 = { class: "k cogs" };
const _hoisted_38$1 = { class: "cogs" };
const _hoisted_39$1 = { class: "n" };
const _hoisted_40$1 = { class: "day-exp-rows" };
const _hoisted_41$1 = { class: "todos" };
const _hoisted_rollover_history = { class: "rollover-history" };
const _hoisted_rollover_history_head = { class: "rollover-history-head" };
const _hoisted_rollover_history_rows = { class: "rollover-history-rows" };
const _hoisted_rollover_record_state = { class: "rollover-record-state" };
const _hoisted_rollover_record_copy = { class: "rollover-record-copy" };
const _hoisted_rollover_record_title = { class: "rollover-record-title" };
const _hoisted_rollover_record_meta = { class: "rollover-record-meta" };
const _hoisted_completion_history = { class: "completion-history" };
const _hoisted_completion_history_head = { class: "completion-history-head" };
const _hoisted_completion_history_rows = { class: "completion-history-rows" };
const _hoisted_completion_record_state = { class: "completion-record-state" };
const _hoisted_completion_record_copy = { class: "completion-record-copy" };
const _hoisted_completion_record_title = { class: "completion-record-title" };
const _hoisted_completion_record_meta = { class: "completion-record-meta" };
const _hoisted_month_summary = { class: "calendar-month-summary" };
const _hoisted_month_summary_intro = { class: "calendar-month-summary-intro" };
const _hoisted_month_summary_buttons = { class: "calendar-month-summary-buttons" };
const _month_summary_button_props = ["aria-expanded"];
const _hoisted_month_detail_head = { class: "calendar-month-detail-head" };
const _hoisted_month_detail_title = { class: "calendar-month-detail-title" };
const _hoisted_month_detail_rows = { class: "calendar-month-detail-rows" };
const _hoisted_month_detail_date = { class: "calendar-month-detail-date" };
const _hoisted_month_detail_copy = { class: "calendar-month-detail-copy" };
const _hoisted_month_detail_name = { class: "calendar-month-detail-name" };
const _hoisted_month_detail_meta = { class: "calendar-month-detail-meta" };
const _hoisted_42$1 = {
  key: 0,
  class: "empty"
};
const _hoisted_43$1 = { class: "quick" };
const _sfc_main$7 = {
  __name: "CalendarView",
  setup(__props) {
    const quickText = ref("");
    const dateMenu = ref(null);
    const monthInsight = ref(null);
    const weekStart = computed(() => state.settings?.weekStart ?? 1);
    const labels = computed(() => weekdayLabels(weekStart.value));
    const cells = computed(
      () => state.calendarMode === "week" ? weekGrid(state.cursor, weekStart.value) : monthGrid(state.cursor, weekStart.value)
    );
    const heading = computed(() => {
      const d = parseYmd(state.cursor);
      if (state.calendarMode === "day") {
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      }
      return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月`;
    });
    const selectedInfo = computed(() => lunarInfo(state.selected));
    const selectedDate = computed(() => parseYmd(state.selected));
    const selectedTodos = computed(() => todosOn(state.selected));
    const rolloversByDate = computed(() => {
      const map = /* @__PURE__ */ new Map();
      for (const todo of state.todos) {
        const history = Array.isArray(todo.rolloverHistory) ? todo.rolloverHistory : [];
        for (const record of history) {
          if (!record?.fromDate || record.status !== "incomplete") continue;
          const recordListId = record.listId || todo.listId;
          if (!map.has(record.fromDate)) map.set(record.fromDate, []);
          map.get(record.fromDate).push({
            ...record,
            key: `${todo.id}:${record.fromDate}:${record.rolledTo}`,
            todoId: todo.id,
            title: record.title || todo.title || "未命名待办",
            listName: listById.value.get(recordListId)?.name || "已删除清单"
          });
        }
      }
      for (const rows of map.values()) {
        rows.sort((a, b) => Number(a.recordedAt || 0) - Number(b.recordedAt || 0) || a.title.localeCompare(b.title));
      }
      return map;
    });
    function rolloverRecordsOn(day) {
      return rolloversByDate.value.get(day) || [];
    }
    const selectedRollovers = computed(() => rolloverRecordsOn(state.selected));
    const completionsByDate = computed(() => {
      const map = /* @__PURE__ */ new Map();
      const add = (date, record) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return;
        if (!map.has(date)) map.set(date, []);
        map.get(date).push(record);
      };
      for (const todo of state.todos) {
        if (todo.done && todo.date) {
          add(todo.date, {
            key: `todo:${todo.id}:${todo.date}`,
            source: "todo",
            todoId: todo.id,
            date: todo.date,
            status: "completed",
            completedAt: todo.doneAt,
            title: todo.title || "未命名待办",
            listName: listById.value.get(todo.listId)?.name || "已删除清单"
          });
        }
        const history = Array.isArray(todo.completionHistory) ? todo.completionHistory : [];
        for (const record of history) {
          if (!record?.date || record.status !== "completed") continue;
          const recordListId = record.listId || todo.listId;
          add(record.date, {
            ...record,
            key: `history:${todo.id}:${record.date}`,
            source: "history",
            todoId: todo.id,
            title: record.title || todo.title || "未命名待办",
            listName: listById.value.get(recordListId)?.name || "已删除清单"
          });
        }
      }
      for (const rows of map.values()) {
        rows.sort((a, b) => Number(a.completedAt || 0) - Number(b.completedAt || 0) || a.title.localeCompare(b.title));
      }
      return map;
    });
    function completionRecordsOn(day) {
      return completionsByDate.value.get(day) || [];
    }
    const selectedCompletionHistory = computed(() => completionRecordsOn(state.selected).filter((record) => record.source === "history"));
    const cursorMonthKey = computed(() => String(state.cursor || "").slice(0, 7));
    const cursorMonthLabel = computed(() => {
      const [year, month] = cursorMonthKey.value.split("-");
      return `${year}年${Number(month)}月`;
    });
    const monthRollovers = computed(() => {
      const rows = [];
      for (const [date, records] of rolloversByDate.value) {
        if (date.startsWith(`${cursorMonthKey.value}-`)) rows.push(...records);
      }
      return rows.sort((a, b) => b.fromDate.localeCompare(a.fromDate) || Number(b.recordedAt || 0) - Number(a.recordedAt || 0));
    });
    const monthCompletions = computed(() => {
      const rows = [];
      for (const [date, records] of completionsByDate.value) {
        if (date.startsWith(`${cursorMonthKey.value}-`)) rows.push(...records);
      }
      return rows.sort((a, b) => b.date.localeCompare(a.date) || Number(b.completedAt || 0) - Number(a.completedAt || 0));
    });
    const monthInsightRows = computed(() => monthInsight.value === "rollover" ? monthRollovers.value : monthInsight.value === "completed" ? monthCompletions.value : []);
    const monthInsightLabel = computed(() => monthInsight.value === "rollover" ? "延期明细" : "完成明细");
    function toggleMonthInsight(type) {
      monthInsight.value = monthInsight.value === type ? null : type;
    }
    const shortDayLabel = (date) => `${Number(String(date || "").slice(-2))}日`;
    function completionMoment(record) {
      const stamp = Number(record.completedAt || 0);
      if (!stamp) return "完成时间未记录";
      const value = new Date(stamp);
      const pad2 = (number) => String(number).padStart(2, "0");
      return `完成于 ${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
    }
    function step(dir) {
      if (state.calendarMode === "month") state.cursor = addMonths(state.cursor, dir);
      else if (state.calendarMode === "week") state.cursor = addDays(state.cursor, dir * 7);
      else state.cursor = addDays(state.cursor, dir);
    }
    function goToday() {
      state.cursor = todayYmd();
      state.selected = todayYmd();
    }
    function pick(day) {
      state.selected = day;
      if (state.calendarMode === "month" && !isSameMonth(day, state.cursor)) state.cursor = day;
    }
    function openDateMenu(event, day) {
      const width = 148;
      const height = 44;
      const pad = 8;
      state.selected = day;
      dateMenu.value = {
        day,
        x: Math.max(pad, Math.min(event.clientX, window.innerWidth - width - pad)),
        y: Math.max(pad, Math.min(event.clientY, window.innerHeight - height - pad))
      };
    }
    function addTodoForMenuDate() {
      const day = dateMenu.value?.day;
      dateMenu.value = null;
      if (day) actions.openEditor({ date: day });
    }
    async function quickAdd() {
      const text = quickText.value;
      quickText.value = "";
      await actions.quickAdd(text, state.selected);
    }
    const timelineEl = ref(null);
    const allDayTodos = computed(() => selectedTodos.value.filter((t) => !taskSortTime(t)));
    const todosAtHour = (hour) => selectedTodos.value.filter((t) => {
      const time = taskSortTime(t);
      return time && Number(time.split(":")[0]) === hour;
    });
    async function scrollToNow() {
      await nextTick();
      const el = timelineEl.value;
      if (!el) return;
      const hour = (/* @__PURE__ */ new Date()).getHours();
      el.scrollTop = Math.max(0, (hour - 1) * 46);
    }
    watch(
      () => state.calendarMode,
      (m) => {
        if (m === "day") scrollToNow();
      },
      { immediate: true }
    );
    const calendarRound = (value) => Math.round((Number(value) || 0) * 100) / 100;
    function calendarExpenseSummary(entries = []) {
      const ledgers = new Map(ledgerGoals.value.map((ledger) => [String(ledger.id), ledger]));
      const rowsByLedgerAndCategory = /* @__PURE__ */ new Map();
      const out = { opex: 0, cogs: 0, unclassified: 0, total: 0, count: 0, rows: [] };
      for (const entry of entries) {
        const goalId = String(entry.goalId ?? "");
        const categoryId = String(entry.cat ?? "");
        const ledger = ledgers.get(goalId) || null;
        const category = ledger ? catsOf(ledger).find((item) => item.id === categoryId) || null : null;
        const group = ["opex", "cogs", "unclassified"].includes(category?.group) ? category.group : "unclassified";
        const amount = Number(entry.amount) || 0;
        const key = JSON.stringify([goalId, categoryId]);
        let row = rowsByLedgerAndCategory.get(key);
        if (!row) {
          const baseName = category?.name || "遗留/未分类";
          const ledgerName = ledger?.name || "已移除台账";
          row = {
            id: key,
            group,
            name: ledgers.size > 1 || !ledger ? `${ledgerName} · ${baseName}` : baseName,
            color: category?.color || "#7f8b9a",
            amount: 0,
            count: 0
          };
          rowsByLedgerAndCategory.set(key, row);
        }
        row.amount += amount;
        row.count += 1;
        out[group] += amount;
        out.count += 1;
      }
      out.opex = calendarRound(out.opex);
      out.cogs = calendarRound(out.cogs);
      out.unclassified = calendarRound(out.unclassified);
      out.total = calendarRound(out.opex + out.cogs + out.unclassified);
      out.rows = [...rowsByLedgerAndCategory.values()].map((row) => ({
        ...row,
        amount: calendarRound(row.amount)
      })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      return out;
    }
    const expOn = (day) => calendarExpenseSummary(expensesOn(day));
    function cellExp(day) {
      const s = expOn(day);
      if (!s.count) return null;
      const nonCogs = calendarRound(s.opex + s.unclassified);
      const cogsOnly = !nonCogs && !!s.cogs;
      return {
        text: formatGoalNumber(cogsOnly ? s.cogs : nonCogs),
        cogsOnly,
        legacyOnly: !s.opex && !!s.unclassified,
        hasCogs: !!s.cogs,
        hasLegacy: !!s.unclassified,
        title: `期间费用 ${formatGoalNumber(s.opex)} · 遗留/未分类 ${formatGoalNumber(s.unclassified)} · ${calCogsName.value} ${formatGoalNumber(s.cogs)} · ${s.count} 笔`
      };
    }
    function cellMix(day) {
      const s = expOn(day);
      const nonCogs = calendarRound(s.opex + s.unclassified);
      if (!nonCogs) return [];
      return s.rows.filter((row) => row.group !== "cogs").map((row) => ({
        id: row.id,
        color: row.color,
        pct: row.amount / nonCogs * 100
      })).filter((row) => row.pct > 0);
    }
    function cellTodos(day) {
      const items = todosOn(day);
      const rollovers = rolloverRecordsOn(day);
      const completions = completionRecordsOn(day);
      if (!items.length && !rollovers.length && !completions.length) return null;
      const done = completions.length;
      const open = items.filter((todo) => !todo.done).length + rollovers.length;
      const total = open + done;
      return {
        total,
        done,
        open,
        rollover: rollovers.length,
        completion: completions.length,
        density: Math.min(6, total),
        title: `${total} 项记录 · ${open} 项未完成${done ? ` · ${done} 项已完成` : ""}${rollovers.length ? ` · ${rollovers.length} 项为顺延记录` : ""}；点击后在右侧查看详情`
      };
    }
    const selectedExp = computed(() => calendarExpenseSummary(expensesOn(state.selected)));
    const calCogsName = computed(() => {
      const names = [...new Set(ledgerGoals.value.map((ledger) => cogsLabel(ledger)))];
      return names.length === 1 ? names[0] : "货款";
    });
    const selectedExpRows = computed(() => selectedExp.value.rows.filter((row) => row.amount !== 0));
    const isToday = (d) => d === todayYmd();
    const dayNum = (d) => parseYmd(d).getDate();
    const headIsWeekend = (i) => {
      const wd = (i + weekStart.value) % 7;
      return wd === 0 || wd === 6;
    };
    const weekdayName = (d) => ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parseYmd(d).getDay()];
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$7, [
        createBaseVNode("div", _hoisted_2$7, [
          createBaseVNode("button", {
            class: "tbtn",
            title: "上一页",
            onClick: _cache[0] || (_cache[0] = ($event) => step(-1))
          }, [
            createVNode(_sfc_main$b, {
              name: "left",
              size: 15
            })
          ]),
          createBaseVNode("h2", null, toDisplayString(heading.value), 1),
          createBaseVNode("button", {
            class: "tbtn",
            title: "下一页",
            onClick: _cache[1] || (_cache[1] = ($event) => step(1))
          }, [
            createVNode(_sfc_main$b, {
              name: "right",
              size: 15
            })
          ]),
          unref(state).calendarMode !== "day" ? (openBlock(), createElementBlock("span", _hoisted_3$5, " 第 " + toDisplayString(unref(isoWeekNumber)(unref(state).cursor)) + " 周 ", 1)) : createCommentVNode("", true),
          _cache[10] || (_cache[10] = createBaseVNode("div", {
            class: "spacer",
            style: { "flex": "1" }
          }, null, -1)),
          createBaseVNode("button", {
            class: "ghost",
            onClick: goToday
          }, "今天"),
          createBaseVNode("div", _hoisted_4$5, [
            (openBlock(), createElementBlock(Fragment, null, renderList([
              { id: "day", n: "日" },
              { id: "week", n: "周" },
              { id: "month", n: "月" }
            ], (m) => {
              return createBaseVNode("button", {
                key: m.id,
                class: normalizeClass({ active: unref(state).calendarMode === m.id }),
                onClick: ($event) => unref(state).calendarMode = m.id
              }, toDisplayString(m.n), 11, _hoisted_5$5);
            }), 64))
          ])
        ]),
        createBaseVNode("div", {
          class: normalizeClass(["calendar-wrap", { "no-panel": unref(state).calendarMode === "week" }])
        }, [
          unref(state).calendarMode === "month" ? (openBlock(), createElementBlock("div", _hoisted_6$5, [
            createBaseVNode("div", _hoisted_7$5, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(labels.value, (l, i) => {
                return openBlock(), createElementBlock("div", {
                  key: l,
                  class: normalizeClass({ we: headIsWeekend(i) })
                }, toDisplayString(l), 3);
              }), 128))
            ]),
            createBaseVNode("div", _hoisted_8$5, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(cells.value, (day) => {
                return openBlock(), createElementBlock("div", {
                  key: day,
                  class: normalizeClass(["cell", {
                    out: !unref(isSameMonth)(day, unref(state).cursor),
                    today: isToday(day),
                    selected: day === unref(state).selected
                  }]),
                  onClick: ($event) => pick(day),
                  onDblclick: ($event) => unref(actions).openEditor({ date: day }),
                  onContextmenu: withModifiers(($event) => openDateMenu($event, day), ["stop", "prevent"])
                }, [
                  unref(lunarInfo)(day).holiday ? (openBlock(), createElementBlock("span", {
                    key: 0,
                    class: normalizeClass(["badge", unref(lunarInfo)(day).holiday.isWork ? "work" : "rest"])
                  }, toDisplayString(unref(lunarInfo)(day).holiday.isWork ? "班" : "休"), 3)) : createCommentVNode("", true),
                  createBaseVNode("div", _hoisted_10$4, [
                    createBaseVNode("span", _hoisted_11$4, toDisplayString(dayNum(day)), 1),
                    createBaseVNode("span", {
                      class: normalizeClass(["sub", unref(lunarInfo)(day).tone])
                    }, toDisplayString(unref(lunarInfo)(day).label), 3)
                  ]),
                  cellTodos(day) ? (openBlock(), createElementBlock("div", {
                    key: 2,
                    class: normalizeClass(["month-todo-summary", {
                      busy: cellTodos(day).total >= 5,
                      complete: !cellTodos(day).open,
                      rollover: cellTodos(day).rollover > 0
                    }]),
                    title: cellTodos(day).title,
                    "aria-label": cellTodos(day).title
                  }, [
                    createBaseVNode("div", _hoisted_13$4, [
                      createBaseVNode("span", { class: "pending" }, [
                        createBaseVNode("i", { "aria-hidden": "true" }),
                        createBaseVNode("em", null, [
                          createBaseVNode("span", { class: "status-label-full" }, "未完成"),
                          createBaseVNode("span", { class: "status-label-short" }, "未")
                        ]),
                        createBaseVNode("b", null, toDisplayString(cellTodos(day).open), 1)
                      ]),
                      createBaseVNode("span", { class: "finished" }, [
                        createBaseVNode("i", { "aria-hidden": "true" }),
                        createBaseVNode("em", null, [
                          createBaseVNode("span", { class: "status-label-full" }, "已完成"),
                          createBaseVNode("span", { class: "status-label-short" }, "完")
                        ]),
                        createBaseVNode("b", null, toDisplayString(cellTodos(day).done), 1)
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_14$2, [
                      (openBlock(), createElementBlock(Fragment, null, renderList(6, (index) => {
                        return createBaseVNode("i", {
                          key: index,
                          class: normalizeClass({ on: index <= cellTodos(day).density })
                        }, null, 2);
                      }), 64))
                    ])
                  ], 10, _hoisted_12$4)) : createCommentVNode("", true),
                  cellExp(day) ? (openBlock(), createElementBlock("div", {
                    key: 1,
                    class: "cell-exp",
                    title: cellExp(day).title
                  }, [
                    createBaseVNode("span", _hoisted_16$2, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(cellMix(day), (s) => {
                        return openBlock(), createElementBlock("i", {
                          key: s.id,
                          style: normalizeStyle({ width: s.pct + "%", background: s.color })
                        }, null, 4);
                      }), 128))
                    ]),
                    createBaseVNode("b", {
                      class: normalizeClass({ cogs: cellExp(day).cogsOnly, legacy: cellExp(day).legacyOnly })
                    }, toDisplayString(cellExp(day).text), 3),
                    cellExp(day).hasCogs && !cellExp(day).cogsOnly ? (openBlock(), createElementBlock("span", _hoisted_17$2)) : createCommentVNode("", true),
                    cellExp(day).hasLegacy ? (openBlock(), createElementBlock("span", {
                      key: 1,
                      class: "legacy-dot",
                      title: "含遗留/未分类记录"
                    })) : createCommentVNode("", true)
                  ], 8, _hoisted_15$2)) : createCommentVNode("", true)
                ], 42, _hoisted_9$4);
              }), 128))
            ]),
            createBaseVNode("section", _hoisted_month_summary, [
              createBaseVNode("div", _hoisted_month_summary_intro, [
                createBaseVNode("span", null, "本月执行复盘"),
                createBaseVNode("b", null, toDisplayString(cursorMonthLabel.value), 1)
              ]),
              createBaseVNode("div", _hoisted_month_summary_buttons, [
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["rollover", { active: monthInsight.value === "rollover" }]),
                  "aria-expanded": monthInsight.value === "rollover",
                  onClick: _cache[19] || (_cache[19] = ($event) => toggleMonthInsight("rollover"))
                }, [
                  createBaseVNode("span", null, "本月延期"),
                  createBaseVNode("strong", null, toDisplayString(monthRollovers.value.length), 1),
                  createBaseVNode("em", null, "项")
                ], 10, _month_summary_button_props),
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["completed", { active: monthInsight.value === "completed" }]),
                  "aria-expanded": monthInsight.value === "completed",
                  onClick: _cache[20] || (_cache[20] = ($event) => toggleMonthInsight("completed"))
                }, [
                  createBaseVNode("span", null, "本月完成"),
                  createBaseVNode("strong", null, toDisplayString(monthCompletions.value.length), 1),
                  createBaseVNode("em", null, "项")
                ], 10, _month_summary_button_props)
              ])
            ]),
            monthInsight.value ? (openBlock(), createElementBlock("section", {
              key: 0,
              class: normalizeClass(["calendar-month-detail", monthInsight.value])
            }, [
              createBaseVNode("div", _hoisted_month_detail_head, [
                createBaseVNode("div", _hoisted_month_detail_title, [
                  createBaseVNode("span", null, toDisplayString(cursorMonthLabel.value) + " · " + toDisplayString(monthInsightLabel.value), 1),
                  createBaseVNode("b", null, toDisplayString(monthInsightRows.value.length) + " 项", 1)
                ]),
                createBaseVNode("button", {
                  type: "button",
                  title: "关闭明细",
                  onClick: _cache[21] || (_cache[21] = ($event) => monthInsight.value = null)
                }, "×")
              ]),
              createBaseVNode("div", _hoisted_month_detail_rows, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(monthInsightRows.value, (record) => {
                  return openBlock(), createElementBlock("div", {
                    key: record.key,
                    class: "calendar-month-detail-row"
                  }, [
                    createBaseVNode("span", _hoisted_month_detail_date, toDisplayString(shortDayLabel(record.fromDate || record.date)), 1),
                    createBaseVNode("div", _hoisted_month_detail_copy, [
                      createBaseVNode("div", _hoisted_month_detail_name, toDisplayString(record.title), 1),
                      createBaseVNode("div", _hoisted_month_detail_meta, toDisplayString(monthInsight.value === "rollover" ? `顺延至 ${record.rolledTo} · ${record.listName}` : `${completionMoment(record)} · ${record.listName}`), 1)
                    ])
                  ]);
                }), 128)),
                !monthInsightRows.value.length ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  class: "calendar-month-detail-empty"
                }, toDisplayString(monthInsight.value === "rollover" ? "本月没有延期记录" : "本月还没有完成记录"), 1)) : createCommentVNode("", true)
              ])
            ], 2)) : createCommentVNode("", true)
          ])) : unref(state).calendarMode === "week" ? (openBlock(), createElementBlock("div", _hoisted_18$2, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(cells.value, (day) => {
              return openBlock(), createElementBlock("div", {
                key: day,
                class: "week-col"
              }, [
                createBaseVNode("div", {
                  class: normalizeClass(["week-col-head", { today: isToday(day) }]),
                  onClick: ($event) => pick(day),
                  onDblclick: ($event) => unref(actions).openEditor({ date: day }),
                  onContextmenu: withModifiers(($event) => openDateMenu($event, day), ["stop", "prevent"])
                }, [
                  createBaseVNode("div", _hoisted_20$2, toDisplayString(weekdayName(day)), 1),
                  createBaseVNode("div", _hoisted_21$2, toDisplayString(dayNum(day)), 1),
                  createBaseVNode("div", {
                    class: normalizeClass(["sub", unref(lunarInfo)(day).tone]),
                    style: { "font-size": "10px" }
                  }, toDisplayString(unref(lunarInfo)(day).label), 3)
                ], 42, _hoisted_19$2),
                cellExp(day) ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  class: "week-exp",
                  title: cellExp(day).title
                }, [
                  createBaseVNode("b", {
                    class: normalizeClass({ cogs: cellExp(day).cogsOnly, legacy: cellExp(day).legacyOnly })
                  }, toDisplayString(cellExp(day).text), 3),
                  cellExp(day).hasCogs && !cellExp(day).cogsOnly ? (openBlock(), createElementBlock("span", _hoisted_23$2)) : createCommentVNode("", true),
                  cellExp(day).hasLegacy ? (openBlock(), createElementBlock("span", {
                    key: 1,
                    class: "legacy-dot",
                    title: "含遗留/未分类记录"
                  })) : createCommentVNode("", true)
                ], 8, _hoisted_22$2)) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_24$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(todosOn)(day), (t) => {
                    return openBlock(), createBlock(_sfc_main$8, {
                      key: t.id,
                      todo: t
                    }, null, 8, ["todo"]);
                  }), 128)),
                  !unref(todosOn)(day).length ? (openBlock(), createElementBlock("div", _hoisted_25$1, "—")) : createCommentVNode("", true)
                ])
              ]);
            }), 128))
          ])) : (openBlock(), createElementBlock("div", _hoisted_26$1, [
            allDayTodos.value.length ? (openBlock(), createElementBlock("div", _hoisted_27$1, [
              _cache[11] || (_cache[11] = createBaseVNode("div", { class: "tl-hour" }, "全天", -1)),
              createBaseVNode("div", _hoisted_28$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(allDayTodos.value, (t) => {
                  return openBlock(), createBlock(_sfc_main$8, {
                    key: t.id,
                    todo: t,
                    style: { "background": "var(--bg-soft)", "border-radius": "6px" }
                  }, null, 8, ["todo"]);
                }), 128))
              ])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", {
              ref_key: "timelineEl",
              ref: timelineEl,
              class: "timeline"
            }, [
              (openBlock(), createElementBlock(Fragment, null, renderList(24, (h) => {
                return createBaseVNode("div", {
                  key: h,
                  class: "tl-row"
                }, [
                  createBaseVNode("div", _hoisted_29$1, toDisplayString(String(h - 1).padStart(2, "0")) + ":00", 1),
                  createBaseVNode("div", _hoisted_30$1, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(todosAtHour(h - 1), (t) => {
                      return openBlock(), createBlock(_sfc_main$8, {
                        key: t.id,
                        todo: t,
                        style: { "background": "var(--bg-soft)", "border-radius": "6px" }
                      }, null, 8, ["todo"]);
                    }), 128))
                  ])
                ]);
              }), 64))
            ], 512)
          ])),
          unref(state).calendarMode !== "week" ? (openBlock(), createElementBlock("div", _hoisted_31$1, [
            createBaseVNode("div", {
              class: "head",
              onContextmenu: _cache[2] || (_cache[2] = withModifiers(($event) => openDateMenu($event, unref(state).selected), ["stop", "prevent"]))
            }, [
              createBaseVNode("div", _hoisted_32$1, toDisplayString(selectedDate.value.getMonth() + 1) + "月" + toDisplayString(selectedDate.value.getDate()) + "日 ", 1),
              createBaseVNode("div", _hoisted_33$1, [
                createTextVNode(toDisplayString(weekdayName(unref(state).selected)) + " · " + toDisplayString(selectedInfo.value.full), 1),
                _cache[15] || (_cache[15] = createBaseVNode("br", null, null, -1)),
                createTextVNode(" " + toDisplayString(selectedInfo.value.ganzhi) + " · " + toDisplayString(selectedInfo.value.animal) + "年 ", 1),
                selectedInfo.value.festivals.length ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  _cache[12] || (_cache[12] = createBaseVNode("br", null, null, -1)),
                  createBaseVNode("span", _hoisted_34$1, toDisplayString(selectedInfo.value.festivals.join("、")), 1)
                ], 64)) : createCommentVNode("", true),
                selectedInfo.value.jieQi ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  _cache[13] || (_cache[13] = createBaseVNode("br", null, null, -1)),
                  createBaseVNode("span", _hoisted_35$1, "节气：" + toDisplayString(selectedInfo.value.jieQi), 1)
                ], 64)) : createCommentVNode("", true),
                selectedInfo.value.holiday ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  _cache[14] || (_cache[14] = createBaseVNode("br", null, null, -1)),
                  createBaseVNode("span", {
                    style: normalizeStyle({ color: selectedInfo.value.holiday.isWork ? "var(--danger)" : "var(--ok)" })
                  }, toDisplayString(selectedInfo.value.holiday.name) + toDisplayString(selectedInfo.value.holiday.isWork ? " 调休上班" : " 放假"), 5)
                ], 64)) : createCommentVNode("", true)
              ])
            ], 32),
            selectedExp.value.count ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: "day-exp",
              title: "点击去「费用」查看和编辑这天的明细",
              onClick: _cache[3] || (_cache[3] = ($event) => unref(state).view = "expense")
            }, [
              createBaseVNode("div", _hoisted_36$1, [
                _cache[16] || (_cache[16] = createBaseVNode("span", { class: "k" }, "期间费用", -1)),
                createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(selectedExp.value.opex)), 1),
                selectedExp.value.cogs ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createBaseVNode("span", _hoisted_37$1, toDisplayString(calCogsName.value), 1),
                  createBaseVNode("b", _hoisted_38$1, toDisplayString(unref(formatGoalNumber)(selectedExp.value.cogs)), 1)
                ], 64)) : createCommentVNode("", true),
                selectedExp.value.unclassified ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createBaseVNode("span", { class: "k legacy" }, "遗留/未分类"),
                  createBaseVNode("b", { class: "legacy" }, toDisplayString(unref(formatGoalNumber)(selectedExp.value.unclassified)), 1)
                ], 64)) : createCommentVNode("", true),
                createBaseVNode("span", _hoisted_39$1, toDisplayString(selectedExp.value.count) + " 笔", 1)
              ]),
              createBaseVNode("div", _hoisted_40$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(selectedExpRows.value, (r) => {
                  return openBlock(), createElementBlock("span", {
                    key: r.id,
                    class: "day-exp-row"
                  }, [
                    createBaseVNode("i", {
                      class: "dot",
                      style: normalizeStyle({ background: r.color })
                    }, null, 4),
                    createTextVNode(" " + toDisplayString(r.name) + " ", 1),
                    createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(r.amount)), 1)
                  ]);
                }), 128))
              ])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_41$1, [
              selectedRollovers.value.length ? (openBlock(), createElementBlock("section", _hoisted_rollover_history, [
                createBaseVNode("div", _hoisted_rollover_history_head, [
                  createBaseVNode("span", null, "当日未完成 · 顺延记录"),
                  createBaseVNode("b", null, toDisplayString(selectedRollovers.value.length), 1)
                ]),
                createBaseVNode("div", _hoisted_rollover_history_rows, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(selectedRollovers.value, (record) => {
                    return openBlock(), createElementBlock("div", {
                      key: record.key,
                      class: "rollover-record"
                    }, [
                      createBaseVNode("span", _hoisted_rollover_record_state, "未完成"),
                      createBaseVNode("div", _hoisted_rollover_record_copy, [
                        createBaseVNode("div", _hoisted_rollover_record_title, toDisplayString(record.title), 1),
                        createBaseVNode("div", _hoisted_rollover_record_meta, "已顺延至 " + toDisplayString(record.rolledTo) + " · " + toDisplayString(record.listName), 1)
                      ])
                    ]);
                  }), 128))
                ])
              ])) : createCommentVNode("", true),
              selectedCompletionHistory.value.length ? (openBlock(), createElementBlock("section", _hoisted_completion_history, [
                createBaseVNode("div", _hoisted_completion_history_head, [
                  createBaseVNode("span", null, "当日完成 · 周期记录"),
                  createBaseVNode("b", null, toDisplayString(selectedCompletionHistory.value.length), 1)
                ]),
                createBaseVNode("div", _hoisted_completion_history_rows, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(selectedCompletionHistory.value, (record) => {
                    return openBlock(), createElementBlock("div", {
                      key: record.key,
                      class: "completion-record"
                    }, [
                      createBaseVNode("span", _hoisted_completion_record_state, "已完成"),
                      createBaseVNode("div", _hoisted_completion_record_copy, [
                        createBaseVNode("div", _hoisted_completion_record_title, toDisplayString(record.title), 1),
                        createBaseVNode("div", _hoisted_completion_record_meta, toDisplayString(completionMoment(record)) + " · " + toDisplayString(record.listName), 1)
                      ])
                    ]);
                  }), 128))
                ])
              ])) : createCommentVNode("", true),
              (openBlock(true), createElementBlock(Fragment, null, renderList(selectedTodos.value, (t) => {
                return openBlock(), createBlock(_sfc_main$8, {
                  key: t.id,
                  todo: t,
                  "show-list": ""
                }, null, 8, ["todo"]);
              }), 128)),
              !selectedTodos.value.length && !selectedRollovers.value.length && !selectedCompletionHistory.value.length ? (openBlock(), createElementBlock("div", _hoisted_42$1, [..._cache[17] || (_cache[17] = [
                createTextVNode(" 这天还没有安排", -1),
                createBaseVNode("br", null, null, -1),
                createTextVNode("在下面输入就能加一条 ", -1)
              ])])) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_43$1, [
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => quickText.value = $event),
                placeholder: "添加待办，回车保存",
                onKeyup: withKeys(quickAdd, ["enter"])
              }, null, 544), [
                [vModelText, quickText.value]
              ]),
              createBaseVNode("button", {
                class: "primary",
                title: "详细编辑",
                onClick: _cache[5] || (_cache[5] = ($event) => unref(actions).openEditor({ date: unref(state).selected }))
              }, [
                createVNode(_sfc_main$b, {
                  name: "plus",
                  size: 14
                })
              ])
            ])
          ])) : createCommentVNode("", true)
        ], 2),
        dateMenu.value ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "date-context-layer",
          onPointerdown: _cache[8] || (_cache[8] = ($event) => dateMenu.value = null),
          onContextmenu: _cache[9] || (_cache[9] = withModifiers(($event) => dateMenu.value = null, ["prevent"]))
        }, [
          createBaseVNode("div", {
            class: "date-context-menu",
            style: normalizeStyle({ left: `${dateMenu.value.x}px`, top: `${dateMenu.value.y}px` }),
            onPointerdown: _cache[6] || (_cache[6] = withModifiers(() => {
            }, ["stop"])),
            onContextmenu: _cache[7] || (_cache[7] = withModifiers(() => {
            }, ["prevent"]))
          }, [
            createBaseVNode("button", { onClick: addTodoForMenuDate }, [
              createVNode(_sfc_main$b, {
                name: "plus",
                size: 13
              }),
              _cache[18] || (_cache[18] = createTextVNode(" 新增待办事项 ", -1))
            ])
          ], 36)
        ], 32)) : createCommentVNode("", true)
      ]);
    };
  }
};
const CalendarView = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-f849fec3"]]);
const dialogState = ref(null);
function open(config) {
  return new Promise((resolve) => {
    dialogState.value?.resolve(dialogState.value.kind === "prompt" ? null : false);
    dialogState.value = { okText: "确定", danger: false, value: "", ...config, resolve };
  });
}
const confirmDialog = (text, opts = {}) => open({ kind: "confirm", text, danger: true, ...opts });
const promptDialog = (text, value = "", opts = {}) => open({ kind: "prompt", text, value: String(value ?? ""), ...opts });
const alertDialog = (text) => open({ kind: "alert", text, okText: "知道了", danger: false });
function closeDialog(result) {
  const box = dialogState.value;
  dialogState.value = null;
  box?.resolve(result);
}
const _hoisted_1$6 = { class: "main" };
const _hoisted_2$6 = { class: "toolbar" };
const _hoisted_3$4 = { class: "seg" };
const _hoisted_4$4 = ["onClick"];
const _hoisted_5$4 = {
  class: "quick",
  style: { "padding": "10px 16px", "border-bottom": "1px solid var(--border-soft)", "display": "flex", "gap": "8px" }
};
const _hoisted_6$4 = { class: "todo-list" };
const _hoisted_7$4 = { class: "group-title" };
const _hoisted_8$4 = {
  key: 0,
  class: "empty"
};
const _sfc_main$6 = {
  __name: "TodoView",
  setup(__props) {
    const quickText = ref("");
    const title = computed(() => {
      if (!state.activeListId) return "全部待办";
      return state.lists.find((l) => l.id === state.activeListId)?.name || "待办";
    });
    const groups = computed(() => {
      const today = todayYmd();
      const buckets = {
        overdue: [],
        today: [],
        upcoming: [],
        someday: [],
        done: []
      };
      for (const t of visibleTodos.value) {
        if (t.done) buckets.done.push(t);
        else if (!t.date) buckets.someday.push(t);
        else if (t.date < today) buckets.overdue.push(t);
        else if (t.date === today) buckets.today.push(t);
        else buckets.upcoming.push(t);
      }
      return [
        { key: "overdue", name: "已逾期", rows: buckets.overdue },
        { key: "today", name: "今天", rows: buckets.today },
        { key: "upcoming", name: "将来", rows: buckets.upcoming },
        { key: "someday", name: "没定日期", rows: buckets.someday },
        { key: "done", name: "已完成", rows: buckets.done }
      ].filter((g) => g.rows.length);
    });
    async function quickAdd() {
      const text = quickText.value;
      quickText.value = "";
      await actions.quickAdd(text, null);
    }
    async function renameList() {
      const list = state.lists.find((l) => l.id === state.activeListId);
      if (!list) return;
      const name = await promptDialog("清单名称", list.name, { okText: "重命名", danger: false });
      if (name && name.trim()) await actions.renameList(list.id, name.trim());
    }
    async function removeList() {
      if (!state.activeListId) return;
      const list = state.lists.find((l) => l.id === state.activeListId);
      const ok = await confirmDialog(`删除清单「${list?.name}」？里面的待办会移到第一个清单。`, {
        okText: "删除"
      });
      if (!ok) return;
      const res = await actions.removeList(state.activeListId);
      if (res?.ok === false) await alertDialog(res.reason);
      else state.activeListId = null;
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$6, [
        createBaseVNode("div", _hoisted_2$6, [
          createBaseVNode("h2", null, toDisplayString(title.value), 1),
          unref(state).activeListId ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createBaseVNode("button", {
              class: "tbtn",
              title: "重命名",
              onClick: renameList
            }, [
              createVNode(_sfc_main$b, {
                name: "settings",
                size: 14
              })
            ]),
            createBaseVNode("button", {
              class: "tbtn",
              title: "删除清单",
              onClick: removeList
            }, [
              createVNode(_sfc_main$b, {
                name: "trash",
                size: 14
              })
            ])
          ], 64)) : createCommentVNode("", true),
          _cache[3] || (_cache[3] = createBaseVNode("div", { style: { "flex": "1" } }, null, -1)),
          createBaseVNode("button", {
            type: "button",
            class: normalizeClass(["coach-toolbar-button", { ready: aiCoachEnabled() }]),
            title: aiCoachEnabled() ? coachDayPlan(todayYmd()) ? "查看今天的 AI 时间安排" : "生成今天的时间安排草案" : "先在设置中启用 AI 任务教练",
            onClick: () => openDayCoach(todayYmd(), !coachDayPlan(todayYmd()))
          }, [
            createVNode(_sfc_main$b, { name: "route", size: 14 }),
            createBaseVNode("span", null, "AI 安排今天")
          ], 2),
          createBaseVNode("div", _hoisted_3$4, [
            (openBlock(), createElementBlock(Fragment, null, renderList([
              { id: "all", n: "全部" },
              { id: "active", n: "未完成" },
              { id: "done", n: "已完成" }
            ], (f) => {
              return createBaseVNode("button", {
                key: f.id,
                class: normalizeClass({ active: unref(state).filter === f.id }),
                onClick: ($event) => unref(state).filter = f.id
              }, toDisplayString(f.n), 11, _hoisted_4$4);
            }), 64))
          ]),
          createBaseVNode("button", {
            class: "ghost",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(actions).clearCompleted(unref(state).activeListId))
          }, "清除已完成"),
          createBaseVNode("button", {
            class: "primary",
            onClick: _cache[1] || (_cache[1] = ($event) => unref(actions).openEditor({}))
          }, "新建")
        ]),
        createBaseVNode("div", _hoisted_5$4, [
          withDirectives(createBaseVNode("input", {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => quickText.value = $event),
            style: { "flex": "1" },
            placeholder: "快速添加一条待办，回车保存",
            onKeyup: withKeys(quickAdd, ["enter"])
          }, null, 544), [
            [vModelText, quickText.value]
          ])
        ]),
        createBaseVNode("div", _hoisted_6$4, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(groups.value, (g) => {
            return openBlock(), createElementBlock(Fragment, {
              key: g.key
            }, [
              createBaseVNode("div", _hoisted_7$4, toDisplayString(g.name) + " · " + toDisplayString(g.rows.length), 1),
              (openBlock(true), createElementBlock(Fragment, null, renderList(g.rows, (t) => {
                return openBlock(), createBlock(_sfc_main$8, {
                  key: t.id,
                  todo: t,
                  "show-date": "",
                  "show-list": !unref(state).activeListId
                }, null, 8, ["todo", "show-list"]);
              }), 128))
            ], 64);
          }), 128)),
          !groups.value.length ? (openBlock(), createElementBlock("div", _hoisted_8$4, [..._cache[4] || (_cache[4] = [
            createTextVNode(" 还没有待办", -1),
            createBaseVNode("br", null, null, -1),
            createTextVNode("在上面输入框敲一条试试 ", -1)
          ])])) : createCommentVNode("", true)
        ])
      ]);
    };
  }
};
const _hoisted_1$5 = { class: "main" };
const _hoisted_2$5 = { class: "toolbar" };
const _hoisted_3$3 = {
  key: 0,
  style: { "color": "var(--text-dim)", "font-size": "12px" }
};
const _hoisted_4$3 = {
  key: 0,
  style: { "display": "flex", "gap": "6px", "padding": "8px 12px", "overflow-x": "auto", "border-bottom": "1px solid var(--border-soft)" }
};
const _hoisted_5$3 = ["onDragstart", "onClick"];
const _hoisted_6$3 = { class: "matrix" };
const _hoisted_7$3 = ["onDragover", "onDrop", "onContextmenu"];
const _hoisted_8$3 = { class: "quad-head" };
const _hoisted_9$3 = { class: "name" };
const _hoisted_10$3 = { class: "hint" };
const _hoisted_11$3 = { class: "n" };
const _hoisted_12$3 = { class: "quad-body" };
const _hoisted_13$3 = {
  key: 0,
  class: "empty",
  style: { "padding": "16px 8px" }
};
const _sfc_main$5 = {
  __name: "MatrixView",
  setup(__props) {
    const dragOver = ref(0);
    const bucket = (q) => computed(() => visibleTodos.value.filter((t) => !t.done && (t.quadrant || 0) === q));
    const q1 = bucket(1);
    const q2 = bucket(2);
    const q3 = bucket(3);
    const q4 = bucket(4);
    const unsorted = computed(() => visibleTodos.value.filter((t) => !t.done && !t.quadrant));
    const rowsOf = (id) => ({ 1: q1, 2: q2, 3: q3, 4: q4 })[id].value;
    function onDrop(e, quadrant) {
      e.preventDefault();
      dragOver.value = 0;
      const id = e.dataTransfer.getData("text/todo-id");
      if (id) actions.updateTodo(id, { quadrant });
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        createBaseVNode("div", _hoisted_2$5, [
          _cache[2] || (_cache[2] = createBaseVNode("h2", null, "四象限", -1)),
          _cache[3] || (_cache[3] = createBaseVNode("span", { style: { "color": "var(--text-faint)", "font-size": "12px" } }, "拖动待办到对应象限", -1)),
          _cache[4] || (_cache[4] = createBaseVNode("div", { style: { "flex": "1" } }, null, -1)),
          unsorted.value.length ? (openBlock(), createElementBlock("span", _hoisted_3$3, " 未分类 " + toDisplayString(unsorted.value.length) + " 条 ", 1)) : createCommentVNode("", true),
          createBaseVNode("button", {
            class: "primary",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(actions).openEditor({ quadrant: 1 }))
          }, "新建")
        ]),
        unsorted.value.length ? (openBlock(), createElementBlock("div", _hoisted_4$3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unsorted.value, (t) => {
            return openBlock(), createElementBlock("div", {
              key: t.id,
              draggable: "true",
              class: "chip",
              style: { "cursor": "grab", "padding": "5px 10px", "font-size": "12px", "flex": "none" },
              onDragstart: (e) => e.dataTransfer.setData("text/todo-id", t.id),
              onClick: ($event) => unref(actions).openEditor(t)
            }, toDisplayString(t.title), 41, _hoisted_5$3);
          }), 128))
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_6$3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(QUADRANTS), (q) => {
            return openBlock(), createElementBlock("div", {
              key: q.id,
              class: normalizeClass(["quad", { drop: dragOver.value === q.id }]),
              onDragover: withModifiers(($event) => dragOver.value = q.id, ["prevent"]),
              onDragleave: _cache[1] || (_cache[1] = ($event) => dragOver.value = 0),
              onDrop: (e) => onDrop(e, q.id),
              onContextmenu: withModifiers(($event) => unref(actions).openEditor({ quadrant: q.id }), ["prevent"])
            }, [
              createBaseVNode("div", _hoisted_8$3, [
                createBaseVNode("span", {
                  class: "dot",
                  style: normalizeStyle({ background: q.color })
                }, null, 4),
                createBaseVNode("span", _hoisted_9$3, toDisplayString(q.name), 1),
                createBaseVNode("span", _hoisted_10$3, toDisplayString(q.hint), 1),
                createBaseVNode("span", _hoisted_11$3, toDisplayString(rowsOf(q.id).length), 1)
              ]),
              createBaseVNode("div", _hoisted_12$3, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(rowsOf(q.id), (t) => {
                  return openBlock(), createBlock(_sfc_main$8, {
                    key: t.id,
                    todo: t,
                    "show-date": "",
                    draggable: "",
                    timer: ""
                  }, null, 8, ["todo"]);
                }), 128)),
                !rowsOf(q.id).length ? (openBlock(), createElementBlock("div", _hoisted_13$3, " 把待办拖进来 ")) : createCommentVNode("", true)
              ])
            ], 42, _hoisted_7$3);
          }), 128))
        ])
      ]);
    };
  }
};
const _hoisted_1$4 = { class: "main exp" };
const _hoisted_2$4 = { class: "toolbar" };
const _hoisted_3$2 = ["value"];
const _hoisted_4$2 = ["value"];
const _hoisted_5$2 = {
  key: 1,
  style: { "color": "var(--text-faint)", "font-size": "12px" }
};
const _hoisted_6$2 = {
  class: "exp-range-pick",
  title: "任意起止日期，跨月跨年都行"
};
const _hoisted_7$2 = ["value"];
const _hoisted_8$2 = ["value"];
const _hoisted_9$2 = ["value"];
const _hoisted_10$2 = ["disabled"];
const _hoisted_11$2 = { value: "" };
const _hoisted_12$2 = { value: "selection" };
const _hoisted_13$2 = { value: "all" };
const _hoisted_14$1 = { class: "exp-month" };
const _hoisted_15$1 = {
  key: 0,
  class: "exp-onboard"
};
const _hoisted_16$1 = { class: "exp-body" };
const _hoisted_17$1 = { class: "exp-cal" };
const _hoisted_18$1 = { class: "exp-head" };
const _hoisted_19$1 = { class: "exp-grid" };
const _hoisted_20$1 = ["aria-pressed", "title", "onMousedown", "onMouseenter", "onKeydown"];
const _hoisted_21$1 = { class: "exp-cell-head" };
const _hoisted_22$1 = { class: "n" };
const _hoisted_23$1 = ["title"];
const _hoisted_24 = {
  key: 0,
  class: "exp-cell-sum"
};
const _hoisted_25 = {
  key: 1,
  class: "exp-cell-mix"
};
const _hoisted_26 = { class: "exp-monthbar" };
const _hoisted_27 = { class: "cogs" };
const _hoisted_28 = { class: "dim" };
const _hoisted_29 = {
  key: 0,
  class: "exp-side"
};
const _hoisted_30 = { class: "exp-side-head" };
const _hoisted_31 = { class: "exp-range" };
const _hoisted_32 = { class: "exp-range-span" };
const _hoisted_33 = { class: "exp-range-heads" };
const _hoisted_34 = { class: "big" };
const _hoisted_35 = { class: "big cogs" };
const _hoisted_36 = { class: "exp-range-list" };
const _hoisted_37 = { class: "label" };
const _hoisted_38 = {
  key: 0,
  class: "track"
};
const _hoisted_39 = {
  key: 1,
  class: "track sep"
};
const _hoisted_40 = { class: "amt" };
const _hoisted_41 = { class: "share" };
const _hoisted_42 = { class: "exp-range-hint" };
const _hoisted_43 = {
  key: 1,
  class: "exp-side"
};
const _hoisted_44 = { class: "exp-side-head" };
const _hoisted_45 = {
  key: 0,
  class: "tag"
};
const _hoisted_46 = { class: "dim" };
const _hoisted_47 = { class: "exp-add" };
const _hoisted_48 = { class: "exp-cats" };
const _hoisted_49 = ["aria-pressed", "onClick"];
const _hoisted_50 = { class: "exp-add-row" };
const _hoisted_51 = ["placeholder"];
const _hoisted_52 = {
  key: 0,
  class: "exp-flash"
};
const _hoisted_53 = { class: "exp-list" };
const _hoisted_54 = { class: "cat" };
const _hoisted_55 = ["title"];
const _hoisted_56 = {
  key: 1,
  class: "note"
};
const _hoisted_57 = { class: "amt" };
const _hoisted_58 = ["title"];
const _hoisted_59 = ["aria-label", "onClick"];
const _hoisted_60 = {
  key: 0,
  class: "exp-empty"
};
const _hoisted_61 = { class: "cat-dlg-rows" };
const _hoisted_62 = { class: "grp" };
const _hoisted_63 = ["onUpdate:modelValue", "maxlength", "placeholder", "aria-label", "disabled"];
const _hoisted_64 = {
  class: "short",
  title: "小组件按钮上显示的简称，取名称前两个字"
};
const _hoisted_65 = ["onClick"];
const _hoisted_66 = { class: "cat-dlg-acts" };
const _cat_add_input_props = ["onUpdate:modelValue", "maxlength"];
const _cat_add_button_props = ["disabled"];
const _cat_manage_action_props = ["disabled", "onClick"];
const _hoisted_67 = { class: "exp-sum" };
const _hoisted_68 = { class: "exp-card heads" };
const _hoisted_69 = { class: "exp-card-head" };
const _hoisted_70 = {
  key: 0,
  class: "tag"
};
const _hoisted_71 = { class: "big" };
const _hoisted_72 = { class: "vs" };
const _hoisted_73 = { class: "big cogs" };
const _hoisted_74 = { class: "vs" };
const _hoisted_75 = { class: "exp-card" };
const _hoisted_76 = { class: "exp-rank" };
const _hoisted_77 = { class: "label" };
const _hoisted_78 = { class: "track" };
const _hoisted_79 = { class: "amt" };
const _hoisted_80 = { class: "share" };
const _hoisted_81 = { class: "exp-card" };
const _hoisted_82 = { class: "exp-trend" };
const _hoisted_83 = { class: "exp-trend-row" };
const _hoisted_84 = { class: "cap" };
const _hoisted_85 = ["viewBox"];
const _hoisted_86 = ["x", "y", "width", "height"];
const _hoisted_87 = { class: "exp-trend-row" };
const _hoisted_88 = { class: "cap" };
const _hoisted_89 = ["viewBox"];
const _hoisted_90 = ["x", "y", "width", "height"];
const _hoisted_91 = { class: "exp-trend-axis" };
const TREND_PERIODS = 12;
const TREND_VB_W = 120;
const TREND_VB_H = 34;
const TREND_SLOT = 10;
const TREND_BAR_W = 7;
const _sfc_main$4 = {
  __name: "ExpenseView",
  setup(__props) {
    const pickedGoalId = computed({
      get: () => state.expenseGoalId,
      set: (id) => {
        state.expenseGoalId = id;
      }
    });
    const goal = computed(
      () => ledgerGoals.value.find((g) => g.id === pickedGoalId.value) || ledgerGoals.value[0] || null
    );
    watch(
      goal,
      (current) => {
        if (current && pickedGoalId.value !== current.id) pickedGoalId.value = current.id;
      },
      { immediate: true }
    );
    const period = computed(() => goal.value?.period || "month");
    const unit = computed(() => goal.value?.unit || "元");
    const cats = computed(() => catsOf(goal.value));
    const activeCats = computed(() => cats.value.filter((c) => !c.archivedAt));
    const opexCats = computed(() => cats.value.filter((c) => c.group === "opex"));
    const nonCogsCats = computed(() => cats.value.filter((c) => c.group !== "cogs"));
    const catById = computed(() => new Map(cats.value.map((c) => [c.id, c])));
    const catName = (id) => catById.value.get(id)?.name || "未知";
    const cogsName = computed(() => cogsLabel(goal.value));
    const rows = computed(() => goal.value ? expensesOfGoal(goal.value.id) : []);
    const byDate = computed(() => groupByDate(rows.value));
    const weekStart = computed(() => state.settings?.weekStart ?? 1);
    const headers = computed(() => weekdayLabels(weekStart.value));
    const cells = computed(() => monthGrid(state.cursor, weekStart.value));
    const monthTitle = computed(() => {
      const [y, m] = state.cursor.split("-");
      return `${y} 年 ${Number(m)} 月`;
    });
    const monthDays = computed(() => {
      const out = /* @__PURE__ */ new Map();
      let maxNonCogs = 0;
      for (const date of cells.value) {
        const sum = summarize(byDate.value.get(date) || [], goal.value);
        out.set(date, sum);
        if (isSameMonth(date, state.cursor)) maxNonCogs = Math.max(maxNonCogs, sum.opex + sum.unclassified);
      }
      return { map: out, maxNonCogs };
    });
    const dayOf = (date) => monthDays.value.map.get(date) || summarize([], goal.value);
    function heat(date) {
      const max = monthDays.value.maxNonCogs;
      const sum = dayOf(date);
      const v = sum.opex + sum.unclassified;
      if (!max || v <= 0) return 0;
      return Math.sqrt(v / max);
    }
    function composition(date) {
      const sum = dayOf(date);
      const nonCogs = sum.opex + sum.unclassified;
      if (!nonCogs) return [];
      return nonCogsCats.value.map((c) => ({
        id: c.id,
        color: c.color,
        pct: sum.byCat[c.id] / nonCogs * 100
      })).filter((s) => s.pct > 0);
    }
    const monthSum = computed(
      () => summarize(rows.value.filter((e) => isSameMonth(e.date, state.cursor)), goal.value)
    );
    const periodKey = computed(() => periodKeyOfYmd(period.value, state.cursor));
    const isCurrentPeriod = computed(() => periodKey.value === periodKeyOfYmd(period.value, todayYmd()));
    const periodBuckets = computed(() => groupByPeriod(rows.value, period.value));
    const curSum = computed(() => summarize(periodBuckets.value.get(periodKey.value) || [], goal.value));
    const prevSum = computed(() => {
      const prevKey = periodKeyOfYmd(period.value, stepPeriod(period.value, state.cursor, -1));
      return summarize(periodBuckets.value.get(prevKey) || [], goal.value);
    });
    const opexVs = computed(() => compareWithPrev(curSum.value.opex, prevSum.value.opex));
    const cogsVs = computed(() => compareWithPrev(curSum.value.cogs, prevSum.value.cogs));
    const ranking = computed(
      () => opexRanking(curSum.value, { includeZero: true, goal: goal.value })
    );
    function bar(value, max, index) {
      const h = value > 0 ? Math.max(2, Math.abs(value) / max * TREND_VB_H) : 1;
      return {
        x: index * TREND_SLOT + (TREND_SLOT - TREND_BAR_W) / 2,
        y: TREND_VB_H - h,
        w: TREND_BAR_W,
        h
      };
    }
    const trend = computed(() => {
      const series = periodSeries(rows.value, period.value, TREND_PERIODS, state.cursor, goal.value);
      const maxOpex = Math.max(0, ...series.map((s) => s.opex));
      const maxCogs = Math.max(0, ...series.map((s) => s.cogs));
      const maxUnclassified = Math.max(0, ...series.map((s) => s.unclassified));
      const divOpex = maxOpex || 1;
      const divCogs = maxCogs || 1;
      const divUnclassified = maxUnclassified || 1;
      return {
        maxOpex,
        maxCogs,
        maxUnclassified,
        rows: series.map((s, i) => ({
          ...s,
          label: periodShortLabel(period.value, s.key),
          now: s.key === periodKey.value,
          opexBar: bar(s.opex, divOpex, i),
          cogsBar: bar(s.cogs, divCogs, i),
          unclassifiedBar: bar(s.unclassified, divUnclassified, i)
        }))
      };
    });
    const picked = ref(/* @__PURE__ */ new Set([state.selected]));
    watch(
      () => state.expenseOpenRequest,
      (request) => {
        if (!request) return;
        const day = normalizeYmd(request.date);
        if (!day) return;
        if (request.goalId) pickedGoalId.value = request.goalId;
        state.cursor = day;
        state.selected = day;
        picked.value = /* @__PURE__ */ new Set([day]);
      },
      { immediate: true }
    );
    const dragging = ref(false);
    const dragAnchor = ref(null);
    const dragBase = ref(/* @__PURE__ */ new Set());
    const dragMoved = ref(false);
    const dragToggleOff = ref(false);
    const pickedCount = computed(() => picked.value.size);
    const isRangeMode = computed(() => pickedCount.value > 1);
    function applyDrag(to) {
      const a = dragAnchor.value;
      if (!a || !to) return;
      const [from, till] = a <= to ? [a, to] : [to, a];
      const next = new Set(dragBase.value);
      let d = from;
      for (let i = 0; i < 800 && d <= till; i++) {
        next.add(d);
        d = addDays(d, 1);
      }
      picked.value = next;
    }
    function onCellDown(event, date) {
      if (event.button !== 0) return;
      const additive = event.ctrlKey || event.metaKey;
      dragAnchor.value = date;
      dragMoved.value = false;
      dragBase.value = additive ? new Set(picked.value) : /* @__PURE__ */ new Set();
      dragToggleOff.value = additive && picked.value.has(date);
      dragging.value = true;
      applyDrag(date);
    }
    function onCellEnter(date) {
      if (!dragging.value) return;
      if (date !== dragAnchor.value) dragMoved.value = true;
      applyDrag(date);
    }
    function onCellKeydown(event, date) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      picked.value = /* @__PURE__ */ new Set([date]);
      state.selected = date;
      state.cursor = date;
    }
    function endDrag() {
      if (!dragging.value) return;
      dragging.value = false;
      if (!dragMoved.value && dragToggleOff.value) {
        const next = new Set(picked.value);
        next.delete(dragAnchor.value);
        picked.value = next;
      }
      if (picked.value.size === 1) state.selected = [...picked.value][0];
    }
    function clearPick() {
      const today2 = todayYmd();
      const day = isSameMonth(today2, state.cursor) ? today2 : `${state.cursor.slice(0, 7)}-01`;
      state.selected = day;
      picked.value = /* @__PURE__ */ new Set([day]);
    }
    const rangeFrom = computed(() => picked.value.size ? [...picked.value].sort()[0] : "");
    const rangeTo = computed(
      () => picked.value.size ? [...picked.value].sort().slice(-1)[0] : ""
    );
    function setRange(from, to) {
      const a = normalizeYmd(from);
      const b = normalizeYmd(to);
      if (!a || !b) return;
      const [s, e] = a <= b ? [a, b] : [b, a];
      const next = /* @__PURE__ */ new Set();
      let d = s;
      for (let i = 0; i < 4200 && d <= e; i++) {
        next.add(d);
        d = addDays(d, 1);
      }
      if (!next.size) return;
      picked.value = next;
      state.cursor = s;
      if (next.size === 1) state.selected = s;
    }
    const RANGE_PRESETS = [
      { id: "thisMonth", name: "本月" },
      { id: "lastMonth", name: "上月" },
      { id: "thisQuarter", name: "本季度" },
      { id: "thisYear", name: "今年" },
      { id: "last30", name: "最近 30 天" }
    ];
    function applyPreset(id) {
      const today2 = todayYmd();
      if (id === "last30") return setRange(addDays(today2, -29), today2);
      if (id === "lastMonth") {
        const [s2, e2] = periodBounds("month", `${addDays(`${today2.slice(0, 7)}-01`, -1)}`);
        return setRange(s2, e2);
      }
      const period2 = { thisMonth: "month", thisQuarter: "quarter", thisYear: "year" }[id];
      if (!period2) return;
      const [s, e] = periodBounds(period2, today2);
      setRange(s, e);
    }
    const pickedLabel = computed(() => {
      const days = [...picked.value].sort();
      if (!days.length) return "";
      if (days.length === 1) return days[0];
      const span = Math.round((new Date(days[days.length - 1]) - new Date(days[0])) / 864e5) + 1;
      const short = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
      const head = `${short(days[0])} – ${short(days[days.length - 1])}`;
      return span === days.length ? head : `${head}（跳选 ${days.length} 天）`;
    });
    const pickedRows = computed(() => picked.value.size ? rows.value.filter((e) => picked.value.has(e.date)) : []);
    const pickedSum = computed(() => summarize(pickedRows.value, goal.value));
    const exporting = ref(false);
    const exportMessage = ref("");
    let exportMessageTimer = null;
    const exportLabel = computed(() => {
      if (exporting.value) return "正在导出…";
      return exportMessage.value || "导出 Excel";
    });
    async function exportExcel(scope) {
      if (!goal.value || !["selection", "all"].includes(scope)) return;
      const count = scope === "all" ? rows.value.length : pickedRows.value.length;
      if (!count) {
        await alertDialog(scope === "all" ? "当前台账没有可导出的历史记录。" : "所选日期没有费用明细。");
        return;
      }
      exporting.value = true;
      try {
        const result = await actions.exportExpensesExcel({
          goalId: goal.value.id,
          scope,
          dates: scope === "selection" ? [...picked.value].sort() : []
        });
        if (result?.canceled) return;
        if (!result?.ok) {
          await alertDialog(result?.reason || "导出失败，请稍后重试。");
          return;
        }
        exportMessage.value = `已导出 ${result.count} 笔`;
        clearTimeout(exportMessageTimer);
        exportMessageTimer = setTimeout(() => exportMessage.value = "", 3200);
      } catch (error) {
        await alertDialog(`导出失败：${error?.message || "未知错误"}`);
      } finally {
        exporting.value = false;
      }
    }
    const catForm = ref(null);
    const categoryUsage = (id) => {
      const entries = rows.value.filter((entry) => entry.cat === id);
      const amount = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      return { count: entries.length, amount };
    };
    function openCatForm() {
      if (!goal.value) return;
      const names = /* @__PURE__ */ Object.create(null);
      for (const c of cats.value) names[c.id] = c.name;
      catForm.value = { names, newName: "", busy: false, error: "" };
      nextTick(() => document.querySelector(".cat-dlg-add input")?.focus());
    }
    function closeCatForm() {
      if (catForm.value?.busy) return;
      catForm.value = null;
      nextTick(() => document.querySelector(".exp-cat-btn")?.focus());
    }
    function onCatDialogKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCatForm();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = event.currentTarget;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(
        (element) => element.getClientRects().length > 0
      );
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    function categoryError(reason) {
      if (catForm.value) catForm.value.error = String(reason || "操作失败，请稍后重试。");
    }
    async function saveCatForm() {
      if (!goal.value || !catForm.value || catForm.value.busy) return;
      catForm.value.busy = true;
      catForm.value.error = "";
      try {
        for (const c of cats.value) {
          const nextName = catForm.value.names[c.id];
          if (String(nextName ?? "") === c.name) continue;
          const result = await actions.renameExpenseCategory(goal.value.id, c.id, nextName);
          if (!result?.ok) {
            categoryError(result?.reason);
            return;
          }
        }
        catForm.value.busy = false;
        closeCatForm();
      } catch (error) {
        categoryError(error?.message);
      } finally {
        if (catForm.value) catForm.value.busy = false;
      }
    }
    async function addCategoryFromForm() {
      if (!goal.value || !catForm.value || catForm.value.busy) return;
      catForm.value.busy = true;
      catForm.value.error = "";
      try {
        const result = await actions.addExpenseCategory(goal.value.id, { name: catForm.value.newName });
        if (!result?.ok) return categoryError(result?.reason);
        catForm.value.names[result.category.id] = result.category.name;
        catForm.value.newName = "";
      } catch (error) {
        categoryError(error?.message);
      } finally {
        if (catForm.value) catForm.value.busy = false;
      }
    }
    async function archiveCategoryFromForm(category) {
      if (!goal.value || !catForm.value || catForm.value.busy) return;
      const usage = categoryUsage(category.id);
      const detail = usage.count ? `\n\n已有 ${usage.count} 笔、合计 ${formatGoalNumber(usage.amount)}${unit.value}。历史记录和导出都会继续保留。` : "\n\n这个类别还没有记账记录。";
      const ok = await confirmDialog(`删除“${category.name}”分类按钮？${detail}\n\n删除后不会出现在记账分类按钮中，需要时可以在这里恢复。`, { okText: "删除" });
      if (!ok || !catForm.value) return;
      catForm.value.busy = true;
      catForm.value.error = "";
      try {
        const result = await actions.archiveExpenseCategory(goal.value.id, category.id);
        if (!result?.ok) return categoryError(result?.reason);
      } catch (error) {
        categoryError(error?.message);
      } finally {
        if (catForm.value) catForm.value.busy = false;
      }
    }
    async function restoreCategoryFromForm(category) {
      if (!goal.value || !catForm.value || catForm.value.busy) return;
      catForm.value.busy = true;
      catForm.value.error = "";
      try {
        const result = await actions.restoreExpenseCategory(goal.value.id, category.id);
        if (!result?.ok) return categoryError(result?.reason);
      } catch (error) {
        categoryError(error?.message);
      } finally {
        if (catForm.value) catForm.value.busy = false;
      }
    }
    const resetCatName = (id) => {
      if (!catForm.value) return;
      const fallback = EXPENSE_CATS.find((c) => c.id === id)?.name;
      if (fallback) catForm.value.names[id] = fallback;
    };
    const pickedBreakdown = computed(() => {
      const opexMax = Math.max(
        1,
        ...opexCats.value.map((c) => Math.abs(pickedSum.value.byCat[c.id] || 0))
      );
      return cats.value.map((c) => {
        const amount = pickedSum.value.byCat[c.id] || 0;
        const base = c.group === "cogs" ? pickedSum.value.cogs : c.group === "unclassified" ? pickedSum.value.unclassified : pickedSum.value.opex;
        return {
          ...c,
          amount,
          // 期间费用类别按内部最大值比长短；货款与遗留数据各自单列，不跟它们同尺
          width: c.group !== "opex" ? 0 : amount === 0 ? 0 : Math.max(2, Math.round(Math.abs(amount) / opexMax * 100)),
          share: base ? Math.round(amount / base * 100) : 0
        };
      });
    });
    onMounted(() => window.addEventListener("mouseup", endDrag));
    onUnmounted(() => window.removeEventListener("mouseup", endDrag));
    const dayRows = computed(
      () => [...byDate.value.get(state.selected) || []].sort((a, b) => (b.at || 0) - (a.at || 0))
    );
    const daySum = computed(() => summarize(dayRows.value, goal.value));
    function loggedAt(entry) {
      if (!entry.at) return null;
      const d = new Date(entry.at);
      const p2 = (n) => String(n).padStart(2, "0");
      const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
      const day = ymdOf(d);
      if (day === entry.date) return { text: hm, late: false };
      return { text: `${Number(day.slice(5, 7))}/${Number(day.slice(8))} ${hm} 补`, late: true };
    }
    async function removeEntry(entry) {
      const ok = await confirmDialog(
        `删除这一笔？

${entry.date}　${catName(entry.cat)}　${formatGoalNumber(entry.amount)}${unit.value}${entry.note ? `
备注：${entry.note}` : ""}`,
        { okText: "删除" }
      );
      if (!ok) return;
      await actions.removeExpense(entry.id);
    }
    const firstActiveCategory = () => activeCats.value.find((c) => c.group === "opex")?.id || activeCats.value[0]?.id || "";
    const draft = ref({ cat: firstActiveCategory(), amount: "", note: "" });
    const amountEl = ref(null);
    const flash = ref("");
    const canSubmit = computed(() => Boolean(draft.value.cat) && Number.isFinite(Number(draft.value.amount)) && Number(draft.value.amount) !== 0);
    let flashTimer = null;
    async function pickCat(catId) {
      draft.value.cat = catId;
      await nextTick();
      amountEl.value?.focus();
    }
    async function submit() {
      if (!goal.value) return;
      const amount = Number(draft.value.amount);
      if (!draft.value.cat || !Number.isFinite(amount) || amount === 0) return;
      const entry = await actions.addExpense({
        goalId: goal.value.id,
        cat: draft.value.cat,
        amount,
        note: draft.value.note,
        date: state.selected
      });
      if (!entry) return;
      flash.value = `${catName(entry.cat)} ${formatGoalNumber(entry.amount)} 已记入 ${entry.date}`;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => flash.value = "", 2400);
      draft.value.amount = "";
      draft.value.note = "";
      await nextTick();
      amountEl.value?.focus();
    }
    function today() {
      state.cursor = todayYmd();
      state.selected = todayYmd();
    }
    async function createLedger() {
      const created = await actions.createGoal({
        name: "费用台账",
        mode: "ledger",
        period: "month",
        unit: "元"
      });
      if (created) pickedGoalId.value = created.id;
    }
    watch(
      () => state.cursor,
      (cursor) => {
        if (isRangeMode.value) return;
        if (!isSameMonth(state.selected, cursor)) {
          state.selected = `${cursor.slice(0, 7)}-01`;
          picked.value = /* @__PURE__ */ new Set([state.selected]);
        }
      }
    );
    watch(
      () => state.selected,
      (day) => {
        if (!isRangeMode.value) picked.value = /* @__PURE__ */ new Set([day]);
      }
    );
    watch(
      activeCats,
      (available) => {
        if (!available.some((c) => c.id === draft.value.cat)) draft.value.cat = firstActiveCategory();
      },
      { deep: true }
    );
    onUnmounted(() => {
      clearTimeout(flashTimer);
      clearTimeout(exportMessageTimer);
    });
    const vsText = (vs) => {
      if (vs.pct === null) return "上期无记录";
      if (!vs.diff) return "与上期持平";
      const dir = vs.diff > 0 ? "▲" : "▼";
      return `较上期 ${dir} ${Math.abs(vs.pct)}%　${formatGoalNumber(Math.abs(vs.diff))}`;
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        createBaseVNode("div", _hoisted_2$4, [
          _cache[14] || (_cache[14] = createBaseVNode("h2", null, "费用", -1)),
          goal.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            unref(ledgerGoals).length > 1 ? (openBlock(), createElementBlock("select", {
              key: 0,
              class: "exp-pick",
              value: goal.value.id,
              onChange: _cache[0] || (_cache[0] = ($event) => pickedGoalId.value = $event.target.value)
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(ledgerGoals), (g) => {
                return openBlock(), createElementBlock("option", {
                  key: g.id,
                  value: g.id
                }, toDisplayString(g.name), 9, _hoisted_4$2);
              }), 128))
            ], 40, _hoisted_3$2)) : (openBlock(), createElementBlock("span", _hoisted_5$2, toDisplayString(goal.value.name), 1)),
            createBaseVNode("div", _hoisted_6$2, [
              createBaseVNode("select", {
                class: "exp-preset",
                title: "快速选择日期",
                "aria-label": "快速选择日期",
                onChange: _cache[1] || (_cache[1] = ($event) => {
                  applyPreset($event.target.value);
                  $event.target.value = "";
                })
              }, [
                _cache[12] || (_cache[12] = createBaseVNode("option", { value: "" }, "快速选择日期", -1)),
                (openBlock(), createElementBlock(Fragment, null, renderList(RANGE_PRESETS, (p) => {
                  return createBaseVNode("option", {
                    key: p.id,
                    value: p.id
                  }, toDisplayString(p.name), 9, _hoisted_7$2);
                }), 64))
              ], 32),
              createBaseVNode("input", {
                class: "exp-date",
                type: "date",
                "aria-label": "起始日期",
                value: rangeFrom.value,
                onChange: _cache[2] || (_cache[2] = ($event) => setRange($event.target.value, rangeTo.value))
              }, null, 40, _hoisted_8$2),
              _cache[13] || (_cache[13] = createBaseVNode("span", { class: "sep" }, "–", -1)),
              createBaseVNode("input", {
                class: "exp-date",
                type: "date",
                "aria-label": "结束日期",
                value: rangeTo.value,
                onChange: _cache[3] || (_cache[3] = ($event) => setRange(rangeFrom.value, $event.target.value))
              }, null, 40, _hoisted_9$2),
              isRangeMode.value ? (openBlock(), createElementBlock("button", {
                key: 0,
                class: "ghost",
                title: "回到单日",
                onClick: clearPick
              }, "×")) : createCommentVNode("", true)
            ]),
            createBaseVNode("select", {
              class: "exp-export",
              disabled: exporting.value,
              title: "导出标准 Excel 对账工作簿：可按当前所选日期，或导出本台账全部历史",
              onChange: _cache[4] || (_cache[4] = ($event) => {
                exportExcel($event.target.value);
                $event.target.value = "";
              })
            }, [
              createBaseVNode("option", _hoisted_11$2, toDisplayString(exportLabel.value), 1),
              createBaseVNode("option", _hoisted_12$2, "所选日期（" + toDisplayString(pickedRows.value.length) + " 笔）", 1),
              createBaseVNode("option", _hoisted_13$2, "全部历史（" + toDisplayString(rows.value.length) + " 笔）", 1)
            ], 40, _hoisted_10$2),
            createBaseVNode("button", {
              class: "ghost",
              title: "上个月",
              onClick: _cache[5] || (_cache[5] = ($event) => unref(state).cursor = unref(addMonths)(unref(state).cursor, -1))
            }, [
              createVNode(_sfc_main$b, {
                name: "left",
                size: 14
              })
            ]),
            createBaseVNode("span", _hoisted_14$1, toDisplayString(monthTitle.value), 1),
            createBaseVNode("button", {
              class: "ghost",
              title: "下个月",
              onClick: _cache[6] || (_cache[6] = ($event) => unref(state).cursor = unref(addMonths)(unref(state).cursor, 1))
            }, [
              createVNode(_sfc_main$b, {
                name: "right",
                size: 14
              })
            ]),
            createBaseVNode("button", {
              class: "ghost",
              onClick: today
            }, "今天")
          ], 64)) : createCommentVNode("", true)
        ]),
        !goal.value ? (openBlock(), createElementBlock("div", _hoisted_15$1, [
          createVNode(_sfc_main$b, {
            name: "wallet",
            size: 34
          }),
          _cache[15] || (_cache[15] = createBaseVNode("p", null, "还没有费用台账。", -1)),
          _cache[16] || (_cache[16] = createBaseVNode("p", { class: "dim" }, [
            createTextVNode(" 按天记录费用，并按自己的习惯新增、改名或停用期间费用类别。"),
            createBaseVNode("br"),
            createTextVNode(" 数据只保存在本机；建好后也能从桌面小组件快速记账。 ")
          ], -1)),
          createBaseVNode("button", {
            class: "primary",
            onClick: createLedger
          }, "新建费用台账")
        ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createBaseVNode("div", _hoisted_16$1, [
            createBaseVNode("div", _hoisted_17$1, [
              createBaseVNode("div", _hoisted_18$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(headers.value, (h, i) => {
                  return openBlock(), createElementBlock("div", {
                    key: h,
                    class: normalizeClass({ we: i >= 5 })
                  }, toDisplayString(h), 3);
                }), 128))
              ]),
              createBaseVNode("div", _hoisted_19$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(cells.value, (date) => {
                  return openBlock(), createElementBlock("div", {
                    key: date,
                    class: normalizeClass(["exp-cell", {
                      out: !unref(isSameMonth)(date, unref(state).cursor),
                      today: date === unref(todayYmd)(),
                      on: picked.value.has(date)
                    }]),
                    role: "button",
                    tabindex: "0",
                    "aria-pressed": picked.value.has(date),
                    style: normalizeStyle({ "--heat": heat(date) }),
                    title: `${date}　期间费用 ${unref(formatGoalNumber)(dayOf(date).opex)}${unit.value}　遗留/未分类 ${unref(formatGoalNumber)(dayOf(date).unclassified)}${unit.value}　${cogsName.value} ${unref(formatGoalNumber)(dayOf(date).cogs)}${unit.value}
拖动可选一段，按住 Ctrl 单独加减某天`,
                    onMousedown: ($event) => onCellDown($event, date),
                    onMouseenter: ($event) => onCellEnter(date),
                    onKeydown: ($event) => onCellKeydown($event, date)
                  }, [
                    createBaseVNode("div", _hoisted_21$1, [
                      createBaseVNode("span", _hoisted_22$1, toDisplayString(Number(date.slice(8))), 1),
                      dayOf(date).cogs ? (openBlock(), createElementBlock("span", {
                        key: 0,
                        class: "cogs-dot",
                        title: `当天有${cogsName.value}`
                      }, null, 8, _hoisted_23$1)) : createCommentVNode("", true)
                    ]),
                    dayOf(date).opex || dayOf(date).unclassified ? (openBlock(), createElementBlock("div", {
                      class: normalizeClass(["exp-cell-sum", { legacy: !dayOf(date).opex && dayOf(date).unclassified }])
                    }, toDisplayString(unref(formatGoalNumber)(dayOf(date).opex + dayOf(date).unclassified)), 3)) : createCommentVNode("", true),
                    _cache[17] || (_cache[17] = createBaseVNode("div", { class: "exp-cell-fill" }, null, -1)),
                    composition(date).length ? (openBlock(), createElementBlock("div", _hoisted_25, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(composition(date), (s) => {
                        return openBlock(), createElementBlock("i", {
                          key: s.id,
                          style: normalizeStyle({ width: s.pct + "%", background: s.color })
                        }, null, 4);
                      }), 128))
                    ])) : createCommentVNode("", true)
                  ], 46, _hoisted_20$1);
                }), 128))
              ]),
              createBaseVNode("div", _hoisted_26, [
                _cache[18] || (_cache[18] = createBaseVNode("span", null, "本月合计", -1)),
                createBaseVNode("b", null, "费用 " + toDisplayString(unref(formatGoalNumber)(monthSum.value.opex)) + toDisplayString(unit.value), 1),
                monthSum.value.unclassified ? (openBlock(), createElementBlock("b", {
                  key: 0,
                  class: "legacy"
                }, "遗留/未分类 " + toDisplayString(unref(formatGoalNumber)(monthSum.value.unclassified)) + toDisplayString(unit.value), 1)) : createCommentVNode("", true),
                createBaseVNode("b", _hoisted_27, toDisplayString(cogsName.value) + " " + toDisplayString(unref(formatGoalNumber)(monthSum.value.cogs)) + toDisplayString(unit.value), 1),
                createBaseVNode("span", _hoisted_28, toDisplayString(monthSum.value.count) + " 笔", 1)
              ])
            ]),
            isRangeMode.value ? (openBlock(), createElementBlock("aside", _hoisted_29, [
              createBaseVNode("div", _hoisted_30, [
                createBaseVNode("b", null, "已选 " + toDisplayString(pickedCount.value) + " 天", 1),
                _cache[19] || (_cache[19] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
                createBaseVNode("button", {
                  class: "ghost",
                  title: "回到单日模式",
                  onClick: clearPick
                }, "清除")
              ]),
              createBaseVNode("div", _hoisted_31, [
                createBaseVNode("div", _hoisted_32, toDisplayString(pickedLabel.value) + "　·　" + toDisplayString(pickedSum.value.count) + " 笔", 1),
                createBaseVNode("div", _hoisted_33, [
                  createBaseVNode("div", _hoisted_34, [
                    _cache[20] || (_cache[20] = createBaseVNode("i", null, "期间费用", -1)),
                    createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(pickedSum.value.opex)), 1),
                    createBaseVNode("em", null, toDisplayString(unit.value), 1)
                  ]),
                  createBaseVNode("div", _hoisted_35, [
                    createBaseVNode("i", null, toDisplayString(cogsName.value), 1),
                    createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(pickedSum.value.cogs)), 1),
                    createBaseVNode("em", null, toDisplayString(unit.value), 1)
                  ]),
                  pickedSum.value.unclassified ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: "big legacy"
                  }, [
                    createBaseVNode("i", null, "遗留/未分类"),
                    createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(pickedSum.value.unclassified)), 1),
                    createBaseVNode("em", null, toDisplayString(unit.value), 1)
                  ])) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_36, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(pickedBreakdown.value, (r) => {
                    return openBlock(), createElementBlock("div", {
                      key: r.id,
                      class: normalizeClass(["exp-range-row", { cogs: r.group === "cogs", legacy: r.group === "unclassified", zero: !r.amount }])
                    }, [
                      createBaseVNode("span", _hoisted_37, [
                        createBaseVNode("i", {
                          style: normalizeStyle({ background: r.color })
                        }, null, 4),
                        createTextVNode(toDisplayString(r.name), 1)
                      ]),
                      r.group === "opex" ? (openBlock(), createElementBlock("span", _hoisted_38, [
                        createBaseVNode("b", {
                          style: normalizeStyle({ width: r.width + "%", background: r.color })
                        }, null, 4)
                      ])) : (openBlock(), createElementBlock("span", _hoisted_39)),
                      createBaseVNode("span", _hoisted_40, toDisplayString(unref(formatGoalNumber)(r.amount)), 1),
                      createBaseVNode("span", _hoisted_41, toDisplayString(r.share) + "%", 1)
                    ], 2);
                  }), 128))
                ]),
                createBaseVNode("div", _hoisted_42, " 各期间费用类别按同一比例尺展示；遗留/未分类与" + toDisplayString(cogsName.value) + "各自单列，比例分别按本档计算。 ", 1)
              ])
            ])) : (openBlock(), createElementBlock("aside", _hoisted_43, [
              createBaseVNode("div", _hoisted_44, [
                createBaseVNode("b", null, toDisplayString(unref(state).selected), 1),
                unref(state).selected === unref(todayYmd)() ? (openBlock(), createElementBlock("span", _hoisted_45, "今天")) : createCommentVNode("", true),
                _cache[21] || (_cache[21] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
                createBaseVNode("span", _hoisted_46, toDisplayString(unref(formatGoalNumber)(daySum.value.total)) + toDisplayString(unit.value) + " · " + toDisplayString(daySum.value.count) + " 笔 ", 1)
              ]),
              createBaseVNode("div", _hoisted_47, [
                createBaseVNode("div", { class: "exp-add-head" }, [
                  createBaseVNode("span", { class: "exp-add-title" }, "记一笔"),
                  createBaseVNode("span", { class: "exp-add-date" }, toDisplayString(unref(state).selected), 1),
                  createBaseVNode("button", {
                    type: "button",
                    class: "ghost exp-cat-btn exp-cat-btn-inline",
                    title: "新增、删除或修改下方费用分类按钮",
                    "aria-label": "编辑费用分类按钮",
                    onClick: openCatForm
                  }, "编辑费用分类")
                ]),
                createBaseVNode("div", _hoisted_48, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(activeCats.value, (c) => {
                    return openBlock(), createElementBlock("button", {
                      key: c.id,
                      type: "button",
                      class: normalizeClass(["exp-cat", { on: draft.value.cat === c.id, cogs: c.group === "cogs" }]),
                      style: normalizeStyle({ "--cc": c.color }),
                      "aria-pressed": draft.value.cat === c.id,
                      onClick: ($event) => pickCat(c.id)
                    }, toDisplayString(c.name), 15, _hoisted_49);
                  }), 128))
                ]),
                createBaseVNode("div", _hoisted_50, [
                  createBaseVNode("div", { class: "exp-money" }, [
                    createBaseVNode("span", { class: "exp-currency", "aria-hidden": "true" }, toDisplayString(unit.value), 1),
                    withDirectives(createBaseVNode("input", {
                      ref_key: "amountEl",
                      ref: amountEl,
                      "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => draft.value.amount = $event),
                      class: "exp-amount",
                      type: "number",
                      step: "any",
                      inputmode: "decimal",
                      "aria-label": `记账金额，单位${unit.value}`,
                      placeholder: "输入金额",
                      onKeyup: withKeys(submit, ["enter"])
                    }, null, 40, _hoisted_51), [
                      [vModelText, draft.value.amount]
                    ])
                  ]),
                  createBaseVNode("button", {
                    type: "button",
                    class: "primary exp-submit",
                    disabled: !canSubmit.value,
                    onClick: submit
                  }, "记账", 8, ["disabled"])
                ]),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => draft.value.note = $event),
                  class: "exp-note",
                  maxlength: "60",
                  placeholder: "备注（选填）"
                }, null, 512), [
                  [vModelText, draft.value.note]
                ]),
                flash.value ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  class: "exp-flash",
                  role: "status",
                  "aria-live": "polite"
                }, toDisplayString(flash.value), 1)) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", _hoisted_53, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(dayRows.value, (e) => {
                  return openBlock(), createElementBlock("div", {
                    key: e.id,
                    class: "exp-item"
                  }, [
                    createBaseVNode("span", {
                      class: "dot",
                      style: normalizeStyle({ background: catById.value.get(e.cat)?.color || "#7f8b9a" })
                    }, null, 4),
                    createBaseVNode("span", _hoisted_54, toDisplayString(catName(e.cat)), 1),
                    e.note ? (openBlock(), createElementBlock("span", {
                      key: 0,
                      class: "note",
                      title: e.note
                    }, toDisplayString(e.note), 9, _hoisted_55)) : (openBlock(), createElementBlock("span", _hoisted_56)),
                    createBaseVNode("span", _hoisted_57, toDisplayString(unref(formatGoalNumber)(e.amount)) + toDisplayString(unit.value), 1),
                    loggedAt(e) ? (openBlock(), createElementBlock("span", {
                      key: 2,
                      class: normalizeClass(["at", { late: loggedAt(e).late }]),
                      title: loggedAt(e).late ? `这笔算在 ${e.date}，实际是登记时间那天补录的` : "登记时间"
                    }, toDisplayString(loggedAt(e).text), 11, _hoisted_58)) : createCommentVNode("", true),
                    createBaseVNode("button", {
                      type: "button",
                      class: "del",
                      title: "删除这一笔",
                      "aria-label": `删除${catName(e.cat)} ${formatGoalNumber(e.amount)}${unit.value}`,
                      onClick: ($event) => removeEntry(e)
                    }, [
                      createVNode(_sfc_main$b, {
                        name: "trash",
                        size: 12
                      })
                    ], 8, _hoisted_59)
                  ]);
                }), 128)),
                !dayRows.value.length ? (openBlock(), createElementBlock("div", _hoisted_60, toDisplayString(unref(state).selected) + " 还没有记录。选个类别，输入金额即可记第一笔。", 1)) : createCommentVNode("", true)
              ])
            ]))
          ]),
          catForm.value ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "cat-mask",
            onClick: _cache[11] || (_cache[11] = withModifiers(closeCatForm, ["self"]))
          }, [
            createBaseVNode("div", {
              class: "cat-dlg",
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": "expense-category-dialog-title",
              tabindex: "-1",
              onKeydown: onCatDialogKeydown
            }, [
              _cache[22] || (_cache[22] = createBaseVNode("div", { id: "expense-category-dialog-title", class: "cat-dlg-head" }, "管理费用分类按钮", -1)),
              _cache[23] || (_cache[23] = createBaseVNode("p", { class: "cat-dlg-tip" }, [
                createTextVNode(" 这里管理的就是“记一笔”区域中的费用分类按钮，可新增、修改名称或删除。"),
                createBaseVNode("br"),
                createBaseVNode("b", null, "删除分类不会删除账目："),
                createTextVNode("旧账、汇总和 Excel 对账仍会保留，需要时可恢复；固定的货款单列不能删除。")
              ], -1)),
              createBaseVNode("div", { class: "cat-dlg-add" }, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": ($event) => catForm.value.newName = $event,
                  class: "cat-dlg-input",
                  maxlength: unref(MAX_CAT_NAME),
                  placeholder: "新增期间费用类别",
                  "aria-label": "新类别名称",
                  disabled: catForm.value.busy,
                  onKeyup: withKeys(addCategoryFromForm, ["enter"])
                }, null, 40, _cat_add_input_props), [
                  [vModelText, catForm.value.newName]
                ]),
                createBaseVNode("button", {
                  type: "button",
                  class: "primary",
                  disabled: catForm.value.busy || !String(catForm.value.newName || "").trim(),
                  onClick: addCategoryFromForm
                }, "新增", 8, _cat_add_button_props)
              ]),
              catForm.value.error ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: "cat-dlg-error",
                role: "alert"
              }, toDisplayString(catForm.value.error), 1)) : createCommentVNode("", true),
              createBaseVNode("div", _hoisted_61, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(cats.value, (c) => {
                  return openBlock(), createElementBlock("div", {
                    key: c.id,
                    class: normalizeClass(["cat-dlg-row", { archived: c.archivedAt }])
                  }, [
                    createBaseVNode("i", {
                      class: "swatch",
                      style: normalizeStyle({ background: c.color })
                    }, null, 4),
                    createBaseVNode("span", _hoisted_62, toDisplayString(c.group === "cogs" ? "货款单列" : c.group === "unclassified" ? "遗留" : "期间费用"), 1),
                    withDirectives(createBaseVNode("input", {
                      "onUpdate:modelValue": ($event) => catForm.value.names[c.id] = $event,
                      class: "cat-dlg-input",
                      maxlength: unref(MAX_CAT_NAME),
                      placeholder: unref(EXPENSE_CATS).find((d) => d.id === c.id)?.name || "类别名称",
                      "aria-label": `${c.name}的新名称`,
                      disabled: catForm.value.busy
                    }, null, 8, _hoisted_63), [
                      [vModelText, catForm.value.names[c.id]]
                    ]),
                    createBaseVNode("div", { class: "cat-dlg-meta" }, [
                      createBaseVNode("span", _hoisted_64, toDisplayString((catForm.value.names[c.id] || "").slice(0, 2) || "—"), 1),
                      createBaseVNode("span", { class: "cat-dlg-usage" }, toDisplayString(categoryUsage(c.id).count) + " 笔 · " + toDisplayString(unref(formatGoalNumber)(categoryUsage(c.id).amount)) + toDisplayString(unit.value), 1),
                      c.group === "unclassified" ? (openBlock(), createElementBlock("span", { key: 0, class: "cat-dlg-status protected" }, "历史保留")) : c.archivedAt ? (openBlock(), createElementBlock("span", { key: 1, class: "cat-dlg-status" }, "已删除")) : createCommentVNode("", true)
                    ]),
                    createBaseVNode("div", { class: "cat-dlg-actions-inline" }, [
                      unref(EXPENSE_CATS).some((d) => d.id === c.id) ? (openBlock(), createElementBlock("button", {
                        key: 0,
                        type: "button",
                        class: "ghost",
                        title: "恢复这一项的默认名称",
                        disabled: catForm.value.busy,
                        onClick: ($event) => resetCatName(c.id)
                      }, "默认", 8, _cat_manage_action_props)) : createCommentVNode("", true),
                      c.group === "unclassified" ? (openBlock(), createElementBlock("span", {
                        key: 1,
                        class: "cat-dlg-status protected"
                      }, "仅供查看")) : c.archivedAt ? (openBlock(), createElementBlock("button", {
                        key: 2,
                        type: "button",
                        class: "ghost",
                        disabled: catForm.value.busy,
                        onClick: ($event) => restoreCategoryFromForm(c)
                      }, "恢复", 8, _cat_manage_action_props)) : c.group === "opex" ? (openBlock(), createElementBlock("button", {
                        key: 3,
                        type: "button",
                        class: "ghost cat-dlg-remove",
                        title: "从记账按钮中删除，历史账目仍会保留",
                        disabled: catForm.value.busy,
                        onClick: ($event) => archiveCategoryFromForm(c)
                      }, "删除", 8, _cat_manage_action_props)) : (openBlock(), createElementBlock("span", {
                        key: 4,
                        class: "cat-dlg-status protected"
                      }, "固定"))
                    ])
                  ], 2);
                }), 128))
              ]),
              createBaseVNode("div", _hoisted_66, [
                createBaseVNode("button", {
                  type: "button",
                  class: "ghost",
                  disabled: catForm.value.busy,
                  onClick: _cache[9] || (_cache[9] = closeCatForm)
                }, "取消", 8, ["disabled"]),
                createBaseVNode("button", {
                  type: "button",
                  class: "primary",
                  disabled: catForm.value.busy,
                  onClick: saveCatForm
                }, toDisplayString(catForm.value.busy ? "处理中…" : "保存名称"), 9, ["disabled"])
              ])
            ], 32)
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_67, [
            createBaseVNode("section", _hoisted_68, [
              createBaseVNode("div", _hoisted_69, [
                createBaseVNode("span", null, toDisplayString(unref(periodShortLabel)(period.value, periodKey.value) || "本期"), 1),
                isCurrentPeriod.value ? (openBlock(), createElementBlock("span", _hoisted_70, "当期")) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", _hoisted_71, [
                _cache[24] || (_cache[24] = createBaseVNode("i", null, "期间费用", -1)),
                createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(curSum.value.opex)), 1),
                createBaseVNode("em", null, toDisplayString(unit.value), 1)
              ]),
              createBaseVNode("div", _hoisted_72, toDisplayString(vsText(opexVs.value)), 1),
              curSum.value.unclassified ? (openBlock(), createElementBlock("div", {
                key: 1,
                class: "big legacy"
              }, [
                createBaseVNode("i", null, "遗留/未分类"),
                createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(curSum.value.unclassified)), 1),
                createBaseVNode("em", null, toDisplayString(unit.value), 1)
              ])) : createCommentVNode("", true),
              createBaseVNode("div", _hoisted_73, [
                createBaseVNode("i", null, toDisplayString(cogsName.value), 1),
                createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(curSum.value.cogs)), 1),
                createBaseVNode("em", null, toDisplayString(unit.value), 1)
              ]),
              createBaseVNode("div", _hoisted_74, toDisplayString(vsText(cogsVs.value)), 1)
            ]),
            createBaseVNode("section", _hoisted_75, [
              _cache[25] || (_cache[25] = createBaseVNode("div", { class: "exp-card-head" }, [
                createBaseVNode("span", null, "期间费用构成"),
                createBaseVNode("span", { class: "dim" }, "条长按类别内部最大值")
              ], -1)),
              createBaseVNode("div", _hoisted_76, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(ranking.value, (r) => {
                  return openBlock(), createElementBlock("div", {
                    key: r.id,
                    class: "exp-rank-row"
                  }, [
                    createBaseVNode("span", _hoisted_77, toDisplayString(r.name), 1),
                    createBaseVNode("span", _hoisted_78, [
                      createBaseVNode("i", {
                        style: normalizeStyle({ width: r.width + "%", background: r.color })
                      }, null, 4)
                    ]),
                    createBaseVNode("span", _hoisted_79, toDisplayString(unref(formatGoalNumber)(r.amount)), 1),
                    createBaseVNode("span", _hoisted_80, toDisplayString(r.share) + "%", 1)
                  ]);
                }), 128))
              ])
            ]),
            createBaseVNode("section", _hoisted_81, [
              createBaseVNode("div", { class: "exp-card-head" }, [
                createBaseVNode("span", null, "最近 " + toDisplayString(TREND_PERIODS) + " 期"),
                _cache[26] || (_cache[26] = createBaseVNode("span", { class: "dim" }, "各排使用独立比例尺", -1))
              ]),
              createBaseVNode("div", _hoisted_82, [
                createBaseVNode("div", _hoisted_83, [
                  createBaseVNode("span", _hoisted_84, [
                    _cache[27] || (_cache[27] = createTextVNode("费用", -1)),
                    createBaseVNode("i", null, "峰值 " + toDisplayString(unref(formatGoalNumber)(trend.value.maxOpex)), 1)
                  ]),
                  (openBlock(), createElementBlock("svg", {
                    class: "spark",
                    viewBox: `0 0 ${TREND_VB_W} ${TREND_VB_H}`,
                    preserveAspectRatio: "none"
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(trend.value.rows, (t) => {
                      return openBlock(), createElementBlock("rect", {
                        key: t.key,
                        class: normalizeClass(["opex", { now: t.now, empty: !t.opex }]),
                        x: t.opexBar.x,
                        y: t.opexBar.y,
                        width: t.opexBar.w,
                        height: t.opexBar.h
                      }, [
                        createBaseVNode("title", null, toDisplayString(t.label) + "　费用 " + toDisplayString(unref(formatGoalNumber)(t.opex)) + toDisplayString(unit.value), 1)
                      ], 10, _hoisted_86);
                    }), 128))
                  ], 8, _hoisted_85))
                ]),
                createBaseVNode("div", _hoisted_87, [
                  createBaseVNode("span", _hoisted_88, [
                    createTextVNode(toDisplayString(cogsName.value), 1),
                    createBaseVNode("i", null, "峰值 " + toDisplayString(unref(formatGoalNumber)(trend.value.maxCogs)), 1)
                  ]),
                  (openBlock(), createElementBlock("svg", {
                    class: "spark",
                    viewBox: `0 0 ${TREND_VB_W} ${TREND_VB_H}`,
                    preserveAspectRatio: "none"
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(trend.value.rows, (t) => {
                      return openBlock(), createElementBlock("rect", {
                        key: t.key,
                        class: normalizeClass(["cogs", { now: t.now, empty: !t.cogs }]),
                        x: t.cogsBar.x,
                        y: t.cogsBar.y,
                        width: t.cogsBar.w,
                        height: t.cogsBar.h
                      }, [
                        createBaseVNode("title", null, toDisplayString(t.label) + "　" + toDisplayString(cogsName.value) + " " + toDisplayString(unref(formatGoalNumber)(t.cogs)) + toDisplayString(unit.value), 1)
                      ], 10, _hoisted_90);
                    }), 128))
                  ], 8, _hoisted_89))
                ]),
                trend.value.maxUnclassified ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  class: "exp-trend-row legacy"
                }, [
                  createBaseVNode("span", { class: "cap" }, [
                    createTextVNode("遗留/未分类", 1),
                    createBaseVNode("i", null, "峰值 " + toDisplayString(unref(formatGoalNumber)(trend.value.maxUnclassified)), 1)
                  ]),
                  (openBlock(), createElementBlock("svg", {
                    class: "spark",
                    viewBox: `0 0 ${TREND_VB_W} ${TREND_VB_H}`,
                    preserveAspectRatio: "none"
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(trend.value.rows, (t) => {
                      return openBlock(), createElementBlock("rect", {
                        key: t.key,
                        class: normalizeClass(["legacy", { now: t.now, empty: !t.unclassified }]),
                        x: t.unclassifiedBar.x,
                        y: t.unclassifiedBar.y,
                        width: t.unclassifiedBar.w,
                        height: t.unclassifiedBar.h
                      }, [
                        createBaseVNode("title", null, toDisplayString(t.label) + "　遗留/未分类 " + toDisplayString(unref(formatGoalNumber)(t.unclassified)) + toDisplayString(unit.value), 1)
                      ], 10, _hoisted_86);
                    }), 128))
                  ], 8, _hoisted_85))
                ])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_91, [
                  createBaseVNode("span", null, toDisplayString(trend.value.rows[0]?.label), 1),
                  _cache[28] || (_cache[28] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
                  createBaseVNode("span", null, toDisplayString(trend.value.rows[trend.value.rows.length - 1]?.label), 1)
                ])
              ])
            ])
          ])
        ], 64))
      ]);
    };
  }
};
const ExpenseView = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-bfbd477c"]]);
const _hoisted_1$3 = { class: "field" };
const _hoisted_2$3 = { class: "field" };
const _hoisted_3$1 = { class: "field" };
const _hoisted_4$1 = { class: "row2" };
const _hoisted_5$1 = { class: "field" };
const _hoisted_6$1 = { class: "field" };
const _hoisted_7$1 = {
  key: 0,
  class: "time-estimate"
};
const _hoisted_8$1 = { key: 0 };
const _hoisted_9$1 = { class: "row2" };
const _hoisted_10$1 = { class: "field" };
const _hoisted_11$1 = ["value"];
const _hoisted_12$1 = { class: "field" };
const _hoisted_13$1 = ["value"];
const _hoisted_14 = { class: "field" };
const _hoisted_15 = ["disabled"];
const _hoisted_16 = ["value"];
const _hoisted_17 = { class: "field" };
const _hoisted_18 = { class: "pills" };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = { class: "field" };
const _hoisted_21 = { class: "pills" };
const _hoisted_22 = ["onClick"];
const _hoisted_23 = { class: "dialog-actions" };
const _sfc_main$3 = {
  __name: "TodoEditor",
  setup(__props) {
    const draft = ref(blank());
    const titleEl = ref(null);
    function blank() {
      return {
        id: null,
        title: "",
        note: "",
        // 默认就是今天；从日历某一格点进来的会用那一格的日期覆盖掉
        date: todayYmd(),
        startTime: "",
        endTime: "",
        listId: state.activeListId || state.lists[0]?.id || null,
        priority: 0,
        quadrant: 0,
        repeat: "none",
        remindBefore: state.settings?.defaultRemindBefore ?? null
      };
    }
    watch(
      () => state.editing,
      (v) => {
        if (!v) return;
        draft.value = {
          ...blank(),
          ...v,
          startTime: v.startTime || "",
          endTime: v.endTime ?? v.time ?? ""
        };
      },
      { immediate: true }
    );
    onMounted(() => titleEl.value?.focus());
    const isEdit = computed(() => !!draft.value.id);
    const hasTime = computed(() => !!(draft.value.startTime || draft.value.endTime));
    const expectedMinutes = computed(
      () => draft.value.startTime && draft.value.endTime ? taskDurationMinutes(draft.value) : null
    );
    async function save() {
      const payload = {
        title: draft.value.title.trim(),
        note: draft.value.note,
        date: draft.value.date || null,
        startTime: draft.value.startTime || null,
        endTime: draft.value.endTime || null,
        listId: draft.value.listId,
        priority: Number(draft.value.priority),
        quadrant: Number(draft.value.quadrant),
        repeat: draft.value.repeat,
        remindBefore: draft.value.remindBefore
      };
      if (!payload.title) return;
      if (!payload.startTime && !payload.endTime) payload.remindBefore = null;
      const savedTodo = isEdit.value ? await actions.updateTodo(draft.value.id, payload) : await actions.createTodo(payload);
      actions.closeEditor();
    }
    async function del() {
      if (!isEdit.value) return actions.closeEditor();
      await actions.removeTodo(draft.value.id);
      actions.closeEditor();
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "mask",
        onClick: _cache[13] || (_cache[13] = withModifiers(($event) => unref(actions).closeEditor(), ["self"]))
      }, [
        createBaseVNode("div", {
          class: "dialog todo-editor-dialog",
          onKeyup: _cache[12] || (_cache[12] = withKeys(($event) => unref(actions).closeEditor(), ["esc"]))
        }, [
          createBaseVNode("h3", null, toDisplayString(isEdit.value ? "编辑待办" : "新建待办"), 1),
          createBaseVNode("div", _hoisted_1$3, [
            _cache[14] || (_cache[14] = createBaseVNode("label", null, "标题", -1)),
            withDirectives(createBaseVNode("input", {
              ref_key: "titleEl",
              ref: titleEl,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => draft.value.title = $event),
              placeholder: "要做什么",
              onKeyup: withKeys(save, ["enter"])
            }, null, 544), [
              [vModelText, draft.value.title]
            ])
          ]),
          createBaseVNode("div", _hoisted_2$3, [
            _cache[15] || (_cache[15] = createBaseVNode("label", null, "备注", -1)),
            withDirectives(createBaseVNode("textarea", {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => draft.value.note = $event),
              placeholder: "补充说明（可留空）"
            }, null, 512), [
              [vModelText, draft.value.note]
            ])
          ]),
          createBaseVNode("div", _hoisted_3$1, [
            _cache[16] || (_cache[16] = createBaseVNode("label", null, "日期", -1)),
            withDirectives(createBaseVNode("input", {
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => draft.value.date = $event),
              type: "date"
            }, null, 512), [
              [vModelText, draft.value.date]
            ])
          ]),
          createBaseVNode("div", _hoisted_4$1, [
            createBaseVNode("div", _hoisted_5$1, [
              createBaseVNode("label", null, [
                _cache[17] || (_cache[17] = createTextVNode(" 任务开始时间（选填） ", -1)),
                draft.value.startTime ? (openBlock(), createElementBlock("button", {
                  key: 0,
                  type: "button",
                  class: "clear-btn",
                  title: "清空开始时间",
                  onClick: _cache[3] || (_cache[3] = ($event) => draft.value.startTime = "")
                }, " 清空 ")) : createCommentVNode("", true)
              ]),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => draft.value.startTime = $event),
                type: "time"
              }, null, 512), [
                [vModelText, draft.value.startTime]
              ])
            ]),
            createBaseVNode("div", _hoisted_6$1, [
              createBaseVNode("label", null, [
                _cache[18] || (_cache[18] = createTextVNode(" 任务结束时间（选填） ", -1)),
                draft.value.endTime ? (openBlock(), createElementBlock("button", {
                  key: 0,
                  type: "button",
                  class: "clear-btn",
                  title: "清空结束时间",
                  onClick: _cache[5] || (_cache[5] = ($event) => draft.value.endTime = "")
                }, " 清空 ")) : createCommentVNode("", true)
              ]),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => draft.value.endTime = $event),
                type: "time"
              }, null, 512), [
                [vModelText, draft.value.endTime]
              ])
            ])
          ]),
          expectedMinutes.value !== null ? (openBlock(), createElementBlock("div", _hoisted_7$1, [
            createTextVNode(" 预计 " + toDisplayString(expectedMinutes.value) + " 分钟完成 ", 1),
            draft.value.endTime < draft.value.startTime ? (openBlock(), createElementBlock("span", _hoisted_8$1, "（次日结束）")) : createCommentVNode("", true)
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_9$1, [
            createBaseVNode("div", _hoisted_10$1, [
              _cache[19] || (_cache[19] = createBaseVNode("label", null, "所属清单", -1)),
              withDirectives(createBaseVNode("select", {
                "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => draft.value.listId = $event)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(state).lists, (l) => {
                  return openBlock(), createElementBlock("option", {
                    key: l.id,
                    value: l.id
                  }, toDisplayString(l.name), 9, _hoisted_11$1);
                }), 128))
              ], 512), [
                [vModelSelect, draft.value.listId]
              ])
            ]),
            createBaseVNode("div", _hoisted_12$1, [
              _cache[20] || (_cache[20] = createBaseVNode("label", null, "重复", -1)),
              withDirectives(createBaseVNode("select", {
                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => draft.value.repeat = $event)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(REPEATS), (r) => {
                  return openBlock(), createElementBlock("option", {
                    key: r.id,
                    value: r.id
                  }, toDisplayString(r.name), 9, _hoisted_13$1);
                }), 128))
              ], 512), [
                [vModelSelect, draft.value.repeat]
              ])
            ])
          ]),
          createBaseVNode("div", _hoisted_14, [
            createBaseVNode("label", null, "提醒" + toDisplayString(hasTime.value ? "" : "（先设开始或结束时间）"), 1),
            withDirectives(createBaseVNode("select", {
              "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => draft.value.remindBefore = $event),
              disabled: !hasTime.value
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(REMIND_OPTIONS), (o) => {
                return openBlock(), createElementBlock("option", {
                  key: String(o.id),
                  value: o.id
                }, toDisplayString(o.name), 9, _hoisted_16);
              }), 128))
            ], 8, _hoisted_15), [
              [vModelSelect, draft.value.remindBefore]
            ])
          ]),
          createBaseVNode("div", _hoisted_17, [
            _cache[21] || (_cache[21] = createBaseVNode("label", null, "优先级", -1)),
            createBaseVNode("div", _hoisted_18, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(PRIORITIES), (p) => {
                return openBlock(), createElementBlock("button", {
                  key: p.id,
                  class: normalizeClass(["pill", { on: Number(draft.value.priority) === p.id }]),
                  onClick: ($event) => draft.value.priority = p.id
                }, [
                  p.color !== "transparent" ? (openBlock(), createElementBlock("span", {
                    key: 0,
                    class: "dot",
                    style: normalizeStyle([{ "display": "inline-block", "margin-right": "5px" }, { background: p.color }])
                  }, null, 4)) : createCommentVNode("", true),
                  createTextVNode(" " + toDisplayString(p.name), 1)
                ], 10, _hoisted_19);
              }), 128))
            ])
          ]),
          createBaseVNode("div", _hoisted_20, [
            _cache[22] || (_cache[22] = createBaseVNode("label", null, "四象限", -1)),
            createBaseVNode("div", _hoisted_21, [
              createBaseVNode("button", {
                class: normalizeClass(["pill", { on: Number(draft.value.quadrant) === 0 }]),
                onClick: _cache[10] || (_cache[10] = ($event) => draft.value.quadrant = 0)
              }, " 未分类 ", 2),
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(QUADRANTS), (q) => {
                return openBlock(), createElementBlock("button", {
                  key: q.id,
                  class: normalizeClass(["pill", { on: Number(draft.value.quadrant) === q.id }]),
                  onClick: ($event) => draft.value.quadrant = q.id
                }, toDisplayString(q.name), 11, _hoisted_22);
              }), 128))
            ])
          ]),
          aiCoachEnabled() ? createBaseVNode("div", { class: "coach-after-save" }, [
            createBaseVNode("span", { class: "coach-after-save-mark" }, [
              createVNode(_sfc_main$b, { name: "route", size: 15 })
            ]),
            createBaseVNode("span", { class: "coach-after-save-copy" }, [
              createBaseVNode("strong", null, "保存后自动生成 AI 拆解"),
              createBaseVNode("small", null, aiCoachConfig().includeNote ? "后台生成，将发送标题、时间、优先级、四象限和备注" : "后台生成，仅发送任务信息，备注不会发送", 1)
            ])
          ]) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_23, [
            isEdit.value ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: "danger",
              onClick: del
            }, "删除")) : createCommentVNode("", true),
            createBaseVNode("button", {
              class: "ghost",
              onClick: _cache[11] || (_cache[11] = ($event) => unref(actions).closeEditor())
            }, "取消"),
            createBaseVNode("button", {
              class: "primary",
              onClick: save
            }, "保存")
          ])
        ], 32)
      ]);
    };
  }
};
const AICoachDrawer = {
  __name: "AICoachDrawer",
  setup() {
    const currentTodo = computed(() => state.todos.find((todo) => todo.id === aiCoachUi.value.todoId) || null);
    const taskPlan = computed(() => aiCoachUi.value.mode === "task" ? aiCoachUi.value.plan || coachTaskPlan(aiCoachUi.value.todoId) : null);
    const dayPlan = computed(() => aiCoachUi.value.mode === "day" ? aiCoachUi.value.plan || coachDayPlan(aiCoachUi.value.date) : null);
    const todoTitle = (todoId) => state.todos.find((todo) => todo.id === todoId)?.title || "已删除的待办";
    const minutesText = (minutes) => Number(minutes) > 0 ? `${Math.round(Number(minutes))} 分钟` : "";
    const generatedText = (value) => {
      const date = new Date(value || 0);
      return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };
    const linkHost = (url) => {
      try {
        return new URL(String(url)).hostname;
      } catch {
        return "链接不可用";
      }
    };
    // 步骤行本身已经是「勾选完成」的按钮，不能再往里塞第二个可交互元素。
    // 改用选择模式：进入后同一个按钮改为选中/取消选中，退出后恢复原行为。
    const picking = ref(false);
    const pickedStepIds = ref([]);
    const stepDrafts = ref(null);
    const stepBatchesFor = (todoId) => coachArray(state.aiTaskCoach?.stepBatches)
      .filter((batch) => batch?.parentTodoId === todoId && batch.status === "applied");
    const promotedFor = (plan) => new Set(coachArray(plan?.promotedStepIds).map(String));
    const resetPicking = () => {
      picking.value = false;
      pickedStepIds.value = [];
      stepDrafts.value = null;
    };
    const startPicking = () => {
      if (aiCoachUi.value.busy) return;
      picking.value = true;
      pickedStepIds.value = [];
      stepDrafts.value = null;
      aiCoachUi.value.error = "";
      aiCoachUi.value.notice = "";
    };
    const togglePick = (step) => {
      const id = String(step?.id || "");
      if (!id) return;
      stepDrafts.value = null;
      pickedStepIds.value = pickedStepIds.value.includes(id)
        ? pickedStepIds.value.filter((row) => row !== id)
        : [...pickedStepIds.value, id];
    };
    async function previewStepTodos() {
      const plan = taskPlan.value;
      if (!plan?.todoId || !pickedStepIds.value.length || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = "step-preview";
      aiCoachUi.value.error = "";
      try {
        const result = await actions.previewAIStepTodos(plan.todoId, [...pickedStepIds.value]);
        if (!result?.ok) throw new Error(result?.message || "无法预览子待办");
        stepDrafts.value = coachArray(result.drafts);
      } catch (error) {
        stepDrafts.value = null;
        aiCoachUi.value.error = coachErrorMessage(error, "预览失败，没有创建任何待办。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    async function confirmStepTodos() {
      const plan = taskPlan.value;
      if (!plan?.todoId || !stepDrafts.value?.length || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = "step-create";
      aiCoachUi.value.error = "";
      try {
        const result = await actions.createAIStepTodos(plan.todoId, [...pickedStepIds.value]);
        if (!result?.ok) throw new Error(result?.message || "子待办未创建");
        aiCoachUi.value.notice = result.message || "已创建独立待办，可撤销本次创建。";
        resetPicking();
      } catch (error) {
        aiCoachUi.value.error = coachErrorMessage(error, "子待办没有创建，待办列表未改变。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    async function undoStepBatch(batch) {
      if (!batch?.id || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = `step-undo:${batch.id}`;
      aiCoachUi.value.error = "";
      try {
        const result = await actions.undoAIStepBatch(batch.id);
        if (!result?.ok) throw new Error(result?.message || "未撤销任何待办");
        aiCoachUi.value.notice = result.message || "已撤销本次创建。";
      } catch (error) {
        aiCoachUi.value.error = coachErrorMessage(error, "没有删除任何待办。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    async function toggleStep(step) {
      if (picking.value) return togglePick(step);
      const plan = taskPlan.value;
      if (!plan?.todoId || !step?.id || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = `step:${step.id}`;
      aiCoachUi.value.error = "";
      try {
        const result = await actions.toggleAIPlanStep(plan.todoId, step.id);
        if (!result?.ok) throw new Error(result?.message || "无法更新步骤状态");
        if (result.plan) aiCoachUi.value.plan = result.plan;
      } catch (error) {
        aiCoachUi.value.error = coachErrorMessage(error, "步骤状态没有更新，请重试。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    async function openOfficialLink(link) {
      if (!link?.url || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = `link:${link.url}`;
      aiCoachUi.value.error = "";
      try {
        const result = await actions.openAICoachLink(link.url);
        if (result?.ok === false) throw new Error(result?.message || "链接未打开");
      } catch (error) {
        aiCoachUi.value.error = coachErrorMessage(error, "链接未通过安全校验，未打开。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    async function applyDay() {
      const plan = dayPlan.value;
      if (!plan?.id || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = "apply";
      aiCoachUi.value.error = "";
      aiCoachUi.value.notice = "";
      try {
        const result = await actions.applyAIDayPlan(plan.id);
        if (!result?.ok) throw new Error(result?.message || "今日排程未应用");
        if (result.plan) aiCoachUi.value.plan = result.plan;
        aiCoachUi.value.notice = result.message || "已应用今日安排，可在这里撤销本次变更。";
      } catch (error) {
        aiCoachUi.value.error = coachErrorMessage(error, "今日排程没有应用，原时间保持不变。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    async function undoDay() {
      const plan = dayPlan.value;
      if (!plan?.id || aiCoachUi.value.busy) return;
      aiCoachUi.value.busy = "undo";
      aiCoachUi.value.error = "";
      aiCoachUi.value.notice = "";
      try {
        const result = await actions.undoAIDayPlan(plan.id);
        if (!result?.ok) throw new Error(result?.message || "本次安排未撤销");
        if (result.plan) aiCoachUi.value.plan = result.plan;
        aiCoachUi.value.notice = result.message || "本次 AI 安排已撤销。";
      } catch (error) {
        aiCoachUi.value.error = coachErrorMessage(error, "未能撤销本次安排，请重试。");
      } finally {
        aiCoachUi.value.busy = "";
      }
    }
    const stringSection = (title, rows, className = "") => {
      const items = coachArray(rows).filter(Boolean);
      if (!items.length) return null;
      return createBaseVNode("section", { class: normalizeClass(["coach-section", className]) }, [
        createBaseVNode("h4", { class: "coach-section-title" }, title),
        createBaseVNode("ul", { class: "coach-checklist" }, items.map((item) => createBaseVNode("li", null, [
          createBaseVNode("i", { "aria-hidden": "true" }),
          createBaseVNode("span", null, String(item))
        ])))
      ], 2);
    };
    const renderTask = (plan) => {
      const nextAction = typeof plan.nextAction === "string" ? { title: plan.nextAction } : plan.nextAction || {};
      const steps = coachArray(plan.steps);
      const links = coachArray(plan.officialLinks || plan.links);
      return createBaseVNode("div", { class: "coach-content" }, [
        plan.summary ? createBaseVNode("p", { class: "coach-summary" }, String(plan.summary)) : null,
        nextAction.title ? createBaseVNode("section", { class: "coach-next-action" }, [
          createBaseVNode("div", { class: "coach-next-kicker" }, "现在先做这一步"),
          createBaseVNode("strong", null, String(nextAction.title)),
          nextAction.detail ? createBaseVNode("p", null, String(nextAction.detail)) : null,
          minutesText(nextAction.minutes) ? createBaseVNode("span", { class: "coach-duration" }, minutesText(nextAction.minutes)) : null
        ]) : null,
        stringSection("需要你确认", plan.questions, "coach-questions"),
        stringSection("准备材料", plan.prerequisites || plan.materials),
        steps.length ? createBaseVNode("section", { class: "coach-section" }, [
          createBaseVNode("div", { class: "coach-section-heading" }, [
            createBaseVNode("h4", { class: "coach-section-title" }, picking.value ? "选择要创建为独立待办的步骤" : "行动步骤", 1),
            plan.estimatedMinutes && !picking.value ? createBaseVNode("span", { class: "coach-duration" }, `共约 ${minutesText(plan.estimatedMinutes)}`) : null,
            createBaseVNode("button", {
              type: "button",
              class: "ghost coach-step-btn",
              disabled: Boolean(aiCoachUi.value.busy) || Boolean(plan.stale),
              onClick: () => picking.value ? resetPicking() : startPicking()
            }, picking.value ? "退出选择" : "创建为独立待办", 9, ["disabled"])
          ]),
          picking.value ? createBaseVNode("p", { class: "coach-step-hint" }, "点击步骤进行选择；确认前不会创建任何待办。") : null,
          createBaseVNode("div", { class: "coach-step-list" }, steps.map((step, index) => {
            const stepId = String(step.id || "");
            const promoted = promotedFor(plan).has(stepId);
            const picked = picking.value && pickedStepIds.value.includes(stepId);
            return createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["coach-step", {
                done: !picking.value && step.done,
                picked,
                promoted: picking.value && promoted,
                busy: aiCoachUi.value.busy === `step:${step.id}`
              }]),
              disabled: Boolean(aiCoachUi.value.busy) || picking.value && promoted,
              title: picking.value && promoted ? "这个步骤已经创建过独立待办" : "",
              onClick: () => toggleStep(step)
            }, [
              createBaseVNode("span", { class: "coach-step-index" }, picking.value ? picked ? "✓" : promoted ? "已建" : String(index + 1).padStart(2, "0") : step.done ? "✓" : String(index + 1).padStart(2, "0"), 1),
              createBaseVNode("span", { class: "coach-step-copy" }, [
                createBaseVNode("strong", null, String(step.title || `步骤 ${index + 1}`)),
                step.detail ? createBaseVNode("small", null, String(step.detail)) : null
              ]),
              minutesText(step.minutes ?? step.estimatedMinutes) ? createBaseVNode("span", { class: "coach-duration" }, minutesText(step.minutes ?? step.estimatedMinutes)) : null
            ], 10, ["disabled", "title"])
          })),
          picking.value ? createBaseVNode("div", { class: "coach-step-actions" }, [
            createBaseVNode("span", { class: "coach-step-count" }, `已选 ${pickedStepIds.value.length} 项`, 1),
            createBaseVNode("button", {
              type: "button",
              class: "ghost coach-step-btn",
              disabled: Boolean(aiCoachUi.value.busy) || !pickedStepIds.value.length,
              onClick: previewStepTodos
            }, aiCoachUi.value.busy === "step-preview" ? "预览中…" : "预览", 9, ["disabled"])
          ]) : null,
          picking.value && stepDrafts.value?.length ? createBaseVNode("div", { class: "coach-step-preview" }, [
            createBaseVNode("div", { class: "coach-step-preview-title" }, `将创建 ${stepDrafts.value.length} 条独立待办`, 1),
            createBaseVNode("ul", { class: "coach-checklist" }, stepDrafts.value.map((draft) => createBaseVNode("li", null, [
              createBaseVNode("i", { "aria-hidden": "true" }),
              createBaseVNode("span", null, `${String(draft.title)}（预计 ${draft.estimatedMinutes} 分钟）`)
            ]))),
            createBaseVNode("p", { class: "coach-step-hint" }, "子待办不带日期与时间，可随后用「AI 安排今天」统一排程。"),
            createBaseVNode("button", {
              type: "button",
              class: "primary coach-step-btn",
              disabled: Boolean(aiCoachUi.value.busy),
              onClick: confirmStepTodos
            }, aiCoachUi.value.busy === "step-create" ? "创建中…" : "确认创建", 9, ["disabled"])
          ]) : null,
          stepBatchesFor(plan.todoId).map((batch) => createBaseVNode("div", { class: "coach-step-batch" }, [
            createBaseVNode("span", null, `已创建 ${batch.items.length} 条独立待办`),
            batch.undoable ? createBaseVNode("button", {
              type: "button",
              class: "ghost coach-step-btn",
              disabled: Boolean(aiCoachUi.value.busy),
              onClick: () => undoStepBatch(batch)
            }, aiCoachUi.value.busy === `step-undo:${batch.id}` ? "撤销中…" : "撤销本次创建", 9, ["disabled"])
              : createBaseVNode("small", null, "其中有待办已被修改或完成，为避免删除你的内容不再提供撤销")
          ]))
        ]) : null,
        links.length ? createBaseVNode("section", { class: "coach-section" }, [
          createBaseVNode("h4", { class: "coach-section-title" }, "建议入口（请核对官网）"),
          createBaseVNode("div", { class: "coach-source-list" }, links.map((link) => createBaseVNode("button", {
            type: "button",
            class: "coach-source-card",
            disabled: Boolean(aiCoachUi.value.busy) || !link?.url,
            onClick: () => openOfficialLink(link)
          }, [
            createBaseVNode("span", { class: "coach-source-copy" }, [
              createBaseVNode("strong", null, String(link.label || linkHost(link.url))),
              link.purpose ? createBaseVNode("small", null, String(link.purpose)) : null,
              createBaseVNode("code", { class: "coach-source-host" }, String(linkHost(link.url)))
            ]),
            createBaseVNode("span", { class: "coach-source-badge" }, "建议链接"),
            createVNode(_sfc_main$b, { name: "external", size: 14 })
          ], 8, ["disabled"])))
        ]) : null,
        stringSection("注意事项", plan.cautions, "coach-cautions"),
        stringSection("完成后建议", plan.followUps, "coach-followups")
      ]);
    };
    const renderDay = (plan) => {
      const items = [...coachArray(plan.preserved), ...coachArray(plan.items)].sort((a, b) => String(a.startTime || "99:99").localeCompare(String(b.startTime || "99:99")));
      const unscheduled = coachArray(plan.unscheduled);
      const proposedCount = coachArray(plan.items).length;
      const lockedCount = coachArray(plan.preserved).length;
      const reasonText = (reason) => ({
        fixed_schedule: "已设置固定时间",
        running: "任务正在计时",
        repeating: "重复任务保留原规则",
        no_capacity: "今天剩余可用时间不足"
      })[reason] || String(reason || "今天剩余时间不足");
      return createBaseVNode("div", { class: "coach-content" }, [
        createBaseVNode("div", { class: "coach-day-summary" }, [
          createBaseVNode("span", null, [createBaseVNode("strong", null, String(proposedCount)), createTextVNode(" 项建议", -1)]),
          createBaseVNode("span", null, [createBaseVNode("strong", null, String(lockedCount)), createTextVNode(" 项固定", -1)]),
          createBaseVNode("span", null, [createBaseVNode("strong", null, String(unscheduled.length)), createTextVNode(" 项待处理", -1)]),
          plan.appliedAt && !plan.undoneAt ? createBaseVNode("em", { class: "is-applied" }, "已应用") : plan.undoneAt ? createBaseVNode("em", null, "已撤销") : createBaseVNode("em", null, "尚未修改待办")
        ]),
        items.length ? createBaseVNode("section", { class: "coach-section" }, [
          createBaseVNode("h4", { class: "coach-section-title" }, "今日时间轨道"),
          createBaseVNode("div", { class: "coach-time-rail" }, items.map((item) => createBaseVNode("div", {
            class: normalizeClass(["coach-slot", { "is-locked": item.locked, "is-proposed": !item.locked }])
          }, [
            createBaseVNode("div", { class: "coach-slot-time" }, [
              createBaseVNode("strong", null, String(item.startTime || "--:--")),
              createBaseVNode("span", null, String(item.endTime || "--:--"))
            ]),
            createBaseVNode("i", { "aria-hidden": "true" }),
            createBaseVNode("div", { class: "coach-slot-copy" }, [
              createBaseVNode("strong", null, todoTitle(item.todoId)),
              item.reason ? createBaseVNode("small", null, reasonText(item.reason)) : null
            ]),
            item.locked ? createBaseVNode("span", { class: "coach-lock" }, [createVNode(_sfc_main$b, { name: "lock", size: 12 }), createTextVNode(" 已锁定", -1)]) : createBaseVNode("span", { class: "coach-proposed" }, "AI 建议")
          ], 2)))
        ]) : createBaseVNode("div", { class: "coach-empty" }, "今天没有可排入时间轴的待办。"),
        unscheduled.length ? createBaseVNode("section", { class: "coach-section coach-unscheduled" }, [
          createBaseVNode("h4", { class: "coach-section-title" }, "暂未排入"),
          createBaseVNode("div", null, unscheduled.map((item) => createBaseVNode("div", { class: "coach-unscheduled-row" }, [
            createBaseVNode("strong", null, todoTitle(item.todoId)),
            createBaseVNode("span", null, reasonText(item.reason))
          ])))
        ]) : null,
        stringSection("排程提示", plan.warnings, "coach-cautions")
      ]);
    };
    return () => {
      if (!aiCoachUi.value.open) return createCommentVNode("", true);
      const isDay = aiCoachUi.value.mode === "day";
      const plan = isDay ? dayPlan.value : taskPlan.value;
      const title = isDay ? `${aiCoachUi.value.date} · 今日安排` : currentTodo.value?.title || "任务拆解";
      const applied = Boolean(isDay && plan?.appliedAt && !plan?.undoneAt);
      return createBaseVNode("div", {
        class: "ai-coach-mask",
        onClick: (event) => event.target === event.currentTarget && closeAICoach()
      }, [
        createBaseVNode("aside", {
          class: normalizeClass(["ai-coach-drawer", { "is-schedule": isDay }]),
          role: "dialog",
          "aria-modal": "true",
          "aria-label": isDay ? "AI 今日排程" : "AI 任务拆解"
        }, [
          createBaseVNode("header", { class: "coach-head" }, [
            createBaseVNode("div", { class: "coach-head-mark" }, [createVNode(_sfc_main$b, { name: "route", size: 18 })]),
            createBaseVNode("div", { class: "coach-head-copy" }, [
              createBaseVNode("div", { class: "coach-eyebrow" }, `AI 任务教练 · ${isDay ? "时间草案" : "行动指南"}`),
              createBaseVNode("h3", null, title),
              plan?.generatedAt || plan?.createdAt ? createBaseVNode("small", null, `生成于 ${generatedText(plan.generatedAt || plan.createdAt)}`) : null
            ]),
            createBaseVNode("button", { type: "button", class: "coach-close", title: "关闭", onClick: closeAICoach }, [createVNode(_sfc_main$b, { name: "x", size: 17 })])
          ]),
          aiCoachUi.value.busy ? createBaseVNode("div", { class: "coach-status is-busy", role: "status" }, [
            createBaseVNode("i", { "aria-hidden": "true" }),
            createBaseVNode("span", null, aiCoachUi.value.busy.startsWith("step:") ? "正在更新步骤…" : aiCoachUi.value.busy.startsWith("link:") ? "正在安全打开链接…" : aiCoachUi.value.busy.startsWith("step-undo:") ? "正在撤销本次创建…" : aiCoachUi.value.busy === "step-preview" ? "正在生成子待办预览…" : aiCoachUi.value.busy === "step-create" ? "正在创建独立待办…" : aiCoachUi.value.busy === "apply" ? "正在应用今日安排…" : aiCoachUi.value.busy === "undo" ? "正在撤销本次安排…" : "正在核对任务、资料和今天的空档…")
          ]) : null,
          aiCoachUi.value.error ? createBaseVNode("div", { class: "coach-status is-error", role: "alert" }, aiCoachUi.value.error) : null,
          aiCoachUi.value.notice ? createBaseVNode("div", { class: "coach-status is-notice", role: "status" }, aiCoachUi.value.notice) : null,
          createBaseVNode("div", { class: "coach-scroll" }, [
            plan ? isDay ? renderDay(plan) : renderTask(plan) : !aiCoachUi.value.busy ? createBaseVNode("div", { class: "coach-empty" }, [
              createVNode(_sfc_main$b, { name: "route", size: 24 }),
              createBaseVNode("strong", null, aiCoachEnabled() ? "还没有生成草案" : "AI 任务教练尚未连接"),
              createBaseVNode("span", null, aiCoachEnabled() ? "生成后会先展示预览，不会直接改变待办时间。" : "待办仍可正常使用，请先在设置中完成连接。")
            ]) : null
          ]),
          createBaseVNode("footer", { class: "coach-footer" }, [
            createBaseVNode("span", { class: "coach-footer-note" }, isDay ? "应用前可完整预览，应用后仍可撤销" : "AI 内容可能出错，重要信息请以官方页面为准"),
            aiCoachEnabled() ? createBaseVNode("button", {
              type: "button",
              class: "ghost coach-rerun",
              disabled: Boolean(aiCoachUi.value.busy) || applied,
              onClick: () => isDay ? runDayCoach(aiCoachUi.value.date) : runTaskCoach(aiCoachUi.value.todoId)
            }, [createVNode(_sfc_main$b, { name: "refresh", size: 13 }), createTextVNode(plan ? " 重新生成" : " 生成草案", -1)], 8, ["disabled"]) : null,
            isDay && plan ? createBaseVNode("button", {
              type: "button",
              class: normalizeClass([applied ? "ghost" : "primary", "coach-apply"]),
              disabled: Boolean(aiCoachUi.value.busy) || Boolean(plan.undoneAt),
              onClick: applied ? undoDay : applyDay
            }, [createVNode(_sfc_main$b, { name: applied ? "undo" : "check", size: 13 }), createTextVNode(applied ? " 撤销本次安排" : ` 应用 ${coachArray(plan.items).filter((item) => !item.locked).length} 项安排`, -1)], 10, ["disabled"]) : createBaseVNode("button", { type: "button", class: "primary", disabled: Boolean(aiCoachUi.value.busy), onClick: closeAICoach }, "完成", 8, ["disabled"])
          ])
        ], 10, ["aria-label"])
      ]);
    };
  }
};

const AI_COACH_DEFAULT_GATEWAY = "http://127.0.0.1:18789/v1/responses";
const AI_COACH_DEFAULT_CONFIG = {
  enabled: false,
  gatewayUrl: AI_COACH_DEFAULT_GATEWAY,
  agentId: "timemaster-coach",
  includeNote: false,
  autoPlanNewTodos: false,
  sendPlanToQq: false,
  workdayStart: "09:00",
  workdayEnd: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:30",
  bufferMinutes: 10
};
function normalizeAICoachConfig(result) {
  return { ...AI_COACH_DEFAULT_CONFIG, ...(result?.config || result || {}) };
}
const AICoachSettings = {
  __name: "AICoachSettings",
  setup() {
    const draft = ref(normalizeAICoachConfig(state.aiCoachConfig));
    const token = ref("");
    const tokenConfigured = ref(Boolean(state.aiCoachConfig?.tokenConfigured));
    const loading = ref(true);
    const busy = ref("");
    const dirty = ref(false);
    const status = ref({ kind: "", text: "" });
    const update = (key, value) => {
      draft.value = { ...draft.value, [key]: value };
      dirty.value = true;
      status.value = { kind: "", text: "" };
    };
    async function load() {
      loading.value = true;
      try {
        const result = await actions.getAICoachConfig();
        if (result?.ok === false) throw new Error(result.message || "无法读取 AI 配置");
        draft.value = normalizeAICoachConfig(result);
        tokenConfigured.value = Boolean(result?.tokenConfigured ?? result?.config?.tokenConfigured ?? state.aiCoachConfig?.tokenConfigured);
        state.aiCoachConfig = { ...draft.value, tokenConfigured: tokenConfigured.value };
        if (result?.tokenError) status.value = { kind: "error", text: String(result.tokenError) };
      } catch (error) {
        status.value = { kind: "error", text: coachErrorMessage(error, "无法读取 AI 任务教练配置。") };
      } finally {
        loading.value = false;
      }
    }
    async function save() {
      if (busy.value) return;
      busy.value = "save";
      status.value = { kind: "hint", text: "正在保存 AI 任务教练配置…" };
      try {
        // 逐字段构造并强制转成原始值：draft 是 ref，任何嵌套对象都会是
        // reactive Proxy，直接展开送进 IPC 会触发「An object could not be cloned」。
        const payload = {
          enabled: Boolean(draft.value.enabled),
          gatewayUrl: String(draft.value.gatewayUrl || "").trim(),
          agentId: String(draft.value.agentId || "").trim(),
          includeNote: Boolean(draft.value.includeNote),
          autoPlanNewTodos: Boolean(draft.value.autoPlanNewTodos),
          sendPlanToQq: Boolean(draft.value.sendPlanToQq),
          workdayStart: String(draft.value.workdayStart || ""),
          workdayEnd: String(draft.value.workdayEnd || ""),
          lunchStart: String(draft.value.lunchStart || ""),
          lunchEnd: String(draft.value.lunchEnd || ""),
          bufferMinutes: Number(draft.value.bufferMinutes) || 0
        };
        if (token.value.trim()) payload.token = token.value.trim();
        const result = await actions.saveAICoachConfig(payload);
        if (!result?.ok) throw new Error(result?.message || "配置未保存");
        draft.value = normalizeAICoachConfig(result?.config || draft.value);
        tokenConfigured.value = Boolean(result?.tokenConfigured ?? (tokenConfigured.value || token.value.trim()));
        token.value = "";
        dirty.value = false;
        state.aiCoachConfig = { ...draft.value, tokenConfigured: tokenConfigured.value };
        status.value = { kind: "success", text: result?.message || "AI 任务教练配置已保存。" };
      } catch (error) {
        status.value = { kind: "error", text: coachErrorMessage(error, "AI 任务教练配置未保存。") };
      } finally {
        busy.value = "";
      }
    }
    async function probe() {
      if (busy.value) return;
      if (dirty.value || token.value.trim()) {
        status.value = { kind: "error", text: "请先保存当前配置，再检查连接。" };
        return;
      }
      busy.value = "probe";
      status.value = { kind: "hint", text: "正在检查本机 OpenClaw…" };
      try {
        const result = await actions.probeAICoach();
        if (!result?.ok) throw new Error(result?.message || "未连接到 OpenClaw");
        status.value = { kind: "success", text: result?.message || "OpenClaw AI 接口已连接。" };
      } catch (error) {
        status.value = { kind: "error", text: coachErrorMessage(error, "未检测到可用的 OpenClaw AI 接口。") };
      } finally {
        busy.value = "";
      }
    }
    onMounted(load);
    const switchRow = (title, description, key) => createBaseVNode("div", { class: "coach-settings-switch" }, [
      createBaseVNode("div", null, [createBaseVNode("div", { class: "k" }, title), createBaseVNode("div", { class: "d" }, description)]),
      createBaseVNode("button", {
        type: "button",
        class: normalizeClass(["toggle", { on: draft.value[key] }]),
        role: "switch",
        "aria-checked": Boolean(draft.value[key]),
        disabled: Boolean(busy.value),
        onClick: () => update(key, !draft.value[key])
      }, null, 10, ["aria-checked", "disabled"])
    ]);
    const textField = (label, key, options = {}) => createBaseVNode("div", { class: normalizeClass(["field coach-settings-field", { full: options.full }]) }, [
      createBaseVNode("label", { for: `coach-${key}` }, label),
      createBaseVNode("input", {
        id: `coach-${key}`,
        type: options.type || "text",
        value: draft.value[key],
        min: options.min,
        max: options.max,
        placeholder: options.placeholder,
        disabled: Boolean(busy.value),
        autocomplete: "off",
        spellcheck: "false",
        onInput: (event) => update(key, options.type === "number" ? Number(event.target.value) : event.target.value)
      }, null, 40, ["value", "disabled"]),
      options.hint ? createBaseVNode("small", null, options.hint) : null
    ], 2);
    return () => createBaseVNode("section", {
      class: normalizeClass(["ai-coach-settings-card", { enabled: draft.value.enabled }]),
      "aria-busy": Boolean(busy.value)
    }, [
      createBaseVNode("i", { class: "coach-settings-rail", "aria-hidden": "true" }),
      createBaseVNode("div", { class: "coach-settings-head" }, [
        createBaseVNode("span", { class: "coach-settings-mark" }, [createVNode(_sfc_main$b, { name: "route", size: 17 })]),
        createBaseVNode("div", { class: "coach-settings-title" }, [
          createBaseVNode("strong", null, "AI 任务教练"),
          createBaseVNode("small", null, "把模糊待办变成材料、步骤和可撤销的今日安排")
        ]),
        createBaseVNode("span", { class: normalizeClass(["coach-settings-badge", { ready: tokenConfigured.value }]) }, tokenConfigured.value ? "凭据已保存" : "待配置", 3),
        createBaseVNode("button", {
          type: "button",
          class: normalizeClass(["toggle", { on: draft.value.enabled }]),
          role: "switch",
          "aria-label": "启用 AI 任务教练",
          "aria-checked": Boolean(draft.value.enabled),
          disabled: Boolean(busy.value),
          onClick: () => update("enabled", !draft.value.enabled)
        }, null, 10, ["aria-checked", "disabled"])
      ]),
      loading.value ? createBaseVNode("div", { class: "coach-settings-loading" }, "正在读取配置…") : createBaseVNode("div", { class: "coach-settings-body" }, [
        createBaseVNode("div", { class: "coach-settings-privacy" }, [
          createVNode(_sfc_main$b, { name: "shield", size: 15 }),
          createBaseVNode("p", null, "时间大师只把任务标题、日期、时间、优先级和四象限交给本机 OpenClaw。备注默认不发送；OpenClaw 使用的模型仍可能是远程服务。费用和专注记录不会随请求发送。")
        ]),
        createBaseVNode("div", { class: "coach-settings-grid" }, [
          textField("Gateway /v1/responses", "gatewayUrl", { full: true, placeholder: AI_COACH_DEFAULT_GATEWAY, hint: "仅接受 127.0.0.1 或 localhost" }),
          createBaseVNode("div", { class: "field coach-settings-field full" }, [
            createBaseVNode("label", { for: "coach-token" }, "Gateway Token"),
            createBaseVNode("input", {
              id: "coach-token",
              type: "password",
              value: token.value,
              placeholder: tokenConfigured.value ? "留空表示不更改" : "输入 Gateway Token",
              maxlength: "4096",
              autocomplete: "new-password",
              disabled: Boolean(busy.value),
              onInput: (event) => {
                token.value = event.target.value;
                status.value = { kind: "", text: "" };
              }
            }, null, 40, ["value", "placeholder", "disabled"]),
            createBaseVNode("small", { class: tokenConfigured.value ? "is-secure" : "" }, tokenConfigured.value ? "凭据副本已加密保存，页面不会回显" : "保存时由系统安全存储凭据")
          ]),
          textField("独立 Agent ID", "agentId", { full: true, placeholder: "timemaster-coach", hint: "建议使用仅具备资料检索能力的独立 Agent" })
        ]),
        createBaseVNode("div", { class: "coach-settings-options" }, [
          switchRow("发送待办备注", "默认关闭；开启后备注会随请求交给 OpenClaw", "includeNote"),
          switchRow("新待办自动准备拆解", "任何方式新建的待办都会在后台生成拆解草案，不弹窗、不改动待办时间", "autoPlanNewTodos"),
          switchRow("把拆解推送到 QQ", "仅推送新建时自动生成的拆解：标题、下一步和步骤清单。需要先配置并启用 QQ Bot 主提醒", "sendPlanToQq")
        ]),
        createBaseVNode("div", { class: "coach-settings-time" }, [
          createBaseVNode("div", { class: "coach-settings-time-title" }, [createBaseVNode("strong", null, "默认可安排时间"), createBaseVNode("small", null, "AI 不会覆盖已经设置的固定时间")]),
          createBaseVNode("div", { class: "coach-settings-time-grid" }, [
            textField("工作开始", "workdayStart", { type: "time" }),
            textField("工作结束", "workdayEnd", { type: "time" }),
            textField("午休开始", "lunchStart", { type: "time" }),
            textField("午休结束", "lunchEnd", { type: "time" }),
            textField("任务缓冲（分钟）", "bufferMinutes", { type: "number", min: 0, max: 60, full: true })
          ])
        ]),
        createBaseVNode("div", { class: "coach-settings-actions" }, [
          createBaseVNode("button", { type: "button", class: "primary", disabled: Boolean(busy.value) || !dirty.value && !token.value.trim(), onClick: save }, busy.value === "save" ? "保存中…" : "保存配置", 9, ["disabled"]),
          createBaseVNode("button", { type: "button", class: "ghost", disabled: Boolean(busy.value) || !draft.value.enabled, onClick: probe }, busy.value === "probe" ? "检查中…" : "检查连接", 9, ["disabled"])
        ]),
        createBaseVNode("div", { class: normalizeClass(["coach-settings-status", status.value.kind]) , role: status.value.kind === "error" ? "alert" : "status", "aria-live": "polite" }, status.value.text || " ", 11, ["role"])
      ])
    ], 10, ["aria-busy"]);
  }
};
const REMOTE_REMINDER_DEFAULT_GATEWAY = "http://127.0.0.1:18789/hooks/agent";
const RemoteReminderSettings = {
  __name: "RemoteReminderSettings",
  setup(__props) {
    const api = window.api.remoteReminder;
    const loading = ref(true);
    const busy = ref("");
    const dirty = ref(false);
    const token = ref("");
    const tokenConfigured = ref(false);
    const status = ref({ kind: "", text: "" });
    const draft = ref({
      enabled: false,
      gatewayUrl: REMOTE_REMINDER_DEFAULT_GATEWAY,
      mode: "agent",
      target: "",
      accountId: "",
      includeNote: false
    });
    const failureText = (error, fallback) => {
      const raw = typeof error === "string" ? error : error?.message || error?.error || "";
      const clean = String(raw).replace(/^Error invoking remote method '[^']+':\s*/i, "").replace(/^Error:\s*/i, "").trim();
      return clean || fallback;
    };
    const assertOk = (result, fallback) => {
      if (result && typeof result === "object" && result.ok === false) {
        throw new Error(result.message || result.error || fallback);
      }
      return result;
    };
    const applyConfig = (config) => {
      const source = config && typeof config === "object" ? config : {};
      draft.value = {
        enabled: Boolean(source.enabled),
        gatewayUrl: String(source.gatewayUrl || REMOTE_REMINDER_DEFAULT_GATEWAY),
        mode: source.mode === "direct" ? "direct" : "agent",
        target: String(source.target || ""),
        accountId: String(source.accountId || ""),
        includeNote: Boolean(source.includeNote)
      };
    };
    const load = async () => {
      loading.value = true;
      try {
        if (!api?.getConfig) throw new Error("远程提醒接口尚未载入，请重启应用后再试");
        const result = assertOk(await api.getConfig(), "读取远程提醒配置失败");
        applyConfig(result?.config || result);
        tokenConfigured.value = Boolean(result?.tokenConfigured);
        dirty.value = false;
        status.value = result?.tokenError ? {
          kind: "error",
          text: "已保存的 Hook Token 无法读取，请重新输入并保存配置"
        } : { kind: "", text: "" };
      } catch (error) {
        status.value = { kind: "error", text: failureText(error, "读取远程提醒配置失败") };
      } finally {
        loading.value = false;
      }
    };
    const updateDraft = (key, value) => {
      draft.value = { ...draft.value, [key]: value };
      dirty.value = true;
      status.value = { kind: "hint", text: "配置有改动，保存后生效" };
    };
    const updateToken = (value) => {
      token.value = value;
      dirty.value = true;
      status.value = { kind: "hint", text: "配置有改动，保存后生效" };
    };
    const save = async () => {
      if (busy.value || loading.value) return;
      busy.value = "save";
      status.value = { kind: "hint", text: "正在安全保存配置…" };
      try {
        if (!api?.saveConfig) throw new Error("远程提醒接口尚未载入，请重启应用后再试");
        const payload = {
          enabled: Boolean(draft.value.enabled),
          gatewayUrl: String(draft.value.gatewayUrl || "").trim(),
          mode: draft.value.mode === "direct" ? "direct" : "agent",
          target: String(draft.value.target || "").trim(),
          accountId: String(draft.value.accountId || "").trim(),
          includeNote: Boolean(draft.value.includeNote),
          token: token.value
        };
        const result = assertOk(await api.saveConfig(payload), "保存远程提醒配置失败");
        if (result?.config) applyConfig(result.config);
        tokenConfigured.value = typeof result?.tokenConfigured === "boolean" ? result.tokenConfigured : tokenConfigured.value || Boolean(token.value.trim());
        token.value = "";
        dirty.value = false;
        status.value = { kind: "success", text: "配置已安全保存" };
      } catch (error) {
        status.value = { kind: "error", text: failureText(error, "保存远程提醒配置失败") };
      } finally {
        busy.value = "";
      }
    };
    const runSavedAction = async (method, successText, workingText) => {
      // 前置条件不满足时必须说明原因。此前是静默 return：按钮点了毫无反应，
      // 用户既不知道被拦下了，也不知道该先做什么。
      if (busy.value || loading.value) return;
      if (dirty.value) {
        status.value = { kind: "error", text: "配置有未保存的改动，请先点「保存配置」。" };
        return;
      }
      if (!tokenConfigured.value) {
        status.value = {
          kind: "error",
          text: draft.value.mode === "direct"
            ? "尚未保存可用的 Token。直投需要该 Gateway 的 operator Token（.openclaw\\secrets\\timemaster.json 的 DEFAULT_GATEWAY_TOKEN）。"
            : "尚未保存可用的 Hook Token，请填写后先保存配置。"
        };
        return;
      }
      busy.value = method;
      status.value = { kind: "hint", text: workingText };
      try {
        if (typeof api?.[method] !== "function") throw new Error("远程提醒接口尚未载入，请重启应用后再试");
        const result = assertOk(await api[method](), method === "probe" ? "检查 OpenClaw 连接失败" : "提交测试提醒失败");
        status.value = { kind: "success", text: result?.message || successText };
      } catch (error) {
        status.value = {
          kind: "error",
          text: failureText(error, method === "probe" ? "检查 OpenClaw 连接失败" : "提交测试提醒失败")
        };
      } finally {
        busy.value = "";
      }
    };
    // 只在真正无法响应时禁用。以前把「未保存」「无 Token」也算进去，按钮变灰又
    // 没有可见提示，结果是用户无从判断卡在哪一步。
    const savedActionsReady = () => !loading.value && !busy.value;
    const savedActionTitle = () => dirty.value ? "请先保存配置" : tokenConfigured.value ? "" : draft.value.mode === "direct" ? "请先填写 Gateway operator Token 并保存配置" : "请先填写 Hook Token 并保存配置";
    onMounted(load);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", {
        class: normalizeClass(["remote-reminder-card", { enabled: draft.value.enabled, loading: loading.value }]),
        "aria-busy": loading.value || Boolean(busy.value)
      }, [
        createBaseVNode("span", { class: "remote-reminder-rail", "aria-hidden": "true" }, [
          createBaseVNode("span", { class: "remote-reminder-rail-dot" })
        ]),
        createBaseVNode("div", { class: "remote-reminder-head" }, [
          createBaseVNode("div", { class: "remote-reminder-copy" }, [
            createBaseVNode("div", { class: "remote-reminder-title" }, [
              createBaseVNode("span", { class: "remote-signal-mark", "aria-hidden": "true" }, [
                createBaseVNode("i")
              ]),
              createBaseVNode("span", null, "QQ Bot 主提醒"),
              createBaseVNode("span", {
                class: normalizeClass(["remote-reminder-badge", { ready: tokenConfigured.value }])
              }, loading.value ? "读取中" : draft.value.enabled ? tokenConfigured.value ? "已配置" : "待配置" : "未启用", 3)
            ]),
            createBaseVNode("div", { class: "remote-reminder-desc" }, "待办触发时优先发 QQ，并独立尝试 Windows 通知")
          ]),
          createBaseVNode("button", {
            type: "button",
            class: normalizeClass(["toggle", { on: draft.value.enabled }]),
            role: "switch",
            "aria-checked": draft.value.enabled,
            "aria-label": "QQ Bot 主提醒",
            disabled: loading.value || Boolean(busy.value),
            onClick: () => updateDraft("enabled", !draft.value.enabled)
          }, null, 10, ["aria-checked", "disabled"])
        ]),
        loading.value ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "remote-reminder-loading"
        }, "正在读取安全配置…")) : draft.value.enabled ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: "remote-reminder-body"
        }, [
          createBaseVNode("div", { class: "remote-reminder-form-grid" }, [
            createBaseVNode("div", { class: "field remote-reminder-field full" }, [
              createBaseVNode("label", { for: "remote-gateway-url" }, "OpenClaw Gateway 地址"),
              createBaseVNode("input", {
                id: "remote-gateway-url",
                type: "url",
                value: draft.value.gatewayUrl,
                placeholder: REMOTE_REMINDER_DEFAULT_GATEWAY,
                autocomplete: "off",
                spellcheck: "false",
                disabled: Boolean(busy.value),
                onInput: (event) => updateDraft("gatewayUrl", event.target.value)
              }, null, 40, ["value", "disabled"]),
              createBaseVNode("div", { class: "remote-reminder-field-hint" }, "仅连接本机 OpenClaw（127.0.0.1 或 localhost）")
            ]),
            createBaseVNode("div", { class: "field remote-reminder-field full" }, [
              createBaseVNode("label", { for: "remote-hook-token" }, draft.value.mode === "direct" ? "Gateway operator Token" : "Hook Token", 1),
              createBaseVNode("input", {
                id: "remote-hook-token",
                type: "password",
                value: token.value,
                placeholder: tokenConfigured.value ? "留空表示不更改" : draft.value.mode === "direct" ? "请输入该 Gateway 的 operator Token" : "请输入 Hook Token",
                maxlength: "4096",
                autocomplete: "new-password",
                spellcheck: "false",
                disabled: Boolean(busy.value),
                onInput: (event) => updateToken(event.target.value)
              }, null, 40, ["value", "placeholder", "disabled"]),
              createBaseVNode("div", {
                class: normalizeClass(["remote-reminder-field-hint", { secure: tokenConfigured.value }])
              }, draft.value.mode === "direct" ? "直投使用该 Gateway 的 operator Token；若此前保存的是 Hook Token，请重新填写" : tokenConfigured.value ? "时间大师副本已加密保存，留空表示不更改" : "时间大师保存的副本会加密，保存后不再回显", 3)
            ]),
            createBaseVNode("div", { class: "field remote-reminder-field" }, [
              createBaseVNode("label", { for: "remote-qq-target" }, "QQ 目标"),
              createBaseVNode("input", {
                id: "remote-qq-target",
                type: "text",
                value: draft.value.target,
                placeholder: "qqbot:c2c:OPENID",
                autocomplete: "off",
                spellcheck: "false",
                disabled: Boolean(busy.value),
                onInput: (event) => updateDraft("target", event.target.value)
              }, null, 40, ["value", "disabled"])
            ]),
            createBaseVNode("div", { class: "field remote-reminder-field" }, [
              createBaseVNode("label", { for: "remote-qq-account" }, "QQ accountId（可选）"),
              createBaseVNode("input", {
                id: "remote-qq-account",
                type: "text",
                value: draft.value.accountId,
                placeholder: "多机器人时填写",
                autocomplete: "off",
                spellcheck: "false",
                disabled: Boolean(busy.value),
                onInput: (event) => updateDraft("accountId", event.target.value)
              }, null, 40, ["value", "disabled"])
            ])
          ]),
          createBaseVNode("div", { class: "remote-reminder-note-switch" }, [
            createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "原文直投"),
              createBaseVNode("div", { class: "d" }, draft.value.mode === "direct" ? "提醒原文经 Gateway 直接送达 QQ，不经过模型复述；需要 operator Token" : "当前经提醒代理复述后再发送；模型失败时提醒会静默丢失", 1)
            ]),
            createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["toggle", { on: draft.value.mode === "direct" }]),
              role: "switch",
              "aria-checked": draft.value.mode === "direct",
              "aria-label": "原文直投",
              disabled: Boolean(busy.value),
              onClick: () => updateDraft("mode", draft.value.mode === "direct" ? "agent" : "direct")
            }, null, 10, ["aria-checked", "disabled"])
          ]),
          createBaseVNode("div", { class: "remote-reminder-note-switch" }, [
            createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "发送待办备注"),
              createBaseVNode("div", { class: "d" }, "默认关闭；开启后备注会随提醒交给 OpenClaw")
            ]),
            createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["toggle", { on: draft.value.includeNote }]),
              role: "switch",
              "aria-checked": draft.value.includeNote,
              "aria-label": "发送待办备注",
              disabled: Boolean(busy.value),
              onClick: () => updateDraft("includeNote", !draft.value.includeNote)
            }, null, 10, ["aria-checked", "disabled"])
          ]),
          createBaseVNode("div", { class: "remote-reminder-actions" }, [
            createBaseVNode("button", {
              type: "button",
              class: "primary",
              disabled: loading.value || Boolean(busy.value) || !dirty.value && !token.value.trim(),
              onClick: save
            }, busy.value === "save" ? "保存中…" : "保存配置", 9, ["disabled"]),
            createBaseVNode("button", {
              type: "button",
              class: "ghost",
              disabled: !savedActionsReady(),
              title: savedActionTitle(),
              onClick: () => runSavedAction("probe", "OpenClaw Hook 已认证", "正在检查 OpenClaw Hook…")
            }, busy.value === "probe" ? "检查中…" : "检查连接", 9, ["disabled", "title"]),
            createBaseVNode("button", {
              type: "button",
              class: "ghost",
              disabled: !savedActionsReady(),
              title: savedActionTitle(),
              onClick: () => runSavedAction("test", "OpenClaw 已受理", "正在提交测试提醒…")
            }, busy.value === "test" ? "提交中…" : "发送测试提醒", 9, ["disabled", "title"])
          ])
        ])) : (openBlock(), createElementBlock("div", {
          key: 2,
          class: "remote-reminder-collapsed"
        }, [
          createBaseVNode("span", null, tokenConfigured.value ? "连接资料已安全保留，重新开启并保存后继续使用。" : "开启后配置本机 OpenClaw 与 QQ Bot；关闭不影响 Windows 通知。"),
          dirty.value ? (openBlock(), createElementBlock("button", {
            key: 0,
            type: "button",
            class: "primary",
            disabled: Boolean(busy.value),
            onClick: save
          }, busy.value === "save" ? "保存中…" : "保存关闭状态", 9, ["disabled"])) : createCommentVNode("", true)
        ])),
        createBaseVNode("div", {
          class: normalizeClass(["remote-reminder-status", status.value.kind || "idle"]),
          role: status.value.kind === "error" ? "alert" : "status",
          "aria-live": status.value.kind === "error" ? "assertive" : "polite"
          // patchFlag 必须含 TEXT(1)：这张卡的根节点是 block，更新只遍历
          // dynamicChildren，缺 TEXT 时这行文字会冻在首次渲染的空串上——
          // 保存成功、保存失败、检查结果，这张卡说过的每句话都不会显示。
        }, status.value.text || " ", 11, ["role", "aria-live"])
      ], 10, ["aria-busy"]);
    };
  }
};
const _hoisted_1$2 = { class: "dialog settings-dialog" };
const _hoisted_2$2 = { class: "switch" };
const _hoisted_3 = { class: "switch" };
const _hoisted_4 = { class: "switch" };
const _hoisted_5 = { class: "switch" };
const _hoisted_6 = { class: "switch" };
const _hoisted_7 = {
  class: "field",
  style: { "margin-top": "12px" }
};
const _hoisted_8 = ["value"];
const _hoisted_9 = { class: "field" };
const _hoisted_10 = ["value"];
const _hoisted_11 = ["value"];
const _hoisted_12 = {
  key: 0,
  style: { "font-size": "11px", "color": "var(--text-faint)", "line-height": "1.9" }
};
const _hoisted_13 = { class: "dialog-actions" };
const _sfc_main$2 = {
  __name: "SettingsDialog",
  setup(__props) {
    const info = ref(null);
    onMounted(async () => {
      info.value = await window.api.app.info();
    });
    const s = () => state.settings || {};
    const patch = (p) => actions.patchSettings(p);
    const patchWidget = (p) => actions.patchSettings({ widget: p });
    const openDataDir = () => window.api.app.openDataDir();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "mask",
        onClick: _cache[8] || (_cache[8] = withModifiers(($event) => unref(state).settingsOpen = false, ["self"]))
      }, [
        createBaseVNode("div", _hoisted_1$2, [
          _cache[17] || (_cache[17] = createBaseVNode("h3", null, "设置", -1)),
          createBaseVNode("div", _hoisted_2$2, [
            _cache[9] || (_cache[9] = createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "深色主题"),
              createBaseVNode("div", { class: "d" }, "跟随不了系统，手动切")
            ], -1)),
            createBaseVNode("button", {
              class: normalizeClass(["toggle", { on: s().theme !== "light" }]),
              onClick: _cache[0] || (_cache[0] = ($event) => patch({ theme: s().theme === "light" ? "dark" : "light" }))
            }, null, 2)
          ]),
          createBaseVNode("div", _hoisted_3, [
            _cache[10] || (_cache[10] = createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "一周从周一开始"),
              createBaseVNode("div", { class: "d" }, "关掉则从周日开始")
            ], -1)),
            createBaseVNode("button", {
              class: normalizeClass(["toggle", { on: s().weekStart === 1 }]),
              onClick: _cache[1] || (_cache[1] = ($event) => patch({ weekStart: s().weekStart === 1 ? 0 : 1 }))
            }, null, 2)
          ]),
          _cache[18] || (_cache[18] = createBaseVNode("div", { class: "switch" }, [
            createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "主界面关闭方式"),
              createBaseVNode("div", { class: "d" }, "关闭或最小化后滑动返回桌面组件")
            ]),
            createBaseVNode("span", { style: { "padding": "3px 8px", "border-radius": "9px", "background": "var(--accent-soft)", "color": "var(--accent)", "font-size": "10px" } }, " 已绑定 ")
          ], -1)),
          createBaseVNode("div", _hoisted_4, [
            _cache[11] || (_cache[11] = createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "开机自动启动"),
              createBaseVNode("div", { class: "d" }, "登录 Windows 后自动拉起桌面小组件")
            ], -1)),
            createBaseVNode("button", {
              class: normalizeClass(["toggle", { on: s().autoLaunch }]),
              onClick: _cache[2] || (_cache[2] = ($event) => patch({ autoLaunch: !s().autoLaunch }))
            }, null, 2)
          ]),
          _cache[19] || (_cache[19] = createStaticVNode('<h3 style="margin-top:18px;">桌面小组件</h3><div class="switch"><div><div class="k">桌面组件入口</div><div class="d">主界面只能从桌面组件进入</div></div><span style="padding:3px 8px;border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:10px;"> 主入口 </span></div>', 2)),
          createBaseVNode("div", _hoisted_5, [
            _cache[12] || (_cache[12] = createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "始终置顶"),
              createBaseVNode("div", { class: "d" }, "关掉后会被其它窗口盖住")
            ], -1)),
            createBaseVNode("button", {
              class: normalizeClass(["toggle", { on: s().widget?.alwaysOnTop }]),
              onClick: _cache[3] || (_cache[3] = ($event) => patchWidget({ alwaysOnTop: !s().widget?.alwaysOnTop }))
            }, null, 2)
          ]),
          createBaseVNode("div", _hoisted_6, [
            _cache[13] || (_cache[13] = createBaseVNode("div", null, [
              createBaseVNode("div", { class: "k" }, "锁定位置"),
              createBaseVNode("div", { class: "d" }, "锁上就拖不动了，防误碰")
            ], -1)),
            createBaseVNode("button", {
              class: normalizeClass(["toggle", { on: s().widget?.locked }]),
              onClick: _cache[4] || (_cache[4] = ($event) => patchWidget({ locked: !s().widget?.locked }))
            }, null, 2)
          ]),
          createBaseVNode("div", _hoisted_7, [
            createBaseVNode("label", null, "不透明度 " + toDisplayString(Math.round((s().widget?.opacity ?? 0.92) * 100)) + "%", 1),
            createBaseVNode("input", {
              type: "range",
              min: "0.4",
              max: "1",
              step: "0.02",
              value: s().widget?.opacity ?? 0.92,
              style: { "width": "100%" },
              onInput: _cache[5] || (_cache[5] = (e) => patchWidget({ opacity: Number(e.target.value) }))
            }, null, 40, _hoisted_8)
          ]),
          _cache[20] || (_cache[20] = createBaseVNode("h3", { style: { "margin-top": "18px" } }, "提醒", -1)),
          createBaseVNode("div", _hoisted_9, [
            _cache[14] || (_cache[14] = createBaseVNode("label", null, "新建待办的默认提醒", -1)),
            createBaseVNode("select", {
              value: String(s().defaultRemindBefore),
              onChange: _cache[6] || (_cache[6] = (e) => patch({ defaultRemindBefore: e.target.value === "null" ? null : Number(e.target.value) }))
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(REMIND_OPTIONS), (o) => {
                return openBlock(), createElementBlock("option", {
                  key: String(o.id),
                  value: String(o.id)
                }, toDisplayString(o.name), 9, _hoisted_11);
              }), 128))
            ], 40, _hoisted_10)
          ]),
          createVNode(AICoachSettings),
          createVNode(RemoteReminderSettings),
          _cache[21] || (_cache[21] = createBaseVNode("h3", { style: { "margin-top": "18px" } }, "关于", -1)),
          info.value ? (openBlock(), createElementBlock("div", _hoisted_12, [
            createTextVNode(" 时间大师 · v" + toDisplayString(info.value.version), 1),
            _cache[15] || (_cache[15] = createBaseVNode("br", null, null, -1)),
            createTextVNode(" Electron " + toDisplayString(info.value.electron) + " · Chromium " + toDisplayString(info.value.chrome) + " · Node " + toDisplayString(info.value.node), 1),
            _cache[16] || (_cache[16] = createBaseVNode("br", null, null, -1)),
            createTextVNode(" 数据目录：" + toDisplayString(info.value.dataDir), 1)
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_13, [
            createBaseVNode("button", {
              class: "ghost",
              style: { "margin-right": "auto" },
              onClick: openDataDir
            }, " 打开数据目录 "),
            createBaseVNode("button", {
              class: "primary",
              onClick: _cache[7] || (_cache[7] = ($event) => unref(state).settingsOpen = false)
            }, "完成")
          ])
        ])
      ]);
    };
  }
};
const _hoisted_1$1 = { class: "dlg-text" };
const _hoisted_2$1 = { class: "dlg-acts" };
const _sfc_main$1 = {
  __name: "AppDialog",
  setup(__props) {
    const inputEl = ref(null);
    watch(dialogState, async (box) => {
      if (box?.kind !== "prompt") return;
      await nextTick();
      inputEl.value?.focus();
      inputEl.value?.select();
    });
    const cancel = () => closeDialog(dialogState.value?.kind === "prompt" ? null : false);
    function ok() {
      const box = dialogState.value;
      if (!box) return;
      closeDialog(box.kind === "prompt" ? box.value : true);
    }
    return (_ctx, _cache) => {
      return unref(dialogState) ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "dlg-mask",
        onClick: withModifiers(cancel, ["self"])
      }, [
        createBaseVNode("div", {
          class: "dlg",
          onKeyup: withKeys(cancel, ["esc"])
        }, [
          createBaseVNode("div", _hoisted_1$1, toDisplayString(unref(dialogState).text), 1),
          unref(dialogState).kind === "prompt" ? withDirectives((openBlock(), createElementBlock("input", {
            key: 0,
            ref_key: "inputEl",
            ref: inputEl,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(dialogState).value = $event),
            class: "dlg-input",
            onKeyup: withKeys(ok, ["enter"])
          }, null, 544)), [
            [vModelText, unref(dialogState).value]
          ]) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_2$1, [
            unref(dialogState).kind !== "alert" ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: "ghost",
              onClick: cancel
            }, "取消")) : createCommentVNode("", true),
            createBaseVNode("button", {
              class: normalizeClass(unref(dialogState).danger ? "danger" : "primary"),
              onClick: ok
            }, toDisplayString(unref(dialogState).okText), 3)
          ])
        ], 32)
      ])) : createCommentVNode("", true);
    };
  }
};
const AppDialog = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-dd9b9eb2"]]);
const _hoisted_1 = { class: "app" };
const _hoisted_2 = { class: "shell" };
const _sfc_main = {
  __name: "App",
  setup(__props) {
    const VIEWS = {
      calendar: CalendarView,
      todo: _sfc_main$6,
      matrix: _sfc_main$5,
      expense: ExpenseView
    };
    let stopNavigate = null;
    function onNavigate(target) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(target?.date || "")) ? target.date : todayYmd();
      if (target?.view === "calendar") {
        state.cursor = date;
        state.selected = date;
        state.view = "calendar";
        return;
      }
      if (target?.view !== "expense") return;
      const goalId = typeof target.goalId === "string" ? target.goalId : null;
      state.cursor = date;
      state.selected = date;
      state.expenseGoalId = goalId;
      state.expenseOpenRequest = {
        date,
        goalId,
        sequence: (state.expenseOpenRequest?.sequence || 0) + 1
      };
      state.view = "expense";
    }
    function onKey(e) {
      const tag = e.target?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(tag) || e.target?.isContentEditable || e.target?.getAttribute?.("role")) return;
      if (e.key === "Escape") {
        if (aiCoachUi.value.open) closeAICoach();
        else if (state.editing) actions.closeEditor();
        else if (state.settingsOpen) state.settingsOpen = false;
        return;
      }
      if (state.editing || state.settingsOpen) return;
      switch (e.key) {
        case "t":
        case "T":
          state.cursor = todayYmd();
          state.selected = todayYmd();
          break;
        case "n":
        case "N":
          actions.openEditor({ date: state.selected });
          break;
        case "ArrowLeft":
          state.cursor = state.calendarMode === "month" ? addMonths(state.cursor, -1) : addDays(state.cursor, -1);
          break;
        case "ArrowRight":
          state.cursor = state.calendarMode === "month" ? addMonths(state.cursor, 1) : addDays(state.cursor, 1);
          break;
        case "1":
          state.view = "calendar";
          break;
        case "2":
          state.view = "todo";
          break;
        case "3":
          state.view = "matrix";
          break;
        case "4":
          state.view = "expense";
          break;
      }
    }
    onMounted(() => {
      window.addEventListener("keydown", onKey);
      stopNavigate = window.api.app.onNavigate(onNavigate);
    });
    onUnmounted(() => {
      window.removeEventListener("keydown", onKey);
      stopNavigate?.();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_sfc_main$a),
        createBaseVNode("div", _hoisted_2, [
          createVNode(_sfc_main$9),
          (openBlock(), createBlock(resolveDynamicComponent(VIEWS[unref(state).view])))
        ]),
        unref(state).editing ? (openBlock(), createBlock(_sfc_main$3, { key: 0 })) : createCommentVNode("", true),
        unref(state).settingsOpen ? (openBlock(), createBlock(_sfc_main$2, { key: 1 })) : createCommentVNode("", true),
        createVNode(AICoachDrawer),
        createVNode(AppDialog)
      ]);
    };
  }
};
initStore().catch((err) => {
  console.error("[litecal] 初始化失败", err);
}).finally(() => {
  createApp(_sfc_main).mount("#app");
});
