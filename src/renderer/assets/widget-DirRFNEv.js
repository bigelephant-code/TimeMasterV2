import { I as _export_sfc, a6 as onMounted, Q as nextTick, a7 as onUnmounted, o as openBlock, c as createElementBlock, a as createBaseVNode, au as renderSlot, f as normalizeStyle, r as ref, J as watch, t as toDisplayString, q as todayYmd, n as normalizeClass, b as createVNode, u as unref, s as state, _ as _sfc_main$3, i as createCommentVNode, m as createTextVNode, j as withModifiers, F as Fragment, av as MAX_GOALS, e as renderList, a4 as QUADRANTS, w as withDirectives, v as vModelText, h as withKeys, am as vModelSelect, aw as GOAL_PERIODS, ax as daysBetween, d as actions, x as computed, A as now, M as lunarInfo, T as parseYmd, K as isoWeekNumber, ay as daysLeftInYear, az as ymd, ap as taskDurationMinutes, O as formatGoalNumber, a0 as cogsLabel, aA as opexCatsOf, aB as cogsCatsOf, ab as periodShortLabel, aC as withCtx, aD as taskStartTime, aE as taskEndTime, N as todosOn, aF as OPEX_LABEL, aG as periodLabel, aH as catOf, z as todoState, H as timerDeadlineState, l as relativeLabel, B as stopwatchLabel, C as elapsedMsOf, D as durationLabel, E as remainingLabel, G as deadlineState, ak as groupByPeriod, af as periodKeyOfYmd, al as stepPeriod, Z as summarize, ag as compareWithPrev, ah as opexRanking, aI as addYmdDays, Y as taskSortTime, as as initStore, at as createApp } from "./styles-4HYtOQXD.js";
const _hoisted_1$2 = {
  key: 0,
  class: "scrolling-row-track"
};
const _hoisted_2$2 = { class: "scrolling-row-content" };
const _hoisted_3$2 = {
  class: "scrolling-row-content",
  "aria-hidden": "true"
};
const _hoisted_4$1 = {
  key: 1,
  class: "scrolling-row-static"
};
const _sfc_main$2 = {
  __name: "ScrollingRow",
  setup(__props) {
    const host = ref(null);
    const probe = ref(null);
    const overflow = ref(false);
    const duration = ref(8);
    let resizeObserver = null;
    function measure() {
      if (!host.value || !probe.value) return;
      const contentWidth = probe.value.offsetWidth;
      overflow.value = contentWidth > host.value.clientWidth + 1;
      duration.value = Math.max(7, contentWidth / 24);
    }
    onMounted(() => {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(host.value);
      resizeObserver.observe(probe.value);
      nextTick(measure);
    });
    onUnmounted(() => {
      resizeObserver?.disconnect();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "host",
        ref: host,
        class: "scrolling-row",
        style: normalizeStyle({ "--scrolling-row-duration": `${duration.value}s` })
      }, [
        createBaseVNode("div", {
          ref_key: "probe",
          ref: probe,
          class: "scrolling-row-probe",
          "aria-hidden": "true"
        }, [
          renderSlot(_ctx.$slots, "default", {}, void 0)
        ], 512),
        overflow.value ? (openBlock(), createElementBlock("div", _hoisted_1$2, [
          createBaseVNode("div", _hoisted_2$2, [
            renderSlot(_ctx.$slots, "default", {}, void 0)
          ]),
          createBaseVNode("div", _hoisted_3$2, [
            renderSlot(_ctx.$slots, "default", {}, void 0)
          ])
        ])) : (openBlock(), createElementBlock("div", _hoisted_4$1, [
          renderSlot(_ctx.$slots, "default", {}, void 0)
        ]))
      ], 4);
    };
  }
};
const ScrollingRow = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-145098b6"]]);
const _hoisted_1$1 = {
  key: 0,
  class: "scrolling-title-track"
};
const _hoisted_2$1 = { "aria-hidden": "true" };
const _hoisted_3$1 = {
  key: 1,
  class: "scrolling-title-static"
};
const _sfc_main$1 = {
  __name: "ScrollingTitle",
  props: {
    text: {
      type: String,
      default: ""
    }
  },
  setup(__props) {
    const props = __props;
    const host = ref(null);
    const probe = ref(null);
    const overflow = ref(false);
    let resizeObserver = null;
    function measure() {
      if (!host.value || !probe.value) return;
      overflow.value = probe.value.offsetWidth > host.value.clientWidth + 1;
    }
    onMounted(() => {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(host.value);
      nextTick(measure);
    });
    watch(
      () => props.text,
      () => nextTick(measure)
    );
    onUnmounted(() => {
      resizeObserver?.disconnect();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "host",
        ref: host,
        class: "scrolling-title"
      }, [
        createBaseVNode("span", {
          ref_key: "probe",
          ref: probe,
          class: "scrolling-title-probe"
        }, toDisplayString(__props.text), 513),
        overflow.value ? (openBlock(), createElementBlock("div", _hoisted_1$1, [
          createBaseVNode("span", null, toDisplayString(__props.text), 1),
          createBaseVNode("span", _hoisted_2$1, toDisplayString(__props.text), 1)
        ])) : (openBlock(), createElementBlock("span", _hoisted_3$1, toDisplayString(__props.text), 1))
      ], 512);
    };
  }
};
const ScrollingTitle = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-9e639b1b"]]);
const _hoisted_1 = { class: "wx-bar" };
const _hoisted_2 = ["title"];
const _hoisted_3 = ["disabled", "aria-busy"];
const _hoisted_4 = { class: "wx-head" };
const _hoisted_5 = { class: "wx-hero" };
const _hoisted_6 = { class: "wx-dateblock" };
const _hoisted_7 = { class: "wx-dayframe" };
const _hoisted_8 = { class: "wx-day" };
const _hoisted_9 = { class: "wx-datecol" };
const _hoisted_10 = { class: "wx-date" };
const _hoisted_11 = { class: "wx-week" };
const _hoisted_12 = {
  key: 0,
  class: "wx-jq"
};
const _hoisted_13 = {
  key: 1,
  class: "wx-jq"
};
const _hoisted_14 = { class: "wx-lunar" };
const _hoisted_15 = ["title"];
const _hoisted_16 = { class: "wx-weather-main" };
const _hoisted_17 = { class: "wx-weather-orb" };
const _hoisted_18 = { class: "wx-weather-meta" };
const _hoisted_19 = {
  key: 1,
  class: "wx-weather-state"
};
const _hoisted_20 = {
  key: 2,
  class: "wx-weather-state"
};
const _hoisted_21 = { class: "wx-right" };
const _hoisted_22 = { class: "wx-clock" };
const _hoisted_23 = { class: "wx-stats" };
const _hoisted_24 = { class: "wx-stat" };
const _hoisted_25 = { class: "wx-stat-v" };
const _hoisted_26 = { class: "wx-stat" };
const _hoisted_27 = { class: "wx-stat" };
const _hoisted_28 = ["title"];
const _hoisted_29 = {
  key: 0,
  class: "wx-stat-k wx-cd-stat-k"
};
const _hoisted_30 = {
  key: 1,
  class: "wx-cd-stat-empty"
};
const _hoisted_31 = {
  key: 2,
  class: "wx-stat-v wx-cd-stat-today"
};
const _hoisted_32 = {
  key: 3,
  class: "wx-stat-v wx-cd-stat-v"
};
const _hoisted_33 = {
  class: "wx-focus-mark",
  "aria-hidden": "true"
};
const _hoisted_34 = { class: "wx-focus-copy" };
const _hoisted_35 = ["title"];
const _hoisted_36 = ["title"];
const _hoisted_37 = { class: "wx-goals-head" };
const _hoisted_38 = { class: "wx-goals-title" };
const _hoisted_39 = { class: "wx-goals-count" };
const _hoisted_40 = ["disabled", "title"];
const _hoisted_41 = { class: "wx-goals-add-icon" };
const _hoisted_42 = ["title", "onMousedown", "onContextmenu"];
const _hoisted_43 = { class: "wx-goal-top" };
const _hoisted_44 = { class: "wx-goal-name" };
const _hoisted_45 = { class: "wx-led-heads" };
const _hoisted_46 = {
  class: "wx-led-head opex",
  title: "期间费用类别小计"
};
const _hoisted_47 = ["title"];
const _hoisted_48 = { class: "wx-goal-sub" };
const _hoisted_49 = {
  key: 0,
  class: "wx-led-n"
};
const _hoisted_50 = { class: "wx-led-vs" };
const _hoisted_51 = ["title", "disabled", "onClick"];
const _hoisted_52 = {
  key: 1,
  title: "期间费用较上一个周期"
};
const _hoisted_53 = { class: "dir" };
const _hoisted_54 = ["title"];
const _hoisted_55 = { class: "dir" };
const _hoisted_56 = { class: "wx-led-cats" };
const _hoisted_57 = ["title", "onClick"];
const _hoisted_58 = ["title", "onClick"];
const _hoisted_59 = {
  key: 0,
  class: "wx-led-entry"
};
const _hoisted_60 = ["placeholder", "onKeyup"];
const _hoisted_61 = ["onClick"];
const _hoisted_62 = {
  key: 1,
  class: "wx-led-entry note"
};
const _hoisted_63 = ["onKeyup"];
const _hoisted_64 = {
  key: 2,
  class: "wx-led-flash"
};
const _hoisted_65 = { class: "wx-led-rank" };
const _hoisted_66 = { class: "wx-led-label" };
const _hoisted_67 = { class: "wx-led-track" };
const _hoisted_68 = { class: "wx-led-amt" };
const _hoisted_69 = { class: "wx-led-share" };
const _hoisted_70 = {
  key: 0,
  class: "wx-led-blank"
};
const _hoisted_71 = { class: "wx-goal-top" };
const _hoisted_72 = { class: "wx-goal-name" };
const _hoisted_73 = ["title"];
const _hoisted_74 = ["placeholder", "onKeyup", "onBlur"];
const _hoisted_75 = { class: "wx-goal-steps" };
const _hoisted_76 = ["onClick"];
const _hoisted_77 = ["onClick"];
const _hoisted_78 = {
  key: 0,
  class: "wx-goal-sum"
};
const _hoisted_79 = { key: 0 };
const _hoisted_80 = {
  key: 1,
  class: "wx-goal-pct"
};
const _hoisted_81 = { class: "wx-goal-sub" };
const _hoisted_82 = {
  key: 0,
  class: "wx-goal-prev"
};
const _hoisted_83 = { class: "wx-goal-spark" };
const _hoisted_84 = ["title"];
const _hoisted_85 = {
  key: 1,
  class: "wx-goal-bar"
};
const _hoisted_86 = {
  key: 0,
  class: "wx-goals-empty"
};
const _hoisted_87 = {
  key: 0,
  class: "wx-unsorted"
};
const _hoisted_88 = { class: "wx-grid" };
const _hoisted_89 = ["onDragover", "onDragleave", "onDrop", "onContextmenu"];
const _hoisted_90 = { class: "wx-quad-head" };
const _hoisted_91 = { class: "wx-qtitle" };
const _hoisted_92 = { class: "wx-qname" };
const _hoisted_93 = { class: "wx-qhint" };
const _hoisted_94 = { class: "wx-quad-body" };
const _hoisted_95 = ["title", "onDragstart", "onDblclick", "onContextmenu"];
const _hoisted_96 = { class: "wx-card-main" };
const _hoisted_97 = { class: "wx-acts" };
const _hoisted_98 = ["title", "onClick"];
const _hoisted_99 = ["title", "onClick"];
const _hoisted_100 = {
  key: 0,
  class: "wx-chip future"
};
const _hoisted_101 = {
  key: 1,
  class: "wx-chip time"
};
const _hoisted_102 = {
  key: 2,
  class: "wx-chip duration"
};
const _hoisted_103 = {
  key: 3,
  class: "wx-chip time"
};
const _hoisted_104 = {
  key: 4,
  class: "wx-chip run"
};
const _hoisted_105 = {
  key: 0,
  class: "wx-chip done"
};
const _hoisted_106 = {
  key: 7,
  class: "wx-chip paused"
};
const _hoisted_107 = {
  key: 0,
  class: "wx-empty"
};
const _hoisted_108 = { class: "wx-focus-panel-head" };
const _hoisted_109 = { class: "wx-focus-panel-icon" };
const _hoisted_110 = { class: "wx-focus-hero" };
const _hoisted_111 = { class: "wx-focus-today" };
const _hoisted_112 = { class: "wx-focus-presets" };
const _hoisted_113 = ["disabled", "onClick"];
const _hoisted_114 = ["disabled"];
const _hoisted_115 = { class: "wx-focus-history" };
const _hoisted_116 = { class: "wx-focus-section-title" };
const _hoisted_117 = {
  key: 0,
  class: "wx-focus-history-list"
};
const _hoisted_118 = { class: "wx-form-acts wx-focus-actions" };
const _hoisted_119 = { class: "wx-form-head" };
const _hoisted_120 = { class: "wx-form-row single" };
const _hoisted_121 = { class: "wx-form-row" };
const _hoisted_122 = {
  key: 0,
  class: "wx-form-hint muted"
};
const _hoisted_123 = { key: 0 };
const _hoisted_124 = { class: "wx-form-pills" };
const _hoisted_125 = ["onClick"];
const _hoisted_126 = {
  key: 1,
  class: "wx-form-hint"
};
const _hoisted_127 = { class: "wx-form-acts" };
const _hoisted_128 = { class: "wx-form-head" };
const _hoisted_129 = ["placeholder"];
const _hoisted_130 = { class: "wx-form-modes" };
const _hoisted_131 = {
  key: 0,
  class: "wx-form-row"
};
const _hoisted_132 = ["value"];
const _hoisted_133 = {
  key: 1,
  class: "wx-form-row3"
};
const _hoisted_134 = {
  key: 2,
  class: "wx-form-row3"
};
const _hoisted_135 = ["value"];
const _hoisted_136 = { class: "wx-form-hint muted" };
const _hoisted_137 = {
  key: 3,
  class: "wx-form-hint"
};
const _hoisted_138 = { class: "wx-form-acts" };
const _hoisted_139 = { class: "wx-confirm-text" };
const _hoisted_140 = { class: "wx-form-acts" };
const _hoisted_141 = { class: "wx-city-search" };
const _hoisted_142 = ["disabled"];
const _hoisted_143 = {
  key: 0,
  class: "wx-city-list"
};
const _hoisted_144 = ["onClick"];
const _hoisted_145 = {
  key: 1,
  class: "wx-form-hint"
};
const _hoisted_146 = { class: "wx-form-hint muted" };
const _hoisted_147 = { class: "wx-form-row" };
const _hoisted_148 = { class: "wx-cd-mode" };
const _hoisted_149 = { class: "wx-form-acts" };
const WEATHER_COORDS_KEY = "litecal.weather.coords";
const WEATHER_CACHE_KEY = "litecal.weather.cache";
const WEATHER_REFRESH_MS = 30 * 60 * 1e3;
const WEATHER_CACHE_MS = 3 * 60 * 60 * 1e3;
const WEATHER_TIMEOUT_MS = 12 * 1e3;
const PROGRESS_CONTROLS = ".wx-goal-input, .wx-goal-sign, .wx-goal-step";
const GOALS_ANIM_MS = 260;
const _sfc_main = {
  __name: "Widget",
  setup(__props) {
    const api = window.api;
    const today = ref(todayYmd());
    watch(now, () => {
      const t = todayYmd();
      if (t !== today.value) today.value = t;
    });
    const info = computed(() => lunarInfo(today.value));
    const d = computed(() => parseYmd(today.value));
    const weekday = computed(
      () => ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.value.getDay()]
    );
    const clock = computed(() => {
      const t = new Date(now.value);
      return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    });
    const weekNo = computed(() => isoWeekNumber(today.value));
    const daysLeft = computed(() => daysLeftInYear(today.value));
    const weather = ref({
      status: "idle",
      // 'locate' = 定位没拿到，'network' = 位置有了但请求失败。
      // 两者的解法完全不同，界面上必须分开说，否则用户和我们都没法判断。
      errorKind: null,
      code: null,
      temperature: null,
      apparent: null,
      high: null,
      low: null,
      updatedAt: null
    });
    let weatherRefreshTimer = null;
    let weatherAbort = null;
    let weatherLoadingSince = 0;
    function setWeatherLoading() {
      weatherLoadingSince = Date.now();
      weather.value = { ...weather.value, status: "loading", errorKind: null };
    }
    function weatherCodeInfo(code) {
      const n = Number(code);
      if (n === 0) return { label: "晴", icon: "sun", tone: "sunny" };
      if (n === 1 || n === 2) return { label: "多云", icon: "cloud-sun", tone: "mild" };
      if (n === 3) return { label: "阴", icon: "cloud", tone: "cloudy" };
      if (n === 45 || n === 48) return { label: "有雾", icon: "cloud-fog", tone: "cloudy" };
      if (n >= 51 && n <= 67 || n >= 80 && n <= 82) {
        return { label: n >= 80 ? "阵雨" : "有雨", icon: "cloud-rain", tone: "rainy" };
      }
      if (n >= 71 && n <= 77 || n === 85 || n === 86) {
        return { label: "有雪", icon: "snowflake", tone: "snowy" };
      }
      if (n >= 95 && n <= 99) return { label: "雷雨", icon: "cloud-lightning", tone: "stormy" };
      return { label: "天气", icon: "cloud", tone: "cloudy" };
    }
    const weatherInfo = computed(() => weatherCodeInfo(weather.value.code));
    const weatherActionLabel = computed(() => {
      if (weather.value.status !== "error") return "点击设置";
      return weather.value.errorKind === "network" ? "点击重试" : "设置城市";
    });
    const weatherTitle = computed(() => {
      const place = savedWeatherPlace();
      const where = place?.label ? `　当前城市：${place.label}` : "";
      if (weather.value.status === "loading") return "正在获取天气 · 数据来源 Open-Meteo";
      if (weather.value.status === "error") {
        return weather.value.errorKind === "network" ? `天气接口没连上，点击重试；右键可改城市${where} · 数据来源 Open-Meteo` : "定位没成功。点击手动选择城市 —— 台式机常因为没有无线网卡而定不了位 · 数据来源 Open-Meteo";
      }
      if (weather.value.status !== "ready") {
        return "点击设置城市（也可以让系统自动定位）· 数据来源 Open-Meteo";
      }
      return `${weatherInfo.value.label} · 体感 ${weather.value.apparent}° · 今日 ${weather.value.low}°～${weather.value.high}°　点击刷新 · 右键改城市${where} · 数据来源 Open-Meteo`;
    });
    function readWeatherStorage(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        return null;
      }
    }
    function writeWeatherStorage(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
      }
    }
    function savedWeatherPlace() {
      const place = readWeatherStorage(WEATHER_COORDS_KEY);
      if (!Number.isFinite(place?.latitude) || !Number.isFinite(place?.longitude)) return null;
      return place;
    }
    const savedWeatherCoords = savedWeatherPlace;
    async function fetchWithTimeout(url, { signal } = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error("timeout")), WEATHER_TIMEOUT_MS);
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort);
      try {
        return await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    }
    function requestWeatherCoords() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("当前系统不支持定位"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            resolve({
              latitude: Number(coords.latitude.toFixed(2)),
              longitude: Number(coords.longitude.toFixed(2))
            });
          },
          reject,
          { enableHighAccuracy: false, timeout: 1e4, maximumAge: 6 * 60 * 60 * 1e3 }
        );
      });
    }
    async function refreshWeather({ requestLocation = false, silent = false } = {}) {
      if (weather.value.status === "loading" && Date.now() - weatherLoadingSince < WEATHER_TIMEOUT_MS + 5e3) {
        return;
      }
      const hadWeather = weather.value.status === "ready";
      let coords = savedWeatherPlace();
      if (!coords && requestLocation) {
        setWeatherLoading();
        try {
          coords = await requestWeatherCoords();
          writeWeatherStorage(WEATHER_COORDS_KEY, coords);
        } catch {
          weather.value = { ...weather.value, status: "error", errorKind: "locate" };
          return;
        }
      }
      if (!coords) return;
      if (!silent) setWeatherLoading();
      weatherAbort?.abort();
      weatherAbort = new AbortController();
      try {
        const query = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          current: "temperature_2m,apparent_temperature,weather_code",
          daily: "temperature_2m_max,temperature_2m_min",
          timezone: "auto",
          forecast_days: "1"
        });
        const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${query}`, {
          signal: weatherAbort.signal
        });
        if (!response.ok) throw new Error(`天气接口返回 ${response.status}`);
        const payload = await response.json();
        const nextWeather = {
          status: "ready",
          errorKind: null,
          code: Number(payload.current?.weather_code),
          temperature: Math.round(Number(payload.current?.temperature_2m)),
          apparent: Math.round(Number(payload.current?.apparent_temperature)),
          high: Math.round(Number(payload.daily?.temperature_2m_max?.[0])),
          low: Math.round(Number(payload.daily?.temperature_2m_min?.[0])),
          updatedAt: Date.now()
        };
        if (!Number.isFinite(nextWeather.temperature) || !Number.isFinite(nextWeather.high) || !Number.isFinite(nextWeather.low)) {
          throw new Error("天气数据不完整");
        }
        weather.value = nextWeather;
        writeWeatherStorage(WEATHER_CACHE_KEY, nextWeather);
      } catch (error) {
        const timedOut = error?.message === "timeout";
        if (error?.name === "AbortError" && !timedOut) return;
        if (silent && hadWeather) return;
        weather.value = { ...weather.value, status: "error", errorKind: "network" };
      }
    }
    function initWeather() {
      const cached = readWeatherStorage(WEATHER_CACHE_KEY);
      if (cached?.status === "ready" && Date.now() - Number(cached.updatedAt) < WEATHER_CACHE_MS) {
        weather.value = cached;
      }
      if (savedWeatherCoords()) refreshWeather({ silent: weather.value.status === "ready" });
    }
    const weatherForm = ref(null);
    const weatherQueryEl = ref(null);
    let citySearchAbort = null;
    async function openWeatherForm() {
      const place = savedWeatherPlace();
      weatherForm.value = { query: place?.label || "", results: [], searching: false, error: "" };
      await nextTick();
      weatherQueryEl.value?.select();
    }
    function closeWeatherForm() {
      citySearchAbort?.abort();
      weatherForm.value = null;
    }
    async function searchCity() {
      const form = weatherForm.value;
      if (!form) return;
      const name = form.query.trim();
      if (!name) return;
      citySearchAbort?.abort();
      citySearchAbort = new AbortController();
      form.searching = true;
      form.error = "";
      form.results = [];
      try {
        const query = new URLSearchParams({ name, count: "8", language: "zh", format: "json" });
        const res = await fetchWithTimeout(
          `https://geocoding-api.open-meteo.com/v1/search?${query}`,
          { signal: citySearchAbort.signal }
        );
        if (!res.ok) throw new Error(`地名接口返回 ${res.status}`);
        const payload = await res.json();
        const results = Array.isArray(payload.results) ? payload.results : [];
        if (!weatherForm.value) return;
        weatherForm.value.results = results;
        if (!results.length) weatherForm.value.error = "没找到这个地方，换个写法试试";
      } catch (error) {
        if (!weatherForm.value) return;
        if (error?.name === "AbortError" && error?.message !== "timeout") return;
        weatherForm.value.error = "搜索失败，检查一下网络能不能访问 open-meteo.com";
      } finally {
        if (weatherForm.value) weatherForm.value.searching = false;
      }
    }
    function cityLabel(item) {
      return [item.name, item.admin1, item.country].filter(Boolean).join(" · ");
    }
    async function pickCity(item) {
      writeWeatherStorage(WEATHER_COORDS_KEY, {
        latitude: Number(Number(item.latitude).toFixed(2)),
        longitude: Number(Number(item.longitude).toFixed(2)),
        label: item.name
      });
      weatherForm.value = null;
      weather.value = { ...weather.value, status: "idle", errorKind: null };
      await refreshWeather();
    }
    async function useSystemLocation() {
      weatherForm.value = null;
      await refreshWeather({ requestLocation: true });
    }
    function handleWeatherClick() {
      if (weather.value.status === "error" && weather.value.errorKind === "locate") {
        openWeatherForm();
        return;
      }
      if (!savedWeatherPlace()) {
        openWeatherForm();
        return;
      }
      refreshWeather();
    }
    onMounted(() => {
      initWeather();
      weatherRefreshTimer = setInterval(() => refreshWeather({ silent: true }), WEATHER_REFRESH_MS);
    });
    onUnmounted(() => {
      clearInterval(weatherRefreshTimer);
      weatherAbort?.abort();
    });
    const cdForm = ref(null);
    const cdTitleEl = ref(null);
    const countdown = computed(() => {
      const c = state.settings?.countdown;
      if (!c?.date) return null;
      const diff = daysBetween(today.value, c.date);
      return {
        title: c.title || "目标日",
        date: c.date,
        days: Math.abs(diff),
        mode: diff > 0 ? "future" : diff < 0 ? "past" : "today"
      };
    });
    async function openCountdown() {
      const c = state.settings?.countdown;
      cdForm.value = { title: c?.title || "", date: c?.date || todayYmd() };
      await nextTick();
      cdTitleEl.value?.select();
    }
    async function saveCountdown() {
      const c = cdForm.value;
      if (!c) return;
      await actions.patchSettings({
        countdown: { title: String(c.title || "").trim().slice(0, 12), date: c.date || null }
      });
      cdForm.value = null;
    }
    async function clearCountdown() {
      await actions.patchSettings({ countdown: { title: "", date: null } });
      cdForm.value = null;
    }
    const FOCUS_PRESETS = [25, 30, 45, 60];
    const focusPanel = ref(false);
    const focusMinutesDraft = ref(30);
    const focusTimer = computed(
      () => state.focusTimer || {
        durationMinutes: 30,
        status: "idle",
        startedAt: null,
        runningSince: null,
        elapsedMs: 0,
        endsAt: null
      }
    );
    const focusDurationMs = computed(() => focusTimer.value.durationMinutes * 60 * 1e3);
    const focusElapsedMs = computed(() => {
      const timer = focusTimer.value;
      const runningElapsed = timer.status === "running" && timer.runningSince ? Math.max(0, now.value - timer.runningSince) : 0;
      return Math.min(focusDurationMs.value, Math.max(0, (timer.elapsedMs || 0) + runningElapsed));
    });
    const focusRemainingMs = computed(
      () => Math.max(0, focusDurationMs.value - focusElapsedMs.value)
    );
    const focusProgress = computed(
      () => focusDurationMs.value ? Math.min(100, focusElapsedMs.value / focusDurationMs.value * 100) : 0
    );
    const formatFocusClock = (ms) => {
      const seconds = Math.max(0, Math.ceil(ms / 1e3));
      const minutes = Math.floor(seconds / 60);
      return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    };
    const focusClock = computed(() => formatFocusClock(focusRemainingMs.value));
    const todayFocusSessions = computed(
      () => [...state.focusSessions].filter((session) => ymd(new Date(session.endedAt)) === today.value).sort((a, b) => b.endedAt - a.endedAt)
    );
    const todayFocusMs = computed(
      () => todayFocusSessions.value.reduce((sum, session) => sum + Number(session.focusedMs || 0), 0)
    );
    const formatFocusTotal = (ms) => {
      const minutes = Math.floor(Math.max(0, ms) / 6e4);
      if (ms >= 1e3 && minutes === 0) return "< 1 分钟";
      if (minutes < 60) return `${minutes} 分钟`;
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
    };
    const todayFocusLabel = computed(() => formatFocusTotal(todayFocusMs.value));
    const focusSessionTime = (timestamp) => new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const focusStatusLabel = computed(() => {
      if (focusTimer.value.status === "running") return "专注进行中";
      if (focusTimer.value.status === "paused") return "倒计时已暂停";
      return "点击设置本轮计划";
    });
    const clampFocusMinutes = (value) => Math.min(240, Math.max(1, Math.round(Number(value) || 30)));
    function openFocusPanel() {
      focusMinutesDraft.value = focusTimer.value.durationMinutes || 30;
      focusPanel.value = true;
    }
    async function closeFocusPanel() {
      if (focusTimer.value.status === "idle") {
        const minutes = clampFocusMinutes(focusMinutesDraft.value);
        focusMinutesDraft.value = minutes;
        await actions.setFocusDuration(minutes);
      }
      focusPanel.value = false;
    }
    function chooseFocusMinutes(minutes) {
      if (focusTimer.value.status !== "idle") return;
      focusMinutesDraft.value = clampFocusMinutes(minutes);
    }
    async function startFocus(minutes = focusTimer.value.durationMinutes) {
      const duration = clampFocusMinutes(minutes);
      focusMinutesDraft.value = duration;
      await actions.startFocus(duration);
    }
    async function handleFocusPrimary() {
      if (focusTimer.value.status === "running") {
        await actions.pauseFocus();
      } else if (focusTimer.value.status === "paused") {
        await actions.resumeFocus();
      } else {
        await startFocus();
      }
    }
    async function finishFocus() {
      await actions.finishFocus();
    }
    async function cancelFocus() {
      if (!await askConfirm("放弃本轮专注？本轮时间不会计入今日汇总。")) return;
      await actions.cancelFocus();
    }
    async function cancelFocusFromBar() {
      await actions.cancelFocus();
    }
    const todayRows = computed(() => todosOn(today.value));
    const openCount = computed(() => todayRows.value.filter((t) => !t.done).length);
    const doneCount = computed(() => todayRows.value.filter((t) => t.done).length);
    const rows = computed(() => {
      const t = today.value;
      return state.todos.filter((todo) => {
        if (!todo.done) return true;
        return todo.doneAt ? ymd(new Date(todo.doneAt)) === t : todo.date === t;
      });
    });
    const dateChip = (t) => t.date && t.date !== today.value ? relativeLabel(t.date) : null;
    function compareTodo(a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!!a.startedAt !== !!b.startedAt) return a.startedAt ? -1 : 1;
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? -1 : 1;
      }
      const aTime = taskSortTime(a);
      const bTime = taskSortTime(b);
      if (aTime && bTime) return aTime.localeCompare(bTime);
      if (aTime) return -1;
      if (bTime) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    }
    const quadrantMap = computed(() => {
      const map = /* @__PURE__ */ new Map([
        [1, []],
        [2, []],
        [3, []],
        [4, []]
      ]);
      for (const t of rows.value) {
        const bucket = map.get(t.quadrant || 1) || map.get(1);
        bucket.push(t);
      }
      for (const arr of map.values()) arr.sort(compareTodo);
      return map;
    });
    const quadrantOpenCounts = computed(() => {
      const counts = /* @__PURE__ */ new Map();
      for (const [q, arr] of quadrantMap.value) {
        counts.set(q, arr.reduce((n, t) => t.done ? n : n + 1, 0));
      }
      return counts;
    });
    const inQuadrant = (q) => quadrantMap.value.get(q) || [];
    const quadrantOpenCount = (q) => quadrantOpenCounts.value.get(q) || 0;
    const unsorted = computed(() => rows.value.filter((t) => !t.quadrant && !t.done));
    const compose = ref(null);
    const titleEl = ref(null);
    const todoMenu = ref(null);
    const draggedTodoId = ref(null);
    const dragOriginQuadrant = ref(null);
    const dragTargetQuadrant = ref(null);
    function dismissTodoMenu() {
      todoMenu.value = null;
    }
    function dismissTodoMenuWhenHidden() {
      if (document.hidden) dismissTodoMenu();
    }
    onMounted(() => {
      window.addEventListener("blur", dismissTodoMenu);
      document.addEventListener("visibilitychange", dismissTodoMenuWhenHidden);
    });
    onUnmounted(() => {
      window.removeEventListener("blur", dismissTodoMenu);
      document.removeEventListener("visibilitychange", dismissTodoMenuWhenHidden);
    });
    function openTodoMenu(event, todo) {
      const width = 112;
      const height = 100;
      const pad = 8;
      todoMenu.value = {
        todo,
        x: Math.max(pad, Math.min(event.clientX, window.innerWidth - width - pad)),
        y: Math.max(pad, Math.min(event.clientY, window.innerHeight - height - pad))
      };
    }
    async function openCompose(quadrant) {
      compose.value = {
        id: null,
        quadrant,
        title: "",
        date: todayYmd(),
        // 默认就是今天，可手动改
        startTime: "",
        endTime: ""
      };
      await nextTick();
      titleEl.value?.focus();
    }
    async function editTodo(todo) {
      compose.value = {
        id: todo.id,
        quadrant: todo.quadrant || 1,
        title: todo.title || "",
        date: todo.date || todayYmd(),
        startTime: todo.startTime || "",
        endTime: todo.endTime ?? todo.time ?? ""
      };
      await nextTick();
      titleEl.value?.select();
    }
    async function saveCompose() {
      const c = compose.value;
      if (!c) return;
      const title = c.title.trim();
      if (!title) return;
      const payload = {
        title,
        date: c.date || todayYmd(),
        startTime: c.startTime || null,
        endTime: c.endTime || null,
        quadrant: c.quadrant
      };
      if (c.id) {
        await actions.updateTodo(c.id, payload);
      } else {
        await actions.createTodo({
          ...payload,
          listId: state.lists[0]?.id,
          remindBefore: c.startTime || c.endTime ? state.settings?.defaultRemindBefore ?? null : null
        });
      }
      compose.value = null;
    }
    async function deleteCompose() {
      if (!compose.value?.id) return;
      await actions.removeTodo(compose.value.id);
      compose.value = null;
    }
    async function runTodoMenu(action) {
      const todo = todoMenu.value?.todo;
      todoMenu.value = null;
      if (!todo) return;
      if (action === "edit") {
        await editTodo(todo);
      } else if (action === "add") {
        await openCompose(todo.quadrant || 1);
      } else if (action === "delete") {
        if (!await askConfirm(`删除待办「${todo.title || "无标题"}」？`)) return;
        await actions.removeTodo(todo.id);
      }
    }
    function resetTodoDrag() {
      draggedTodoId.value = null;
      dragOriginQuadrant.value = null;
      dragTargetQuadrant.value = null;
    }
    function startTodoDrag(event, todo, quadrant) {
      if (event.target instanceof Element && event.target.closest("button, input, label")) {
        event.preventDefault();
        return;
      }
      dismissTodoMenu();
      draggedTodoId.value = todo.id;
      dragOriginQuadrant.value = quadrant;
      dragTargetQuadrant.value = null;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", todo.id);
        event.dataTransfer.setData("application/x-litecal-todo", todo.id);
      }
    }
    function overTodoQuadrant(event, quadrant) {
      if (!draggedTodoId.value) return;
      event.preventDefault();
      dragTargetQuadrant.value = quadrant;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = quadrant === dragOriginQuadrant.value ? "none" : "move";
      }
    }
    function leaveTodoQuadrant(event, quadrant) {
      const section = event.currentTarget;
      const next = event.relatedTarget;
      if (next instanceof Node && section instanceof Node && section.contains(next)) return;
      if (dragTargetQuadrant.value === quadrant) dragTargetQuadrant.value = null;
    }
    async function dropTodoIntoQuadrant(event, quadrant) {
      event.preventDefault();
      const transferredId = event.dataTransfer?.getData("application/x-litecal-todo") || event.dataTransfer?.getData("text/plain");
      const todoId = draggedTodoId.value || transferredId;
      const todo = state.todos.find((item) => item.id === todoId);
      const currentQuadrant = todo?.quadrant || 1;
      resetTodoDrag();
      if (!todo || currentQuadrant === quadrant) return;
      await actions.updateTodo(todo.id, { quadrant });
    }
    const composeHint = computed(() => {
      const c = compose.value;
      if (!c || !c.date || c.date === todayYmd()) return null;
      const dt = parseYmd(c.date);
      return `${c.id ? "移到" : "将存到"} ${dt.getMonth() + 1} 月 ${dt.getDate()} 日，今天的面板里不显示`;
    });
    const composeDuration = computed(
      () => compose.value?.startTime && compose.value?.endTime ? taskDurationMinutes(compose.value) : null
    );
    const goalForm = ref(null);
    const goalFormError = ref("");
    const goalNameEl = ref(null);
    const editingLedger = computed(() => {
      const id = goalForm.value?.id;
      return !!id && state.goals.some((goal) => goal.id === id && goal.mode === "ledger");
    });
    const progressFor = ref(null);
    const progressValue = ref("");
    const progressMode = ref("add");
    const progressEl = ref(null);
    const setProgressEl = (el) => {
      progressEl.value = el;
    };
    const pct = (g) => g.target > 0 ? Math.round(g.current / g.target * 100) : 0;
    const barPct = (g) => Math.min(100, Math.max(0, pct(g)));
    const goalLimitReached = computed(() => state.goals.length >= MAX_GOALS);
    const isAccum = (g) => g.mode === "accumulate";
    const isLedger = (g) => g.mode === "ledger";
    const goalValue = (g) => isAccum(g) ? g.periodTotal || 0 : g.current;
    const goalPeriodTitle = (g) => periodLabel(g.period, g.periodKey);
    const goalPrev = (g) => {
      const list = g.periods || [];
      return list.length ? list[list.length - 1] : null;
    };
    const goalBars = (g) => {
      const rows2 = [
        ...(g.periods || []).map((p) => ({ key: p.key, total: Number(p.total) || 0, now: false })),
        { key: g.periodKey, total: Number(g.periodTotal) || 0, now: true }
      ];
      const max = Math.max(1, ...rows2.map((r) => r.total));
      return rows2.map((r) => ({ ...r, h: Math.max(11, Math.round(r.total / max * 100)) }));
    };
    const goalRowTitle = (g) => {
      if (isLedger(g)) {
        const s = ledgerStats.value.get(g.id);
        return `${g.name}　${goalPeriodTitle(g)}　${OPEX_LABEL} ${formatGoalNumber(s?.cur.opex || 0)}${g.unit} · 遗留/未分类 ${formatGoalNumber(s?.cur.unclassified || 0)}${g.unit} · ${cogsLabel(g)} ${formatGoalNumber(s?.cur.cogs || 0)}${g.unit}　点类别记一笔 · 右键修改`;
      }
      return isAccum(g) ? `${g.name}　${goalPeriodTitle(g)} ${formatGoalNumber(g.periodTotal || 0)}${g.unit}　+ 记一笔 · − 冲减 · 右键修改` : `${g.name}　${g.current} / ${g.target}${g.unit}　+ 加进度 · − 减进度 · 右键修改`;
    };
    const goalNamePlaceholder = computed(() => {
      switch (goalForm.value?.mode) {
        case "ledger":
          return "名称，比如「公司费用」";
        case "accumulate":
          return "名称，比如「日常开销」";
        default:
          return "名称，比如「读完 30 本书」";
      }
    });
    async function openGoalForm(goal) {
      if (!goal && goalLimitReached.value) return;
      goalFormError.value = "";
      goalForm.value = goal ? {
        id: goal.id,
        name: goal.name,
        mode: goal.mode || "target",
        target: goal.target,
        unit: goal.unit,
        current: goal.current,
        period: goal.period || "month",
        periodTotal: goal.periodTotal || 0
      } : {
        id: null,
        name: "",
        mode: "target",
        target: 100,
        unit: "",
        current: 0,
        period: "month",
        periodTotal: 0
      };
      await nextTick();
      goalNameEl.value?.focus();
    }
    async function saveGoal() {
      const g = goalForm.value;
      if (!g) return;
      const name = String(g.name || "").trim();
      if (!name) return;
      const payload = {
        name,
        mode: g.mode,
        unit: String(g.unit || "").trim()
      };
      if (g.mode === "ledger") {
        payload.period = g.period;
      } else if (g.mode === "accumulate") {
        payload.period = g.period;
        payload.periodTotal = Number(g.periodTotal) || 0;
      } else {
        payload.target = Number(g.target) || 1;
        payload.current = Number(g.current) || 0;
      }
      if (g.id) {
        await actions.updateGoal(g.id, payload);
      } else {
        const created = await actions.createGoal(payload);
        if (!created) {
          goalFormError.value = `主任务最多只能添加 ${MAX_GOALS} 个`;
          return;
        }
      }
      goalForm.value = null;
    }
    async function deleteGoal() {
      const g = goalForm.value;
      if (!g?.id) return;
      if (editingLedger.value) {
        const day = today.value;
        const todayCount = expensesOf(g.id).filter((entry) => entry.date === day).length;
        if (!todayCount) {
          goalFormError.value = "今天没有费用明细可删除，台账和历史资料均未改动。";
          return;
        }
        const ok = await askConfirm(
          `删除「${g.name}」今天的 ${todayCount} 条费用明细？台账本身和其他日期的历史资料都会保留。`,
          { okText: "删除今日" }
        );
        if (!ok) return;
        const result = await actions.clearLedgerDay(g.id, day);
        if (!result?.ok) {
          goalFormError.value = "删除失败，台账和历史资料均未改动。";
          return;
        }
        goalForm.value = null;
        return;
      }
      await actions.removeGoal(g.id);
      goalForm.value = null;
    }
    function onGoalRowMouseDown(event, goal) {
      if (isLedger(goal)) return;
      if (event.target.closest(PROGRESS_CONTROLS)) return;
      if (progressFor.value === goal.id) return;
      event.preventDefault();
      openProgress(goal);
    }
    async function openProgress(goal, mode = "add") {
      if (progressFor.value === goal.id) {
        progressMode.value = mode;
        progressEl.value?.focus();
        return;
      }
      progressFor.value = goal.id;
      progressMode.value = mode;
      progressValue.value = "";
      await nextTick();
      progressEl.value?.focus();
    }
    async function toggleProgressMode() {
      progressMode.value = progressMode.value === "sub" ? "add" : "sub";
      await nextTick();
      progressEl.value?.focus();
    }
    function cancelProgress() {
      progressValue.value = "";
      progressFor.value = null;
    }
    async function submitProgress(goal) {
      if (progressFor.value !== goal.id) return;
      const amount = Number(progressValue.value);
      const mode = progressMode.value;
      progressFor.value = null;
      progressValue.value = "";
      if (!Number.isFinite(amount) || amount === 0) return;
      await actions.addGoalProgress(goal.id, mode === "sub" ? -Math.abs(amount) : Math.abs(amount));
    }
    const confirmBox = ref(null);
    function askConfirm(text, { okText = "确定", danger = true } = {}) {
      return new Promise((resolve) => {
        confirmBox.value = { text, okText, danger, resolve };
      });
    }
    function closeConfirm(ok) {
      const box = confirmBox.value;
      confirmBox.value = null;
      box?.resolve(ok);
    }
    const goalsBodyEl = ref(null);
    const goalsInnerEl = ref(null);
    const goalsHeight = ref(null);
    const goalsScrollable = ref(false);
    const goalsSettling = ref(false);
    let goalsRO = null;
    let settleTimer = null;
    function syncGoalsScrollable() {
      if (goalsSettling.value) return;
      const inner = goalsInnerEl.value;
      const body = goalsBodyEl.value;
      if (!inner || !body) return;
      goalsScrollable.value = inner.offsetHeight > body.clientHeight + 1;
    }
    function measureGoals() {
      const inner = goalsInnerEl.value;
      if (!inner) return;
      const h = Math.ceil(inner.getBoundingClientRect().height);
      if (h !== goalsHeight.value) {
        if (goalsHeight.value !== null) {
          goalsSettling.value = true;
          clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            goalsSettling.value = false;
            syncGoalsScrollable();
          }, GOALS_ANIM_MS + 40);
        }
        goalsHeight.value = h;
      }
      nextTick(syncGoalsScrollable);
    }
    onMounted(() => {
      if (!goalsInnerEl.value) return;
      goalsRO = new ResizeObserver(measureGoals);
      goalsRO.observe(goalsInnerEl.value);
      measureGoals();
    });
    onUnmounted(() => {
      goalsRO?.disconnect();
      clearTimeout(settleTimer);
    });
    watch(
      () => [state.settings?.widget?.height, state.settings?.widget?.width],
      () => nextTick(measureGoals)
    );
    const expensesOf = (goalId) => state.expenses.filter((e) => e.goalId === goalId);
    const ledgerStats = computed(() => {
      const map = /* @__PURE__ */ new Map();
      const day = today.value;
      for (const g of state.goals) {
        if (g.mode !== "ledger") continue;
        const rows2 = expensesOf(g.id);
        const grouped = groupByPeriod(rows2, g.period);
        const key = periodKeyOfYmd(g.period, day);
        const prevKey = periodKeyOfYmd(g.period, stepPeriod(g.period, day, -1));
        const cur = summarize(grouped.get(key) || [], g);
        const prev = summarize(grouped.get(prevKey) || [], g);
        map.set(g.id, {
          key,
          cur,
          prev,
          ranking: opexRanking(cur, { goal: g }),
          opexVs: vsOf(compareWithPrev(cur.opex, prev.opex)),
          cogsVs: vsOf(compareWithPrev(cur.cogs, prev.cogs)),
          todayCount: rows2.filter((e) => e.date === day).length
        });
      }
      return map;
    });
    const statsOf = (g) => ledgerStats.value.get(g.id);
    const ledgerFor = ref(null);
    const ledgerCat = ref(null);
    const ledgerAmount = ref("");
    const ledgerNote = ref("");
    const ledgerDayBack = ref(0);
    const ledgerFlash = ref("");
    let flashTimer = null;
    const ledgerEl = ref(null);
    const setLedgerEl = (el) => {
      ledgerEl.value = el;
    };
    const DAY_BACK_LABELS = ["今天", "昨天", "前天"];
    const ledgerDate = computed(() => addYmdDays(today.value, -ledgerDayBack.value));
    const ledgerDayLabel = computed(() => DAY_BACK_LABELS[ledgerDayBack.value]);
    function cycleLedgerDay() {
      ledgerDayBack.value = (ledgerDayBack.value + 1) % DAY_BACK_LABELS.length;
      ledgerEl.value?.focus();
    }
    async function pickLedgerCat(goal, catId) {
      if (ledgerFor.value === goal.id && ledgerCat.value === catId) {
        closeLedger();
        return;
      }
      ledgerFor.value = goal.id;
      ledgerCat.value = catId;
      ledgerAmount.value = "";
      ledgerNote.value = "";
      await nextTick();
      ledgerEl.value?.focus();
    }
    function closeLedger() {
      ledgerFor.value = null;
      ledgerCat.value = null;
      ledgerAmount.value = "";
      ledgerNote.value = "";
    }
    function onLedgerBlankClick(event) {
      if (!ledgerFor.value) return;
      const target = event.target;
      if (target instanceof Element && target.closest(".wx-led-cat, .wx-led-day, .wx-led-amount, .wx-led-noteinput, .wx-led-ok")) return;
      closeLedger();
    }
    function onLedgerDocumentKeydown(event) {
      if (!ledgerFor.value || event.key !== "Escape") return;
      event.preventDefault();
      closeLedger();
    }
    onMounted(() => {
      document.addEventListener("keydown", onLedgerDocumentKeydown, true);
    });
    onUnmounted(() => {
      document.removeEventListener("keydown", onLedgerDocumentKeydown, true);
    });
    watch(
      () => state.goals,
      () => {
        if (!ledgerFor.value || !ledgerCat.value) return;
        const goal = state.goals.find((item) => item.id === ledgerFor.value && item.mode === "ledger");
        const category = goal ? catOf(goal, ledgerCat.value) : null;
        if (!category || category.archivedAt) closeLedger();
      },
      { deep: true }
    );
    async function submitLedger(goal) {
      const amount = Number(ledgerAmount.value);
      const cat = ledgerCat.value;
      if (!cat || !Number.isFinite(amount) || amount === 0) return;
      const entry = await actions.addExpense({
        goalId: goal.id,
        cat,
        amount,
        note: ledgerNote.value,
        date: ledgerDate.value
      });
      if (!entry) return;
      const name = catOf(goal, cat)?.name || "";
      const when = ledgerDayBack.value ? `${ledgerDayLabel.value} ` : "";
      flashLedger(`${when}${name} ${formatGoalNumber(amount)} 已记`);
      ledgerAmount.value = "";
      ledgerNote.value = "";
      await nextTick();
      ledgerEl.value?.focus();
    }
    function flashLedger(text) {
      ledgerFlash.value = text;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        ledgerFlash.value = "";
      }, 2200);
    }
    onUnmounted(() => clearTimeout(flashTimer));
    function vsOf(vs) {
      if (!vs || !vs.diff || vs.pct === null) return null;
      return { up: vs.diff > 0, text: `${Math.abs(vs.pct)}%` };
    }
    function ledgerToday(g) {
      const s = statsOf(g);
      if (!s) return "";
      if (!s.todayCount) return "今日未记";
      return `今日 ${s.todayCount} 笔`;
    }
    const stateOf = (t) => todoState(t, now.value);
    const deadlineOf = (t) => deadlineState(t, now.value);
    const ringOf = (t) => timerDeadlineState(t, now.value);
    const watchLabel = (t) => stopwatchLabel(elapsedMsOf(t, now.value));
    const doneLabel = (t) => durationLabel(t.elapsedMs);
    const leftLabel = (t) => remainingLabel(t, now.value);
    const locked = computed(() => !!state.settings?.widget?.locked);
    const toggleLock = () => actions.patchSettings({ widget: { locked: !locked.value } });
    const toggleTheme = () => actions.patchSettings({ theme: state.settings?.theme === "light" ? "dark" : "light" });
    const openingMain = ref(false);
    const openMain = async (target = null) => {
      if (openingMain.value) return;
      openingMain.value = true;
      try {
        await api.widget.openMain(target);
      } finally {
        openingMain.value = false;
      }
    };
    const openTodayExpenses = (g) => openMain({
      view: "expense",
      date: today.value,
      goalId: g.id
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["wx", { locked: locked.value }]),
        onClick: onLedgerBlankClick
      }, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("button", {
            class: normalizeClass(["wx-icon wx-text-btn", { active: locked.value }]),
            title: locked.value ? "已固定，点击取消固定" : "固定位置",
            onClick: toggleLock
          }, " 固定位置 ", 10, _hoisted_2),
          _cache[62] || (_cache[62] = createBaseVNode("div", { class: "wx-drag" }, null, -1)),
          createBaseVNode("button", {
            class: "wx-icon wx-text-btn",
            title: "打开月历",
            disabled: openingMain.value,
            "aria-busy": openingMain.value,
            onClick: _cache[0] || (_cache[0] = ($event) => openMain())
          }, " 打开月历 ", 8, _hoisted_3),
          createBaseVNode("button", {
            class: "wx-icon",
            title: "切换主题",
            onClick: toggleTheme
          }, [
            createVNode(_sfc_main$3, {
              name: unref(state).settings?.theme === "light" ? "moon" : "sun",
              size: 12
            }, null, 8, ["name"])
          ]),
          createBaseVNode("button", {
            class: "wx-icon",
            title: "隐藏小组件",
            onClick: _cache[1] || (_cache[1] = ($event) => unref(api).widget.hide())
          }, [
            createVNode(_sfc_main$3, {
              name: "x",
              size: 12
            })
          ])
        ]),
        createBaseVNode("div", _hoisted_4, [
          createBaseVNode("div", _hoisted_5, [
            createBaseVNode("div", _hoisted_6, [
              createBaseVNode("div", _hoisted_7, [
                _cache[63] || (_cache[63] = createBaseVNode("span", null, "今日", -1)),
                createBaseVNode("div", _hoisted_8, toDisplayString(d.value.getDate()), 1)
              ]),
              createBaseVNode("div", _hoisted_9, [
                createBaseVNode("div", _hoisted_10, toDisplayString(d.value.getFullYear()) + " 年 " + toDisplayString(d.value.getMonth() + 1) + " 月", 1),
                createBaseVNode("div", _hoisted_11, [
                  createBaseVNode("b", null, toDisplayString(weekday.value), 1),
                  info.value.jieQi ? (openBlock(), createElementBlock("span", _hoisted_12, toDisplayString(info.value.jieQi), 1)) : info.value.festivals.length ? (openBlock(), createElementBlock("span", _hoisted_13, toDisplayString(info.value.festivals[0]), 1)) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_14, [
                  createTextVNode(toDisplayString(info.value.full) + " ", 1),
                  _cache[64] || (_cache[64] = createBaseVNode("span", { class: "wx-sep" }, "·", -1)),
                  createTextVNode(" " + toDisplayString(info.value.yearGz), 1)
                ])
              ])
            ]),
            createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["wx-weather", [`is-${weather.value.status}`, `is-${weatherInfo.value.tone}`]]),
              title: weatherTitle.value,
              onClick: handleWeatherClick,
              onContextmenu: withModifiers(openWeatherForm, ["prevent"])
            }, [
              _cache[67] || (_cache[67] = createBaseVNode("div", { class: "wx-weather-k" }, "今日天气", -1)),
              weather.value.status === "ready" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createBaseVNode("div", _hoisted_16, [
                  createBaseVNode("span", _hoisted_17, [
                    createVNode(_sfc_main$3, {
                      class: "wx-weather-icon",
                      name: weatherInfo.value.icon,
                      size: 16
                    }, null, 8, ["name"])
                  ]),
                  createBaseVNode("b", null, toDisplayString(weather.value.temperature), 1),
                  _cache[65] || (_cache[65] = createBaseVNode("i", null, "°", -1))
                ]),
                createBaseVNode("div", _hoisted_18, toDisplayString(weatherInfo.value.label) + " · " + toDisplayString(weather.value.low) + "°～" + toDisplayString(weather.value.high) + "° ", 1)
              ], 64)) : weather.value.status === "loading" ? (openBlock(), createElementBlock("div", _hoisted_19, [..._cache[66] || (_cache[66] = [
                createBaseVNode("span", { class: "wx-weather-spin" }, null, -1),
                createTextVNode("获取中", -1)
              ])])) : (openBlock(), createElementBlock("div", _hoisted_20, [
                createVNode(_sfc_main$3, {
                  name: "sun",
                  size: 14
                }),
                createTextVNode(" " + toDisplayString(weatherActionLabel.value), 1)
              ]))
            ], 42, _hoisted_15),
            createBaseVNode("div", _hoisted_21, [
              _cache[69] || (_cache[69] = createBaseVNode("div", { class: "wx-time-k" }, "当前时间", -1)),
              createBaseVNode("div", _hoisted_22, toDisplayString(clock.value), 1),
              createBaseVNode("div", {
                class: normalizeClass(["wx-donerow", { has: doneCount.value }])
              }, [
                _cache[68] || (_cache[68] = createBaseVNode("span", null, "今日完成", -1)),
                createBaseVNode("b", null, toDisplayString(doneCount.value), 1)
              ], 2)
            ])
          ]),
          createBaseVNode("div", _hoisted_23, [
            createBaseVNode("div", _hoisted_24, [
              _cache[72] || (_cache[72] = createBaseVNode("div", { class: "wx-stat-k" }, "本年", -1)),
              createBaseVNode("div", _hoisted_25, [
                _cache[70] || (_cache[70] = createTextVNode("第 ", -1)),
                createBaseVNode("b", null, toDisplayString(weekNo.value), 1),
                _cache[71] || (_cache[71] = createTextVNode(" 周", -1))
              ])
            ]),
            createBaseVNode("div", _hoisted_26, [
              _cache[74] || (_cache[74] = createBaseVNode("div", { class: "wx-stat-k" }, "年内还剩", -1)),
              createBaseVNode("div", {
                class: normalizeClass(["wx-stat-v", { warn: daysLeft.value <= 30 }])
              }, [
                createBaseVNode("b", null, toDisplayString(daysLeft.value), 1),
                _cache[73] || (_cache[73] = createTextVNode(" 天 ", -1))
              ], 2)
            ]),
            createBaseVNode("div", _hoisted_27, [
              _cache[76] || (_cache[76] = createBaseVNode("div", { class: "wx-stat-k" }, "今日待办", -1)),
              createBaseVNode("div", {
                class: normalizeClass(["wx-stat-v", { clear: !openCount.value }])
              }, [
                openCount.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createBaseVNode("b", null, toDisplayString(openCount.value), 1),
                  _cache[75] || (_cache[75] = createTextVNode(" 件", -1))
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode("已清空")
                ], 64))
              ], 2)
            ]),
            createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["wx-stat wx-cd-stat", countdown.value ? `is-${countdown.value.mode}` : "is-empty"]),
              title: countdown.value ? `${countdown.value.title} · ${countdown.value.date}（点击修改）` : "点击设置一个时间节点",
              onClick: openCountdown
            }, [
              countdown.value ? (openBlock(), createElementBlock("div", _hoisted_29, [
                countdown.value?.mode === "future" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode("距离 " + toDisplayString(countdown.value.title), 1)
                ], 64)) : countdown.value?.mode === "past" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(countdown.value.title) + " 已过", 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(countdown.value.title), 1)
                ], 64))
              ])) : (openBlock(), createElementBlock("div", _hoisted_30, [..._cache[77] || (_cache[77] = [
                createBaseVNode("span", null, "正数/倒数", -1),
                createBaseVNode("span", null, "时间设置", -1)
              ])])),
              countdown.value?.mode === "today" ? (openBlock(), createElementBlock("div", _hoisted_31, " 就是今天 ")) : countdown.value ? (openBlock(), createElementBlock("div", _hoisted_32, [
                createBaseVNode("b", null, toDisplayString(countdown.value.days), 1),
                _cache[78] || (_cache[78] = createTextVNode(" 天 ", -1))
              ])) : createCommentVNode("", true)
            ], 10, _hoisted_28)
          ])
        ]),
        createBaseVNode("section", {
          class: normalizeClass(["wx-focusbar", `is-${focusTimer.value.status}`, { "is-active": focusTimer.value.status !== "idle" }]),
          style: normalizeStyle({ "--focus-progress": `${focusProgress.value}%` })
        }, [
          createBaseVNode("div", { class: "wx-focus-flipper" }, [
            createBaseVNode("div", {
              class: "wx-focus-face wx-focus-front",
              "aria-hidden": focusTimer.value.status !== "idle"
            }, [
              createBaseVNode("button", {
                class: "wx-focus-info",
                type: "button",
                title: "设置专注时长与查看今日记录",
                onClick: openFocusPanel
              }, [
                createBaseVNode("span", _hoisted_33, [
                  createBaseVNode("i", { class: "wx-focus-stopwatch" })
                ]),
                createBaseVNode("span", _hoisted_34, [
                  _cache[79] || (_cache[79] = createBaseVNode("b", null, "专注时间", -1)),
                  createBaseVNode("small", null, toDisplayString(focusStatusLabel.value), 1)
                ])
              ]),
              createBaseVNode("div", { class: "wx-focus-metrics" }, [
                createBaseVNode("button", {
                  class: "wx-focus-clock",
                  type: "button",
                  title: "查看本轮专注计划",
                  onClick: openFocusPanel
                }, [
                  _cache[80] || (_cache[80] = createBaseVNode("span", null, "本轮", -1)),
                  createBaseVNode("b", null, toDisplayString(focusClock.value), 1)
                ]),
                createBaseVNode("button", {
                  class: "wx-focus-summary",
                  type: "button",
                  title: "查看今日专注记录",
                  onClick: openFocusPanel
                }, [
                  createBaseVNode("span", null, "今日"),
                  createBaseVNode("b", null, toDisplayString(todayFocusLabel.value), 1)
                ])
              ]),
              createBaseVNode("button", {
                class: "wx-focus-primary",
                type: "button",
                title: "开始专注",
                onClick: handleFocusPrimary
              }, [
                createVNode(_sfc_main$3, {
                  name: "play",
                  size: 11
                }),
                createBaseVNode("span", null, "开始")
              ])
            ], 8, ["aria-hidden"]),
            createBaseVNode("div", {
              class: "wx-focus-face wx-focus-back",
              "aria-hidden": focusTimer.value.status === "idle"
            }, [
              createBaseVNode("div", { class: "wx-focus-live-status" }, [
                createBaseVNode("span", { class: "wx-focus-live-label" }, [
                  createBaseVNode("i", { class: "wx-focus-live-dot" }),
                  createBaseVNode("b", null, toDisplayString(focusTimer.value.status === "paused" ? "已暂停" : "专注中"), 1)
                ]),
                createBaseVNode("small", null, toDisplayString(focusTimer.value.durationMinutes) + " 分钟计划", 1)
              ]),
              createBaseVNode("button", {
                class: "wx-focus-active-clock",
                type: "button",
                title: "查看专注详情",
                onClick: openFocusPanel
              }, toDisplayString(focusClock.value), 1),
              createBaseVNode("div", { class: "wx-focus-active-actions" }, [
                createBaseVNode("button", {
                  class: "wx-focus-active-toggle",
                  type: "button",
                  title: focusTimer.value.status === "running" ? "暂停专注" : "继续专注",
                  onClick: handleFocusPrimary
                }, [
                  createVNode(_sfc_main$3, {
                    name: focusTimer.value.status === "running" ? "pause" : "play",
                    size: 12
                  }, null, 8, ["name"]),
                  createBaseVNode("span", null, toDisplayString(focusTimer.value.status === "running" ? "暂停" : "继续"), 1)
                ], 8, _hoisted_35),
                createBaseVNode("button", {
                  class: "wx-focus-cancel",
                  type: "button",
                  title: "取消本轮专注，不计入今日汇总",
                  onClick: cancelFocusFromBar
                }, "取消")
              ])
            ], 8, ["aria-hidden"])
          ])
        ], 6),
        createBaseVNode("section", {
          class: "wx-goals",
          title: `主任务 ${unref(state).goals.length}/${unref(MAX_GOALS)} · 右键新增 · 点某一行记进度`,
          onContextmenu: _cache[17] || (_cache[17] = withModifiers(($event) => openGoalForm(null), ["prevent"]))
        }, [
          createBaseVNode("div", _hoisted_37, [
            createBaseVNode("div", _hoisted_38, [
              _cache[81] || (_cache[81] = createBaseVNode("span", { class: "wx-goals-label" }, "主任务", -1)),
              createBaseVNode("span", _hoisted_39, [
                createBaseVNode("b", null, toDisplayString(unref(state).goals.length), 1),
                createBaseVNode("i", null, "/" + toDisplayString(unref(MAX_GOALS)), 1)
              ])
            ]),
            _cache[82] || (_cache[82] = createBaseVNode("span", {
              class: "wx-goals-rule",
              "aria-hidden": "true"
            }, null, -1)),
            createBaseVNode("button", {
              class: "wx-goals-add",
              disabled: goalLimitReached.value,
              title: goalLimitReached.value ? `最多只能添加 ${unref(MAX_GOALS)} 个主任务` : "新增主任务",
              onClick: _cache[2] || (_cache[2] = withModifiers(($event) => openGoalForm(null), ["stop"]))
            }, [
              createBaseVNode("span", _hoisted_41, [
                createVNode(_sfc_main$3, {
                  name: "plus",
                  size: 10
                })
              ]),
              createBaseVNode("span", null, toDisplayString(goalLimitReached.value ? "已满" : "新增"), 1)
            ], 8, _hoisted_40)
          ]),
          createBaseVNode("div", {
            ref_key: "goalsBodyEl",
            ref: goalsBodyEl,
            class: normalizeClass(["wx-goals-body", { settling: goalsSettling.value, scrollable: goalsScrollable.value }]),
            style: normalizeStyle(goalsHeight.value === null ? null : { height: goalsHeight.value + "px" })
          }, [
            createBaseVNode("div", {
              ref_key: "goalsInnerEl",
              ref: goalsInnerEl,
              class: "wx-goals-inner"
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(state).goals, (g) => {
                return openBlock(), createElementBlock("div", {
                  key: g.id,
                  class: normalizeClass(["wx-goal", { ledger: isLedger(g) }]),
                  style: normalizeStyle({ "--gc": g.color }),
                  title: goalRowTitle(g),
                  onMousedown: ($event) => onGoalRowMouseDown($event, g),
                  onContextmenu: withModifiers(($event) => openGoalForm(g), ["stop", "prevent"])
                }, [
                  isLedger(g) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createBaseVNode("div", _hoisted_43, [
                      createBaseVNode("span", _hoisted_44, toDisplayString(g.name), 1),
                      createBaseVNode("span", _hoisted_45, [
                        createBaseVNode("span", _hoisted_46, [
                          _cache[83] || (_cache[83] = createBaseVNode("i", null, "费用", -1)),
                          createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(statsOf(g)?.cur.opex || 0)), 1)
                        ]),
                        statsOf(g)?.cur.unclassified ? (openBlock(), createElementBlock("span", {
                          key: 0,
                          class: "wx-led-head legacy",
                          title: "迁移或恢复出的遗留/未分类记录"
                        }, [
                          createBaseVNode("i", null, "遗留"),
                          createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(statsOf(g).cur.unclassified)), 1)
                        ])) : createCommentVNode("", true),
                        createBaseVNode("span", {
                          class: "wx-led-head cogs",
                          title: `${unref(cogsLabel)(g)}单独一本账`
                        }, [
                          createBaseVNode("i", null, toDisplayString(unref(cogsLabel)(g)), 1),
                          createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(statsOf(g)?.cur.cogs || 0)), 1)
                        ], 8, _hoisted_47)
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_48, [
                      createBaseVNode("span", null, toDisplayString(goalPeriodTitle(g)), 1),
                      statsOf(g)?.cur.count ? (openBlock(), createElementBlock("span", _hoisted_49, toDisplayString(statsOf(g).cur.count) + " 笔 ", 1)) : createCommentVNode("", true),
                      createBaseVNode("span", _hoisted_50, [
                        ledgerToday(g) ? (openBlock(), createElementBlock("button", {
                          key: 0,
                          type: "button",
                          class: normalizeClass(["wx-led-today", { none: !statsOf(g)?.todayCount }]),
                          title: statsOf(g)?.todayCount ? `查看今天的 ${statsOf(g).todayCount} 笔费用明细` : "打开费用，查看或补记今天的记录",
                          disabled: openingMain.value,
                          onMousedown: _cache[3] || (_cache[3] = withModifiers(() => {
                          }, ["prevent", "stop"])),
                          onClick: withModifiers(($event) => openTodayExpenses(g), ["stop"])
                        }, toDisplayString(ledgerToday(g)), 43, _hoisted_51)) : createCommentVNode("", true),
                        statsOf(g)?.opexVs ? (openBlock(), createElementBlock("em", _hoisted_52, [
                          _cache[84] || (_cache[84] = createBaseVNode("span", null, "费用", -1)),
                          createBaseVNode("i", _hoisted_53, toDisplayString(statsOf(g).opexVs.up ? "▲" : "▼"), 1),
                          createBaseVNode("b", null, toDisplayString(statsOf(g).opexVs.text), 1)
                        ])) : createCommentVNode("", true),
                        statsOf(g)?.cogsVs ? (openBlock(), createElementBlock("em", {
                          key: 2,
                          class: "cogs",
                          title: `${unref(cogsLabel)(g)}较上一个周期`
                        }, [
                          createBaseVNode("span", null, toDisplayString(unref(cogsLabel)(g)), 1),
                          createBaseVNode("i", _hoisted_55, toDisplayString(statsOf(g).cogsVs.up ? "▲" : "▼"), 1),
                          createBaseVNode("b", null, toDisplayString(statsOf(g).cogsVs.text), 1)
                        ], 8, _hoisted_54)) : createCommentVNode("", true)
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_56, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(unref(opexCatsOf)(g).filter((c) => !c.archivedAt), (c) => {
                        return openBlock(), createElementBlock("button", {
                          key: c.id,
                          class: normalizeClass(["wx-led-cat", { on: ledgerFor.value === g.id && ledgerCat.value === c.id }]),
                          style: normalizeStyle({ "--cc": c.color }),
                          title: `记一笔${c.name}`,
                          onMousedown: _cache[4] || (_cache[4] = withModifiers(() => {
                          }, ["prevent", "stop"])),
                          onClick: withModifiers(($event) => pickLedgerCat(g, c.id), ["stop"])
                        }, toDisplayString(c.short), 47, _hoisted_57);
                      }), 128)),
                      (openBlock(true), createElementBlock(Fragment, null, renderList(unref(cogsCatsOf)(g).filter((c) => !c.archivedAt), (c) => {
                        return openBlock(), createElementBlock("button", {
                          key: c.id,
                          class: normalizeClass(["wx-led-cat cogs", { on: ledgerFor.value === g.id && ledgerCat.value === c.id }]),
                          style: normalizeStyle({ "--cc": c.color }),
                          title: `记一笔${c.name}（单独一本账）`,
                          onMousedown: _cache[5] || (_cache[5] = withModifiers(() => {
                          }, ["prevent", "stop"])),
                          onClick: withModifiers(($event) => pickLedgerCat(g, c.id), ["stop"])
                        }, toDisplayString(c.short), 47, _hoisted_58);
                      }), 128))
                    ]),
                    ledgerFor.value === g.id ? (openBlock(), createElementBlock("div", _hoisted_59, [
                      createBaseVNode("button", {
                        class: normalizeClass(["wx-led-day", { back: ledgerDayBack.value > 0 }]),
                        title: "点击切换记账日期：今天 / 昨天 / 前天。再往前补录去主界面月历",
                        onMousedown: _cache[6] || (_cache[6] = withModifiers(() => {
                        }, ["prevent", "stop"])),
                        onClick: withModifiers(cycleLedgerDay, ["stop"])
                      }, toDisplayString(ledgerDayLabel.value), 35),
                      withDirectives(createBaseVNode("input", {
                        ref_for: true,
                        ref: setLedgerEl,
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => ledgerAmount.value = $event),
                        class: "wx-led-amount",
                        type: "number",
                        step: "any",
                        inputmode: "decimal",
                        placeholder: `${g.unit || "元"}，回车记账`,
                        onClick: _cache[8] || (_cache[8] = withModifiers(() => {
                        }, ["stop"])),
                        onKeyup: [
                          withKeys(($event) => submitLedger(g), ["enter"]),
                          withKeys(closeLedger, ["esc"])
                        ]
                      }, null, 40, _hoisted_60), [
                        [vModelText, ledgerAmount.value]
                      ]),
                      createBaseVNode("button", {
                        class: "wx-led-ok",
                        title: "记这一笔（回车同效）",
                        onMousedown: _cache[9] || (_cache[9] = withModifiers(() => {
                        }, ["prevent", "stop"])),
                        onClick: withModifiers(($event) => submitLedger(g), ["stop"])
                      }, [
                        createVNode(_sfc_main$3, {
                          name: "check",
                          size: 11
                        })
                      ], 40, _hoisted_61)
                    ])) : createCommentVNode("", true),
                    ledgerFor.value === g.id ? (openBlock(), createElementBlock("div", _hoisted_62, [
                      withDirectives(createBaseVNode("input", {
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => ledgerNote.value = $event),
                        class: "wx-led-noteinput",
                        maxlength: "60",
                        placeholder: "备注（选填），回车一并记入",
                        onClick: _cache[11] || (_cache[11] = withModifiers(() => {
                        }, ["stop"])),
                        onKeyup: [
                          withKeys(($event) => submitLedger(g), ["enter"]),
                          withKeys(closeLedger, ["esc"])
                        ]
                      }, null, 40, _hoisted_63), [
                        [vModelText, ledgerNote.value]
                      ])
                    ])) : createCommentVNode("", true),
                    ledgerFor.value === g.id ? (openBlock(), createElementBlock("div", _hoisted_64, toDisplayString(ledgerFlash.value), 1)) : createCommentVNode("", true),
                    createBaseVNode("div", _hoisted_65, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(statsOf(g)?.ranking || [], (r) => {
                        return openBlock(), createElementBlock("div", {
                          key: r.id,
                          class: "wx-led-row"
                        }, [
                          createBaseVNode("span", _hoisted_66, toDisplayString(r.name), 1),
                          createBaseVNode("span", _hoisted_67, [
                            createBaseVNode("i", {
                              style: normalizeStyle({ width: r.width + "%", background: r.color })
                            }, null, 4)
                          ]),
                          createBaseVNode("span", _hoisted_68, toDisplayString(unref(formatGoalNumber)(r.amount)), 1),
                          createBaseVNode("span", _hoisted_69, toDisplayString(r.share) + "%", 1)
                        ]);
                      }), 128)),
                      !(statsOf(g)?.ranking || []).length && !statsOf(g)?.cur.unclassified ? (openBlock(), createElementBlock("div", _hoisted_70, " 本期还没有费用，点上面的类别记第一笔 ")) : createCommentVNode("", true),
                      !(statsOf(g)?.ranking || []).length && statsOf(g)?.cur.unclassified ? (openBlock(), createElementBlock("div", {
                        key: 1,
                        class: "wx-led-blank legacy"
                      }, "本期只有遗留/未分类记录，金额已在上方单独列示")) : createCommentVNode("", true)
                    ])
                  ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createBaseVNode("div", _hoisted_71, [
                      createBaseVNode("span", _hoisted_72, toDisplayString(g.name), 1),
                      progressFor.value === g.id ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                        createBaseVNode("button", {
                          class: normalizeClass(["wx-goal-sign", progressMode.value]),
                          title: progressMode.value === "sub" ? "当前为减少，点击改成增加" : "当前为增加，点击改成减少",
                          onMousedown: withModifiers(toggleProgressMode, ["prevent", "stop"]),
                          onClick: _cache[12] || (_cache[12] = withModifiers(() => {
                          }, ["stop"]))
                        }, toDisplayString(progressMode.value === "sub" ? "−" : "+"), 43, _hoisted_73),
                        withDirectives(createBaseVNode("input", {
                          ref_for: true,
                          ref: setProgressEl,
                          "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => progressValue.value = $event),
                          class: normalizeClass(["wx-goal-input", progressMode.value]),
                          type: "number",
                          step: "any",
                          min: "0",
                          placeholder: progressMode.value === "sub" ? "减多少" : "加多少",
                          onClick: _cache[14] || (_cache[14] = withModifiers(() => {
                          }, ["stop"])),
                          onKeyup: [
                            withKeys(($event) => submitProgress(g), ["enter"]),
                            withKeys(cancelProgress, ["esc"])
                          ],
                          onBlur: ($event) => submitProgress(g)
                        }, null, 42, _hoisted_74), [
                          [vModelText, progressValue.value]
                        ])
                      ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                        createBaseVNode("span", _hoisted_75, [
                          createBaseVNode("button", {
                            class: "wx-goal-step sub",
                            title: "减少进度",
                            onMousedown: _cache[15] || (_cache[15] = withModifiers(() => {
                            }, ["prevent"])),
                            onClick: withModifiers(($event) => openProgress(g, "sub"), ["stop"])
                          }, [
                            createVNode(_sfc_main$3, {
                              name: "min",
                              size: 10
                            })
                          ], 40, _hoisted_76),
                          createBaseVNode("button", {
                            class: "wx-goal-step add",
                            title: "增加进度",
                            onMousedown: _cache[16] || (_cache[16] = withModifiers(() => {
                            }, ["prevent"])),
                            onClick: withModifiers(($event) => openProgress(g, "add"), ["stop"])
                          }, [
                            createVNode(_sfc_main$3, {
                              name: "plus",
                              size: 10
                            })
                          ], 40, _hoisted_77)
                        ]),
                        isAccum(g) ? (openBlock(), createElementBlock("span", _hoisted_78, [
                          createBaseVNode("b", null, toDisplayString(unref(formatGoalNumber)(goalValue(g))), 1),
                          g.unit ? (openBlock(), createElementBlock("i", _hoisted_79, toDisplayString(g.unit), 1)) : createCommentVNode("", true)
                        ])) : (openBlock(), createElementBlock("span", _hoisted_80, [
                          createBaseVNode("b", null, toDisplayString(pct(g)), 1),
                          _cache[86] || (_cache[86] = createBaseVNode("i", null, "%", -1))
                        ]))
                      ], 64))
                    ]),
                    isAccum(g) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createBaseVNode("div", _hoisted_81, [
                        createBaseVNode("span", null, toDisplayString(goalPeriodTitle(g)), 1),
                        goalPrev(g) ? (openBlock(), createElementBlock("span", _hoisted_82, " 上期 " + toDisplayString(unref(formatGoalNumber)(goalPrev(g).total)) + toDisplayString(g.unit), 1)) : createCommentVNode("", true)
                      ]),
                      createBaseVNode("div", _hoisted_83, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(goalBars(g), (b) => {
                          return openBlock(), createElementBlock("span", {
                            key: b.key,
                            class: normalizeClass(["wx-spark-bar", { now: b.now }]),
                            style: normalizeStyle({ height: b.h + "%" }),
                            title: `${unref(periodShortLabel)(g.period, b.key)}　${unref(formatGoalNumber)(b.total)}${g.unit}`
                          }, null, 14, _hoisted_84);
                        }), 128))
                      ])
                    ], 64)) : (openBlock(), createElementBlock("div", _hoisted_85, [
                      createBaseVNode("i", {
                        style: normalizeStyle({ width: barPct(g) + "%" })
                      }, null, 4)
                    ]))
                  ], 64))
                ], 46, _hoisted_42);
              }), 128)),
              !unref(state).goals.length ? (openBlock(), createElementBlock("div", _hoisted_86, " 点击“新增”，添加第一个主任务 ")) : createCommentVNode("", true)
            ], 512)
          ], 6)
        ], 40, _hoisted_36),
        unsorted.value.length ? (openBlock(), createElementBlock("div", _hoisted_87, toDisplayString(unsorted.value.length) + " 条未分象限，已暂放在「重要且紧急」 ", 1)) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_88, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(QUADRANTS), (q) => {
            return openBlock(), createElementBlock("section", {
              key: q.id,
              class: normalizeClass(["wx-quad", {
                "is-drag-origin": draggedTodoId.value && dragOriginQuadrant.value === q.id,
                "is-drop-target": draggedTodoId.value && dragTargetQuadrant.value === q.id && dragOriginQuadrant.value !== q.id
              }]),
              style: normalizeStyle({ "--qc": q.color }),
              onDragover: ($event) => overTodoQuadrant($event, q.id),
              onDragleave: ($event) => leaveTodoQuadrant($event, q.id),
              onDrop: ($event) => dropTodoIntoQuadrant($event, q.id),
              onContextmenu: withModifiers(($event) => openCompose(q.id), ["prevent"])
            }, [
              createBaseVNode("header", _hoisted_90, [
                _cache[87] || (_cache[87] = createBaseVNode("span", { class: "wx-qmark" }, [
                  createBaseVNode("span", { class: "wx-qdot" })
                ], -1)),
                createBaseVNode("span", _hoisted_91, [
                  createBaseVNode("span", _hoisted_92, toDisplayString(q.name), 1),
                  createBaseVNode("span", _hoisted_93, toDisplayString(draggedTodoId.value && dragTargetQuadrant.value === q.id && dragOriginQuadrant.value !== q.id ? "松开移入" : q.hint), 1)
                ]),
                createBaseVNode("span", {
                  class: normalizeClass(["wx-qn", { has: quadrantOpenCount(q.id) > 0 }])
                }, toDisplayString(quadrantOpenCount(q.id)), 3)
              ]),
              createBaseVNode("div", _hoisted_94, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(inQuadrant(q.id), (t) => {
                  return openBlock(), createElementBlock("article", {
                    key: t.id,
                    class: normalizeClass(["wx-card", [
                      `is-${stateOf(t)}`,
                      ringOf(t) ? `ring-${ringOf(t)}` : "",
                      { "is-dragging": draggedTodoId.value === t.id }
                    ]]),
                    title: `${t.title}
拖拽切换象限 · 双击修改 · 右键更多操作`,
                    draggable: "true",
                    onDragstart: ($event) => startTodoDrag($event, t, q.id),
                    onDragend: resetTodoDrag,
                    onDblclick: ($event) => editTodo(t),
                    onContextmenu: withModifiers(($event) => openTodoMenu($event, t), ["stop", "prevent"])
                  }, [
                    createBaseVNode("div", _hoisted_96, [
                      createVNode(ScrollingTitle, {
                        class: "wx-card-title",
                        text: t.title
                      }, null, 8, ["text"]),
                      createBaseVNode("div", _hoisted_97, [
                        !t.done ? (openBlock(), createElementBlock("button", {
                          key: 0,
                          class: normalizeClass(["wx-act", { on: t.startedAt }]),
                          title: t.startedAt ? "结束计时" : "开始",
                          onClick: withModifiers(($event) => unref(actions).toggleTimer(t), ["stop"])
                        }, [
                          createVNode(_sfc_main$3, {
                            name: t.startedAt ? "stop" : "play",
                            size: 10
                          }, null, 8, ["name"])
                        ], 10, _hoisted_98)) : createCommentVNode("", true),
                        createBaseVNode("button", {
                          class: normalizeClass(["wx-act check", { on: t.done }]),
                          title: t.done ? "取消完成" : "完成",
                          onClick: withModifiers(($event) => unref(actions).toggleTodo(t.id), ["stop"])
                        }, [
                          createVNode(_sfc_main$3, {
                            name: "check",
                            size: 10
                          })
                        ], 10, _hoisted_99)
                      ])
                    ]),
                    createVNode(ScrollingRow, { class: "wx-card-meta" }, {
                      default: withCtx(() => [
                        dateChip(t) ? (openBlock(), createElementBlock("span", _hoisted_100, toDisplayString(dateChip(t)), 1)) : createCommentVNode("", true),
                        unref(taskStartTime)(t) ? (openBlock(), createElementBlock("span", _hoisted_101, " 开始 " + toDisplayString(unref(taskStartTime)(t)), 1)) : createCommentVNode("", true),
                        unref(taskStartTime)(t) && unref(taskEndTime)(t) ? (openBlock(), createElementBlock("span", _hoisted_102, " 预计 " + toDisplayString(unref(taskDurationMinutes)(t)) + " 分钟完成 ", 1)) : unref(taskEndTime)(t) ? (openBlock(), createElementBlock("span", _hoisted_103, " 结束 " + toDisplayString(unref(taskEndTime)(t)), 1)) : createCommentVNode("", true),
                        stateOf(t) === "running" ? (openBlock(), createElementBlock("span", _hoisted_104, toDisplayString(watchLabel(t)), 1)) : t.done ? (openBlock(), createElementBlock(Fragment, { key: 5 }, [
                          doneLabel(t) ? (openBlock(), createElementBlock("span", _hoisted_105, " 完成用时：" + toDisplayString(doneLabel(t)), 1)) : createCommentVNode("", true)
                        ], 64)) : leftLabel(t) ? (openBlock(), createElementBlock("span", {
                          key: 6,
                          class: normalizeClass(["wx-chip", deadlineOf(t)])
                        }, toDisplayString(leftLabel(t)), 3)) : t.elapsedMs > 0 ? (openBlock(), createElementBlock("span", _hoisted_106, " 已计 " + toDisplayString(doneLabel(t)), 1)) : createCommentVNode("", true)
                      ]),
                      _: 2
                    }, 1024)
                  ], 42, _hoisted_95);
                }), 128)),
                !inQuadrant(q.id).length ? (openBlock(), createElementBlock("div", _hoisted_107, toDisplayString(draggedTodoId.value && dragTargetQuadrant.value === q.id ? "松开移入" : "右键新增"), 1)) : createCommentVNode("", true)
              ])
            ], 46, _hoisted_89);
          }), 128))
        ]),
        todoMenu.value ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: "wx-context-layer",
          onPointerdown: _cache[23] || (_cache[23] = ($event) => todoMenu.value = null),
          onContextmenu: _cache[24] || (_cache[24] = withModifiers(($event) => todoMenu.value = null, ["prevent"]))
        }, [
          createBaseVNode("div", {
            class: "wx-context-menu",
            style: normalizeStyle({ left: `${todoMenu.value.x}px`, top: `${todoMenu.value.y}px` }),
            onPointerdown: _cache[21] || (_cache[21] = withModifiers(() => {
            }, ["stop"])),
            onContextmenu: _cache[22] || (_cache[22] = withModifiers(() => {
            }, ["prevent"]))
          }, [
            createBaseVNode("button", {
              onClick: _cache[18] || (_cache[18] = ($event) => runTodoMenu("edit"))
            }, "修改"),
            createBaseVNode("button", {
              onClick: _cache[19] || (_cache[19] = ($event) => runTodoMenu("add"))
            }, "新增"),
            createBaseVNode("button", {
              class: "danger",
              onClick: _cache[20] || (_cache[20] = ($event) => runTodoMenu("delete"))
            }, "删除")
          ], 36)
        ], 32)) : createCommentVNode("", true),
        focusPanel.value ? (openBlock(), createElementBlock("div", {
          key: 2,
          class: "wx-mask",
          onClick: withModifiers(closeFocusPanel, ["self"])
        }, [
          createBaseVNode("div", {
            class: normalizeClass(["wx-form wx-focus-panel", `is-${focusTimer.value.status}`]),
            onKeyup: withKeys(closeFocusPanel, ["esc"])
          }, [
            createBaseVNode("div", _hoisted_108, [
              createBaseVNode("span", _hoisted_109, [
                createBaseVNode("i", { class: "wx-focus-panel-mark", "aria-hidden": "true" }, [
                  createBaseVNode("i", { class: "wx-focus-stopwatch" })
                ])
              ]),
              _cache[88] || (_cache[88] = createBaseVNode("span", null, [
                createBaseVNode("b", null, "专注时间"),
                createBaseVNode("small", null, "自定义倒计时 · 每日自动汇总")
              ], -1)),
              createBaseVNode("i", {
                class: normalizeClass(`is-${focusTimer.value.status}`)
              }, toDisplayString(focusStatusLabel.value), 3)
            ]),
            createBaseVNode("div", _hoisted_110, [
              createBaseVNode("div", {
                class: "wx-focus-ring",
                style: normalizeStyle({ "--focus-deg": `${focusProgress.value * 3.6}deg` })
              }, [
                createBaseVNode("div", null, [
                  createBaseVNode("span", null, toDisplayString(focusTimer.value.status === "idle" ? "本轮时长" : "剩余时间"), 1),
                  createBaseVNode("b", null, toDisplayString(focusClock.value), 1),
                  createBaseVNode("small", null, toDisplayString(focusTimer.value.durationMinutes) + " 分钟计划", 1)
                ])
              ], 4),
              createBaseVNode("div", _hoisted_111, [
                _cache[89] || (_cache[89] = createBaseVNode("span", null, "今日专注", -1)),
                createBaseVNode("b", null, toDisplayString(todayFocusLabel.value), 1),
                createBaseVNode("small", null, "已完成 " + toDisplayString(todayFocusSessions.value.length) + " 轮", 1)
              ])
            ]),
            _cache[93] || (_cache[93] = createBaseVNode("div", { class: "wx-focus-section-title" }, [
              createBaseVNode("span", null, "设置本轮时长"),
              createBaseVNode("small", null, "1～240 分钟")
            ], -1)),
            createBaseVNode("div", _hoisted_112, [
              (openBlock(), createElementBlock(Fragment, null, renderList(FOCUS_PRESETS, (minutes) => {
                return createBaseVNode("button", {
                  key: minutes,
                  type: "button",
                  class: normalizeClass({ on: focusMinutesDraft.value === minutes }),
                  disabled: focusTimer.value.status !== "idle",
                  onClick: ($event) => chooseFocusMinutes(minutes)
                }, [
                  createBaseVNode("b", null, toDisplayString(minutes), 1),
                  _cache[90] || (_cache[90] = createBaseVNode("span", null, "分钟", -1))
                ], 10, _hoisted_113);
              }), 64)),
              createBaseVNode("label", {
                class: normalizeClass({ disabled: focusTimer.value.status !== "idle" })
              }, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[25] || (_cache[25] = ($event) => focusMinutesDraft.value = $event),
                  type: "number",
                  min: "1",
                  max: "240",
                  disabled: focusTimer.value.status !== "idle",
                  onChange: _cache[26] || (_cache[26] = ($event) => focusMinutesDraft.value = clampFocusMinutes(focusMinutesDraft.value))
                }, null, 40, _hoisted_114), [
                  [
                    vModelText,
                    focusMinutesDraft.value,
                    void 0,
                    { number: true }
                  ]
                ]),
                _cache[91] || (_cache[91] = createBaseVNode("span", null, "自定义", -1))
              ], 2)
            ]),
            createBaseVNode("div", _hoisted_115, [
              createBaseVNode("div", _hoisted_116, [
                _cache[92] || (_cache[92] = createBaseVNode("span", null, "今日记录", -1)),
                createBaseVNode("small", null, toDisplayString(todayFocusSessions.value.length ? "最近完成" : "开始第一轮专注吧"), 1)
              ]),
              todayFocusSessions.value.length ? (openBlock(), createElementBlock("div", _hoisted_117, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(todayFocusSessions.value.slice(0, 4), (session) => {
                  return openBlock(), createElementBlock("div", {
                    key: session.id
                  }, [
                    createBaseVNode("span", null, toDisplayString(focusSessionTime(session.endedAt)), 1),
                    createBaseVNode("b", null, toDisplayString(formatFocusTotal(session.focusedMs)), 1),
                    createBaseVNode("i", null, toDisplayString(session.completed ? "完整完成" : "提前结束"), 1)
                  ]);
                }), 128))
              ])) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_118, [
              focusTimer.value.status !== "idle" ? (openBlock(), createElementBlock("button", {
                key: 0,
                class: "wx-btn danger",
                type: "button",
                onClick: cancelFocus
              }, " 放弃本轮 ")) : createCommentVNode("", true),
              focusTimer.value.status !== "idle" ? (openBlock(), createElementBlock("button", {
                key: 1,
                class: "wx-btn",
                type: "button",
                onClick: finishFocus
              }, " 结束并记录 ")) : (openBlock(), createElementBlock("button", {
                key: 2,
                class: "wx-btn",
                type: "button",
                onClick: closeFocusPanel
              }, "关闭")),
              createBaseVNode("button", {
                class: "wx-btn primary wx-focus-action-primary",
                type: "button",
                onClick: _cache[27] || (_cache[27] = ($event) => focusTimer.value.status === "idle" ? startFocus(focusMinutesDraft.value) : handleFocusPrimary())
              }, [
                createVNode(_sfc_main$3, {
                  name: focusTimer.value.status === "running" ? "pause" : "play",
                  size: 11
                }, null, 8, ["name"]),
                createBaseVNode("span", null, toDisplayString(focusTimer.value.status === "running" ? "暂停" : focusTimer.value.status === "paused" ? "继续专注" : "开始专注"), 1)
              ])
            ])
          ], 34)
        ])) : createCommentVNode("", true),
        compose.value ? (openBlock(), createElementBlock("div", {
          key: 3,
          class: "wx-mask",
          onClick: _cache[36] || (_cache[36] = withModifiers(($event) => compose.value = null, ["self"]))
        }, [
          createBaseVNode("div", {
            class: "wx-form",
            onKeyup: _cache[35] || (_cache[35] = withKeys(($event) => compose.value = null, ["esc"]))
          }, [
            createBaseVNode("div", _hoisted_119, [
              createBaseVNode("span", {
                class: "wx-qdot",
                style: normalizeStyle({ "--qc": unref(QUADRANTS).find((q) => q.id === compose.value.quadrant)?.color })
              }, null, 4),
              createTextVNode(" " + toDisplayString(compose.value.id ? "修改待办" : "新增到") + "「" + toDisplayString(unref(QUADRANTS).find((q) => q.id === compose.value.quadrant)?.name) + "」 ", 1)
            ]),
            withDirectives(createBaseVNode("input", {
              ref_key: "titleEl",
              ref: titleEl,
              "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event) => compose.value.title = $event),
              class: "wx-input",
              placeholder: "要做什么？回车保存",
              onKeyup: withKeys(saveCompose, ["enter"])
            }, null, 544), [
              [vModelText, compose.value.title]
            ]),
            createBaseVNode("div", _hoisted_120, [
              createBaseVNode("label", null, [
                _cache[94] || (_cache[94] = createBaseVNode("span", null, "日期", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event) => compose.value.date = $event),
                  class: "wx-input",
                  type: "date"
                }, null, 512), [
                  [vModelText, compose.value.date]
                ])
              ])
            ]),
            createBaseVNode("div", _hoisted_121, [
              createBaseVNode("label", null, [
                createBaseVNode("span", null, [
                  _cache[95] || (_cache[95] = createTextVNode(" 任务开始时间（选填） ", -1)),
                  compose.value.startTime ? (openBlock(), createElementBlock("button", {
                    key: 0,
                    type: "button",
                    class: "wx-clear",
                    title: "清空开始时间",
                    onClick: _cache[30] || (_cache[30] = withModifiers(($event) => compose.value.startTime = "", ["prevent", "stop"]))
                  }, " 清空 ")) : createCommentVNode("", true)
                ]),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[31] || (_cache[31] = ($event) => compose.value.startTime = $event),
                  class: "wx-input",
                  type: "time"
                }, null, 512), [
                  [vModelText, compose.value.startTime]
                ])
              ]),
              createBaseVNode("label", null, [
                createBaseVNode("span", null, [
                  _cache[96] || (_cache[96] = createTextVNode(" 任务结束时间（选填） ", -1)),
                  compose.value.endTime ? (openBlock(), createElementBlock("button", {
                    key: 0,
                    type: "button",
                    class: "wx-clear",
                    title: "清空结束时间",
                    onClick: _cache[32] || (_cache[32] = withModifiers(($event) => compose.value.endTime = "", ["prevent", "stop"]))
                  }, " 清空 ")) : createCommentVNode("", true)
                ]),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[33] || (_cache[33] = ($event) => compose.value.endTime = $event),
                  class: "wx-input",
                  type: "time"
                }, null, 512), [
                  [vModelText, compose.value.endTime]
                ])
              ])
            ]),
            composeDuration.value !== null ? (openBlock(), createElementBlock("div", _hoisted_122, [
              createTextVNode(" 预计 " + toDisplayString(composeDuration.value) + " 分钟完成 ", 1),
              compose.value.endTime < compose.value.startTime ? (openBlock(), createElementBlock("span", _hoisted_123, "（次日结束）")) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_124, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(QUADRANTS), (q) => {
                return openBlock(), createElementBlock("button", {
                  key: q.id,
                  class: normalizeClass(["wx-pill", { on: compose.value.quadrant === q.id }]),
                  style: normalizeStyle({ "--qc": q.color }),
                  onClick: ($event) => compose.value.quadrant = q.id
                }, toDisplayString(q.name), 15, _hoisted_125);
              }), 128))
            ]),
            composeHint.value ? (openBlock(), createElementBlock("div", _hoisted_126, toDisplayString(composeHint.value), 1)) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_127, [
              compose.value.id ? (openBlock(), createElementBlock("button", {
                key: 0,
                class: "wx-btn danger",
                onClick: deleteCompose
              }, "删除")) : createCommentVNode("", true),
              createBaseVNode("button", {
                class: "wx-btn",
                onClick: _cache[34] || (_cache[34] = ($event) => compose.value = null)
              }, "取消"),
              createBaseVNode("button", {
                class: "wx-btn primary",
                onClick: saveCompose
              }, "保存")
            ])
          ], 32)
        ])) : createCommentVNode("", true),
        goalForm.value ? (openBlock(), createElementBlock("div", {
          key: 4,
          class: "wx-mask",
          onClick: _cache[51] || (_cache[51] = withModifiers(($event) => goalForm.value = null, ["self"]))
        }, [
          createBaseVNode("div", {
            class: "wx-form",
            onKeyup: _cache[50] || (_cache[50] = withKeys(($event) => goalForm.value = null, ["esc"]))
          }, [
            createBaseVNode("div", _hoisted_128, toDisplayString(goalForm.value.id ? "修改主任务" : "新建主任务"), 1),
            withDirectives(createBaseVNode("input", {
              ref_key: "goalNameEl",
              ref: goalNameEl,
              "onUpdate:modelValue": _cache[37] || (_cache[37] = ($event) => goalForm.value.name = $event),
              class: "wx-input",
              placeholder: goalNamePlaceholder.value,
              onKeyup: withKeys(saveGoal, ["enter"])
            }, null, 40, _hoisted_129), [
              [vModelText, goalForm.value.name]
            ]),
            createBaseVNode("div", _hoisted_130, [
              createBaseVNode("button", {
                class: normalizeClass(["wx-mode", { on: goalForm.value.mode === "target" }]),
                onClick: _cache[38] || (_cache[38] = ($event) => goalForm.value.mode = "target")
              }, [..._cache[97] || (_cache[97] = [
                createBaseVNode("b", null, "目标", -1),
                createBaseVNode("i", null, "给总值，算完成百分比", -1)
              ])], 2),
              createBaseVNode("button", {
                class: normalizeClass(["wx-mode", { on: goalForm.value.mode === "accumulate" }]),
                onClick: _cache[39] || (_cache[39] = ($event) => goalForm.value.mode = "accumulate")
              }, [..._cache[98] || (_cache[98] = [
                createBaseVNode("b", null, "累计", -1),
                createBaseVNode("i", null, "按周期记流水，到期归零", -1)
              ])], 2),
              createBaseVNode("button", {
                class: normalizeClass(["wx-mode", { on: goalForm.value.mode === "ledger" }]),
                onClick: _cache[40] || (_cache[40] = ($event) => goalForm.value.mode = "ledger")
              }, [..._cache[99] || (_cache[99] = [
                createBaseVNode("b", null, "台账", -1),
                createBaseVNode("i", null, "七类费用，按天记明细", -1)
              ])], 2)
            ]),
            goalForm.value.mode === "ledger" ? (openBlock(), createElementBlock("div", _hoisted_131, [
              createBaseVNode("label", null, [
                _cache[100] || (_cache[100] = createBaseVNode("span", null, "统计周期", -1)),
                withDirectives(createBaseVNode("select", {
                  "onUpdate:modelValue": _cache[41] || (_cache[41] = ($event) => goalForm.value.period = $event),
                  class: "wx-input"
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(GOAL_PERIODS), (p) => {
                    return openBlock(), createElementBlock("option", {
                      key: p.id,
                      value: p.id
                    }, toDisplayString(p.name), 9, _hoisted_132);
                  }), 128))
                ], 512), [
                  [vModelSelect, goalForm.value.period]
                ])
              ]),
              createBaseVNode("label", null, [
                _cache[101] || (_cache[101] = createBaseVNode("span", null, "单位", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[42] || (_cache[42] = ($event) => goalForm.value.unit = $event),
                  class: "wx-input",
                  placeholder: "元",
                  maxlength: "8"
                }, null, 512), [
                  [vModelText, goalForm.value.unit]
                ])
              ])
            ])) : goalForm.value.mode === "target" ? (openBlock(), createElementBlock("div", _hoisted_133, [
              createBaseVNode("label", null, [
                _cache[102] || (_cache[102] = createBaseVNode("span", null, "总值", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[43] || (_cache[43] = ($event) => goalForm.value.target = $event),
                  class: "wx-input",
                  type: "number",
                  step: "any",
                  min: "0.01"
                }, null, 512), [
                  [vModelText, goalForm.value.target]
                ])
              ]),
              createBaseVNode("label", null, [
                _cache[103] || (_cache[103] = createBaseVNode("span", null, "单位", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[44] || (_cache[44] = ($event) => goalForm.value.unit = $event),
                  class: "wx-input",
                  placeholder: "本",
                  maxlength: "8"
                }, null, 512), [
                  [vModelText, goalForm.value.unit]
                ])
              ]),
              createBaseVNode("label", null, [
                _cache[104] || (_cache[104] = createBaseVNode("span", null, "当前", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[45] || (_cache[45] = ($event) => goalForm.value.current = $event),
                  class: "wx-input",
                  type: "number",
                  step: "any"
                }, null, 512), [
                  [vModelText, goalForm.value.current]
                ])
              ])
            ])) : (openBlock(), createElementBlock("div", _hoisted_134, [
              createBaseVNode("label", null, [
                _cache[105] || (_cache[105] = createBaseVNode("span", null, "统计周期", -1)),
                withDirectives(createBaseVNode("select", {
                  "onUpdate:modelValue": _cache[46] || (_cache[46] = ($event) => goalForm.value.period = $event),
                  class: "wx-input"
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(GOAL_PERIODS), (p) => {
                    return openBlock(), createElementBlock("option", {
                      key: p.id,
                      value: p.id
                    }, toDisplayString(p.name), 9, _hoisted_135);
                  }), 128))
                ], 512), [
                  [vModelSelect, goalForm.value.period]
                ])
              ]),
              createBaseVNode("label", null, [
                _cache[106] || (_cache[106] = createBaseVNode("span", null, "单位", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[47] || (_cache[47] = ($event) => goalForm.value.unit = $event),
                  class: "wx-input",
                  placeholder: "元",
                  maxlength: "8"
                }, null, 512), [
                  [vModelText, goalForm.value.unit]
                ])
              ]),
              createBaseVNode("label", null, [
                _cache[107] || (_cache[107] = createBaseVNode("span", null, "本期已计", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[48] || (_cache[48] = ($event) => goalForm.value.periodTotal = $event),
                  class: "wx-input",
                  type: "number",
                  step: "any"
                }, null, 512), [
                  [vModelText, goalForm.value.periodTotal]
                ])
              ])
            ])),
            createBaseVNode("div", _hoisted_136, [
              goalForm.value.mode === "ledger" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                _cache[108] || (_cache[108] = createTextVNode(' 明细按天存，周期只决定"本期合计"怎么算，随时改都不会动到已记的账。 日常记账点那一行的类别格子，填金额回车。完整月历和汇总对比在主界面的 ', -1)),
                _cache[109] || (_cache[109] = createBaseVNode("b", null, "费用", -1)),
                _cache[110] || (_cache[110] = createTextVNode(" 里。下方“删除今日”只清除当天明细，不删除台账和历史资料。 ", -1))
              ], 64)) : goalForm.value.mode === "accumulate" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                _cache[111] || (_cache[111] = createTextVNode(" 每到新周期自动归零，上一期的数会存进趋势图。日常记账直接点那一行的 ", -1)),
                _cache[112] || (_cache[112] = createBaseVNode("b", null, "+", -1)),
                _cache[113] || (_cache[113] = createTextVNode(" / ", -1)),
                _cache[114] || (_cache[114] = createBaseVNode("b", null, "−", -1)),
                _cache[115] || (_cache[115] = createTextVNode("。 ", -1))
              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                _cache[116] || (_cache[116] = createTextVNode(" 日常记进度不用来这儿：直接点目标那一行的 ", -1)),
                _cache[117] || (_cache[117] = createBaseVNode("b", null, "+", -1)),
                _cache[118] || (_cache[118] = createTextVNode(" / ", -1)),
                _cache[119] || (_cache[119] = createBaseVNode("b", null, "−", -1)),
                _cache[120] || (_cache[120] = createTextVNode("，填增量回车就行。 ", -1))
              ], 64))
            ]),
            goalFormError.value ? (openBlock(), createElementBlock("div", _hoisted_137, toDisplayString(goalFormError.value), 1)) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_138, [
              goalForm.value.id ? (openBlock(), createElementBlock("button", {
                key: 0,
                class: "wx-btn danger",
                onClick: deleteGoal
              }, toDisplayString(editingLedger.value ? "删除今日" : "删除"), 1)) : createCommentVNode("", true),
              createBaseVNode("button", {
                class: "wx-btn",
                onClick: _cache[49] || (_cache[49] = ($event) => goalForm.value = null)
              }, "取消"),
              createBaseVNode("button", {
                class: "wx-btn primary",
                onClick: saveGoal
              }, "保存")
            ])
          ], 32)
        ])) : createCommentVNode("", true),
        confirmBox.value ? (openBlock(), createElementBlock("div", {
          key: 5,
          class: "wx-mask",
          onClick: _cache[55] || (_cache[55] = withModifiers(($event) => closeConfirm(false), ["self"]))
        }, [
          createBaseVNode("div", {
            class: "wx-form wx-confirm",
            onKeyup: _cache[54] || (_cache[54] = withKeys(($event) => closeConfirm(false), ["esc"]))
          }, [
            createBaseVNode("div", _hoisted_139, toDisplayString(confirmBox.value.text), 1),
            createBaseVNode("div", _hoisted_140, [
              createBaseVNode("button", {
                class: "wx-btn",
                onClick: _cache[52] || (_cache[52] = ($event) => closeConfirm(false))
              }, "取消"),
              createBaseVNode("button", {
                class: normalizeClass(["wx-btn", confirmBox.value.danger ? "danger" : "primary"]),
                onClick: _cache[53] || (_cache[53] = ($event) => closeConfirm(true))
              }, toDisplayString(confirmBox.value.okText), 3)
            ])
          ], 32)
        ])) : createCommentVNode("", true),
        weatherForm.value ? (openBlock(), createElementBlock("div", {
          key: 6,
          class: "wx-mask",
          onClick: withModifiers(closeWeatherForm, ["self"])
        }, [
          createBaseVNode("div", {
            class: "wx-form",
            onKeyup: withKeys(closeWeatherForm, ["esc"])
          }, [
            _cache[123] || (_cache[123] = createBaseVNode("div", { class: "wx-form-head" }, "天气位置", -1)),
            createBaseVNode("div", _hoisted_141, [
              withDirectives(createBaseVNode("input", {
                ref_key: "weatherQueryEl",
                ref: weatherQueryEl,
                "onUpdate:modelValue": _cache[56] || (_cache[56] = ($event) => weatherForm.value.query = $event),
                class: "wx-input",
                placeholder: "输入城市名，比如 上海 / Shanghai",
                onKeyup: withKeys(searchCity, ["enter"])
              }, null, 544), [
                [vModelText, weatherForm.value.query]
              ]),
              createBaseVNode("button", {
                class: "wx-btn primary",
                disabled: weatherForm.value.searching,
                onClick: searchCity
              }, toDisplayString(weatherForm.value.searching ? "搜索中" : "搜索"), 9, _hoisted_142)
            ]),
            weatherForm.value.results.length ? (openBlock(), createElementBlock("div", _hoisted_143, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(weatherForm.value.results, (item) => {
                return openBlock(), createElementBlock("button", {
                  key: `${item.latitude},${item.longitude}`,
                  class: "wx-city",
                  onClick: ($event) => pickCity(item)
                }, [
                  createBaseVNode("b", null, toDisplayString(item.name), 1),
                  createBaseVNode("i", null, toDisplayString(cityLabel(item)), 1)
                ], 8, _hoisted_144);
              }), 128))
            ])) : createCommentVNode("", true),
            weatherForm.value.error ? (openBlock(), createElementBlock("div", _hoisted_145, toDisplayString(weatherForm.value.error), 1)) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_146, [
              _cache[122] || (_cache[122] = createTextVNode(" 台式机常因为没有无线网卡而定不了位，手动选城市最稳。 ", -1)),
              savedWeatherPlace()?.label ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                _cache[121] || (_cache[121] = createBaseVNode("br", null, null, -1)),
                createTextVNode("当前：" + toDisplayString(savedWeatherPlace().label), 1)
              ], 64)) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", { class: "wx-form-acts" }, [
              createBaseVNode("button", {
                class: "wx-btn",
                style: { "margin-right": "auto" },
                onClick: useSystemLocation
              }, " 用系统定位 "),
              createBaseVNode("button", {
                class: "wx-btn",
                onClick: closeWeatherForm
              }, "关闭")
            ])
          ], 32)
        ])) : createCommentVNode("", true),
        cdForm.value ? (openBlock(), createElementBlock("div", {
          key: 7,
          class: "wx-mask",
          onClick: _cache[61] || (_cache[61] = withModifiers(($event) => cdForm.value = null, ["self"]))
        }, [
          createBaseVNode("div", {
            class: "wx-form",
            onKeyup: _cache[60] || (_cache[60] = withKeys(($event) => cdForm.value = null, ["esc"]))
          }, [
            _cache[126] || (_cache[126] = createBaseVNode("div", { class: "wx-form-head" }, "时间节点", -1)),
            withDirectives(createBaseVNode("input", {
              ref_key: "cdTitleEl",
              ref: cdTitleEl,
              "onUpdate:modelValue": _cache[57] || (_cache[57] = ($event) => cdForm.value.title = $event),
              class: "wx-input",
              placeholder: "名称，比如「春节」「入职」",
              maxlength: "12",
              onKeyup: withKeys(saveCountdown, ["enter"])
            }, null, 544), [
              [vModelText, cdForm.value.title]
            ]),
            createBaseVNode("div", _hoisted_147, [
              createBaseVNode("label", null, [
                _cache[124] || (_cache[124] = createBaseVNode("span", null, "日期", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[58] || (_cache[58] = ($event) => cdForm.value.date = $event),
                  class: "wx-input",
                  type: "date"
                }, null, 512), [
                  [vModelText, cdForm.value.date]
                ])
              ]),
              createBaseVNode("label", null, [
                _cache[125] || (_cache[125] = createBaseVNode("span", null, "算法", -1)),
                createBaseVNode("div", _hoisted_148, toDisplayString(!cdForm.value.date ? "—" : unref(daysBetween)(unref(todayYmd)(), cdForm.value.date) > 0 ? "倒数计时" : unref(daysBetween)(unref(todayYmd)(), cdForm.value.date) < 0 ? "正数计时" : "就是今天"), 1)
              ])
            ]),
            _cache[127] || (_cache[127] = createBaseVNode("div", { class: "wx-form-hint muted" }, " 日期在将来就倒数还差几天，在过去就正数已经过了几天，以今天为基准每天自动更新。 ", -1)),
            createBaseVNode("div", _hoisted_149, [
              unref(state).settings?.countdown?.date ? (openBlock(), createElementBlock("button", {
                key: 0,
                class: "wx-btn danger",
                onClick: clearCountdown
              }, " 清除 ")) : createCommentVNode("", true),
              createBaseVNode("button", {
                class: "wx-btn",
                onClick: _cache[59] || (_cache[59] = ($event) => cdForm.value = null)
              }, "取消"),
              createBaseVNode("button", {
                class: "wx-btn primary",
                onClick: saveCountdown
              }, "保存")
            ])
          ], 32)
        ])) : createCommentVNode("", true)
      ], 2);
    };
  }
};
initStore().catch((err) => console.error("[litecal:widget] 初始化失败", err)).finally(() => {
  createApp(_sfc_main).mount("#app");
});
