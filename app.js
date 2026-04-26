const STORAGE_KEY = "salaryCounter.v1";
const QUOTE_CACHE_KEY = "salaryCounter.quoteCache.v1";
const QUOTE_SOURCE_URL_KEY = "salaryCounter.quoteSourceUrl";
const LOCAL_QUOTES = [
  "今日回血中，请勿打扰。",
  "钱在走，心就先别碎。",
  "不是热爱上班，是热爱到账。",
  "每一秒都算数。",
  "离周末又近了一点。",
  "工位可以困，钱包不能停。",
  "再忍一下，周末在路上。",
  "上班是过程，到手才是重点。",
  "打卡不是目的，回血才是。",
];

let quotePool = [...LOCAL_QUOTES];

const CN_HOLIDAY_DATA = {
  "2025": {
    holidays: [
      "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03", "2025-02-04",
      "2025-04-04", "2025-04-05", "2025-04-06",
      "2025-05-01", "2025-05-02", "2025-05-03", "2025-05-04", "2025-05-05",
      "2025-05-31", "2025-06-01", "2025-06-02",
      "2025-10-01", "2025-10-02", "2025-10-03", "2025-10-04", "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08"
    ],
    workdays: ["2025-01-26", "2025-02-08", "2025-04-27", "2025-09-28", "2025-10-11"],
  },
  "2026": {
    holidays: [
      "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22",
      "2026-04-04", "2026-04-05", "2026-04-06",
      "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
      "2026-06-19", "2026-06-20", "2026-06-21",
      "2026-09-25", "2026-09-26", "2026-09-27",
      "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"
    ],
    workdays: ["2026-02-15", "2026-02-28", "2026-09-20", "2026-10-10"],
  },
};

const defaultSettings = {
  version: 1,
  monthlySalary: 10000,
  mode: "standard",
  startTime: "09:00",
  endTime: "18:00",
  autoHolidayCN: true,
  manualSchedule: {},
};

let settings = loadSettings();
let calendarCursor = new Date();

const $ = (s) => document.querySelector(s);
const els = {
  amountInt: $("#amount-int"), amountDec: $("#amount-dec"), status: $("#status-text"),
  todayProgressPercent: $("#today-progress-percent"), workHoursText: $("#work-hours-text"),
  progressBlocks: $("#progress-blocks"), monthEarned: $("#month-earned"),
  monthAmount: $("#month-amount"),
  monthDays: $("#month-days"), weekProgress: $("#week-progress"), dailyQuote: $("#daily-quote"),
  weekNote: $("#week-note"),
  modal: $("#settings-modal"), salaryInput: $("#salary-input"), holidayToggle: $("#holiday-toggle"),
  startTime: $("#start-time"), endTime: $("#end-time"), holidaySection: $("#holiday-section"),
  manualSection: $("#manual-section"), calendar: $("#calendar"), calendarTitle: $("#calendar-title"), manualCount: $("#manual-count"),
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultSettings);
    return { ...structuredClone(defaultSettings), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultSettings);
  }
}

function saveSettings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }

function loadQuoteCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(QUOTE_CACHE_KEY) || "[]");
    if (Array.isArray(raw) && raw.length) quotePool = raw;
  } catch {}
}

function getQuoteSourceUrl() {
  if (window.RECOVERY_QUOTES_URL) return String(window.RECOVERY_QUOTES_URL);
  const cached = localStorage.getItem(QUOTE_SOURCE_URL_KEY);
  return cached || "";
}

async function tryLoadRemoteQuotes() {
  const url = getQuoteSourceUrl();
  if (!url) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.quotes;
    if (Array.isArray(list) && list.length) {
      quotePool = list.map((s) => String(s).trim()).filter(Boolean);
      if (quotePool.length) localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(quotePool));
    }
  } catch {}
}

function parseHM(hm) { const [h, m] = hm.split(":").map(Number); return h * 3600 + m * 60; }
function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function money(v) { return `￥${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function moneyParts(v) {
  const text = Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [intPart, decPart = "00"] = text.split(".");
  return { intPart, decPart };
}
function parseSalaryInput(text) {
  const normalized = String(text || "").replace(/,/g, "").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}
function formatSalaryInput(value) {
  const n = parseSalaryInput(value);
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }
function dayTypeByStandard(date) {
  const ymd = formatYMD(date);
  const y = String(date.getFullYear());
  const data = CN_HOLIDAY_DATA[y] || { holidays: [], workdays: [] };
  if (settings.autoHolidayCN) {
    if (data.workdays.includes(ymd)) return { work: true, reason: "调休上班" };
    if (data.holidays.includes(ymd)) return { work: false, reason: "法定节假日" };
  }
  if (isWeekend(date)) return { work: false, reason: "休息日" };
  return { work: true, reason: "工作日" };
}

function isWorkday(date) {
  if (settings.mode === "manual") return !!settings.manualSchedule[formatYMD(date)];
  return dayTypeByStandard(date).work;
}

function getDailyWorkingSeconds() {
  const start = parseHM(settings.startTime);
  const end = parseHM(settings.endTime);
  return Math.max(0, end - start);
}

function countMonthWorkdays(year, monthIndex) {
  if (settings.mode === "manual") {
    let count = 0;
    for (let d = 1; d <= daysInMonth(year, monthIndex); d++) {
      if (settings.manualSchedule[formatYMD(new Date(year, monthIndex, d))]) count++;
    }
    return count;
  }
  let count = 0;
  for (let d = 1; d <= daysInMonth(year, monthIndex); d++) {
    if (isWorkday(new Date(year, monthIndex, d))) count++;
  }
  return count;
}

function todayProgressSec(now, isTodayWorkday) {
  if (!isTodayWorkday) return 0;
  const start = parseHM(settings.startTime);
  const end = parseHM(settings.endTime);
  const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  if (sec <= start) return 0;
  if (sec >= end) return end - start;
  return sec - start;
}

function weekBounds(now) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d); monday.setDate(d.getDate() - day);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return [monday, sunday];
}

function calculate(now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const monthWorkdays = countMonthWorkdays(year, month);
  const dailySalary = monthWorkdays > 0 ? settings.monthlySalary / monthWorkdays : 0;
  const dailySec = getDailyWorkingSeconds();
  const perSec = dailySec > 0 ? dailySalary / dailySec : 0;
  const todayDate = new Date(year, month, today);
  const todayWork = isWorkday(todayDate);
  const todaySec = todayProgressSec(now, todayWork);
  const todayEarned = Math.min(dailySalary, perSec * todaySec);

  let monthCompletedDays = 0;
  for (let d = 1; d < today; d++) {
    if (isWorkday(new Date(year, month, d))) monthCompletedDays++;
  }

  const monthTotal = monthCompletedDays * dailySalary + todayEarned;
  const todayPct = dailySalary > 0 ? Math.max(0, Math.min(1, todayEarned / dailySalary)) : 0;

  const [monday, sunday] = weekBounds(now);
  let weekDone = 0, weekPlan = 0;
  for (let cursor = new Date(monday); cursor <= sunday; cursor.setDate(cursor.getDate() + 1)) {
    const current = new Date(cursor);
    if (!isWorkday(current)) continue;
    weekPlan += dailySec;
    const isToday = formatYMD(current) === formatYMD(now);
    if (isToday) weekDone += todayProgressSec(now, true);
    else if (current < new Date(year, month, today)) weekDone += dailySec;
  }

  const weekPct = weekPlan > 0 ? Math.max(0, Math.min(1, weekDone / weekPlan)) : 0;
  const standardTodayType = dayTypeByStandard(todayDate);
  let status = "还没开赚，等上班时间开始回血";

  if (settings.mode === "standard" && settings.autoHolidayCN && standardTodayType.reason === "法定节假日") {
    status = "今天放假，不计入回血";
  } else if (!todayWork) {
    status = "今天休息，不计入回血";
  } else if (todaySec <= 0) {
    status = "还没开赚，等上班时间开始回血";
  } else if (todaySec >= dailySec) {
    status = "今日回血完成";
  } else {
    status = `正在回血中，每秒 +${money(perSec).replace("￥", "￥")}`;
  }

  return {
    monthWorkdays, dailySalary, perSec, todayEarned, monthTotal, todayPct, weekPct,
    monthCompletedDays: monthCompletedDays + (todayWork ? 1 : 0), status,
  };
}

function renderProgressBlocks(pct) {
  els.progressBlocks.innerHTML = "";
  const total = 24;
  const filled = Math.round(total * pct);
  for (let i = 0; i < total; i++) {
    const div = document.createElement("div");
    div.className = `block${i < filled ? " filled" : ""}`;
    els.progressBlocks.appendChild(div);
  }
}

function renderMain() {
  const now = new Date();
  const data = calculate(now);
  const today = moneyParts(data.todayEarned);
  els.amountInt.textContent = today.intPart;
  els.amountDec.textContent = `.${today.decPart}`;
  els.status.textContent = data.status;
  els.todayProgressPercent.textContent = `${Math.round(data.todayPct * 100)}%`;
  els.workHoursText.textContent = `${settings.startTime} - ${settings.endTime}`;
  els.monthAmount.textContent = Math.floor(Number(data.monthTotal || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 });
  els.monthDays.textContent = `已计入 ${data.monthCompletedDays} 个工作日`;
  els.weekProgress.textContent = `${Math.round(data.weekPct * 100)}%`;
  els.weekNote.textContent = data.weekPct >= 1 ? "终于可以好好休息啦！" : "离周末又近了一点";
  renderProgressBlocks(data.todayPct);

  if (els.dailyQuote) {
    const day = now.getDate();
    const source = quotePool.length ? quotePool : LOCAL_QUOTES;
    els.dailyQuote.textContent = source[day % source.length];
  }
}

function renderForm() {
  els.salaryInput.value = formatSalaryInput(settings.monthlySalary);
  els.holidayToggle.checked = settings.autoHolidayCN;
  els.startTime.value = settings.startTime;
  els.endTime.value = settings.endTime;
  document.querySelector(`input[name="mode"][value="${settings.mode}"]`).checked = true;
  els.manualSection.classList.toggle("hidden", settings.mode !== "manual");
  els.holidaySection.classList.toggle("hidden", settings.mode !== "standard");
  if (settings.mode === "manual") renderCalendar();
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const total = daysInMonth(year, month);
  els.calendarTitle.textContent = `${year} 年 ${month + 1} 月`;
  els.calendar.innerHTML = "";
  let selected = 0;

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  for (let i = 0; i < firstWeekday; i++) {
    const placeholder = document.createElement("div");
    placeholder.className = "day-cell empty";
    placeholder.setAttribute("aria-hidden", "true");
    els.calendar.appendChild(placeholder);
  }

  for (let i = 1; i <= total; i++) {
    const d = new Date(year, month, i);
    const ymd = formatYMD(d);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-cell";
    btn.textContent = String(i);
    const active = !!settings.manualSchedule[ymd];
    if (active) { btn.classList.add("work"); selected++; }
    if (d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear()) btn.classList.add("dim");

    btn.addEventListener("click", () => {
      settings.manualSchedule[ymd] = !settings.manualSchedule[ymd];
      if (!settings.manualSchedule[ymd]) delete settings.manualSchedule[ymd];
      renderCalendar();
    });

    els.calendar.appendChild(btn);
  }
  els.manualCount.textContent = `本月已选择 ${selected} 个上班日`;
}

function bindEvents() {
  $("#open-settings").addEventListener("click", () => {
    renderForm();
    els.modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  });

  $("#close-settings").addEventListener("click", () => {
    els.modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  });

  $("#cancel-settings").addEventListener("click", () => {
    els.modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  });

  $("#save-settings").addEventListener("click", () => {
    settings.monthlySalary = parseSalaryInput(els.salaryInput.value);
    settings.autoHolidayCN = els.holidayToggle.checked;
    settings.startTime = els.startTime.value || "09:00";
    settings.endTime = els.endTime.value || "18:00";
    settings.mode = document.querySelector('input[name="mode"]:checked').value;
    saveSettings();
    els.modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    renderMain();
  });

  els.salaryInput.addEventListener("focus", () => {
    els.salaryInput.value = String(parseSalaryInput(els.salaryInput.value));
  });
  els.salaryInput.addEventListener("blur", () => {
    els.salaryInput.value = formatSalaryInput(els.salaryInput.value);
  });

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      settings.mode = radio.value;
      els.manualSection.classList.toggle("hidden", settings.mode !== "manual");
      els.holidaySection.classList.toggle("hidden", settings.mode !== "standard");
      if (settings.mode === "manual") renderCalendar();
    });
  });

  $("#prev-month").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); });
  $("#next-month").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); });

  $("#clear-manual").addEventListener("click", () => {
    const y = calendarCursor.getFullYear(), m = calendarCursor.getMonth();
    for (let d = 1; d <= daysInMonth(y, m); d++) delete settings.manualSchedule[formatYMD(new Date(y, m, d))];
    renderCalendar();
  });

  $("#copy-standard").addEventListener("click", () => {
    const y = calendarCursor.getFullYear(), m = calendarCursor.getMonth();
    for (let d = 1; d <= daysInMonth(y, m); d++) {
      const date = new Date(y, m, d);
      const key = formatYMD(date);
      const val = dayTypeByStandard(date).work;
      if (val) settings.manualSchedule[key] = true; else delete settings.manualSchedule[key];
    }
    renderCalendar();
  });
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function init() {
  loadQuoteCache();
  tryLoadRemoteQuotes().then(() => renderMain());
  bindEvents();
  renderMain();
  setInterval(renderMain, 1000);
  registerSW();
}

init();
