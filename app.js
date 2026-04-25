const STORAGE_KEY = 'salary_counter_config_v2';
const CONFIG_VERSION = 2;

const HOLIDAY_DATA = {
  2025: {
    holidays: [
      '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04',
      '2025-04-04', '2025-04-05', '2025-04-06',
      '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05',
      '2025-05-31', '2025-06-01', '2025-06-02',
      '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08'
    ],
    workdays: ['2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11']
  },
  2026: {
    holidays: [
      '2026-01-01',
      '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22',
      '2026-04-04', '2026-04-05', '2026-04-06',
      '2026-05-01', '2026-05-02', '2026-05-03',
      '2026-06-19', '2026-06-20', '2026-06-21',
      '2026-09-25', '2026-09-26', '2026-09-27',
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'
    ],
    workdays: ['2026-02-15', '2026-02-28', '2026-04-26', '2026-09-27', '2026-10-10']
  }
};

const sloganPool = [
  '打工是为了更体面地躺平。',
  '今天每一秒，都在向周末靠近。',
  '小票在走字，钱包在回血。',
  '请保持耐心，工资正在打印。',
  '上班如拉片，下班如散场。'
];

const els = {
  todayText: document.getElementById('todayText'),
  todayEarned: document.getElementById('todayEarned'),
  perSecond: document.getElementById('perSecond'),
  todayPercent: document.getElementById('todayPercent'),
  todayGrid: document.getElementById('todayGrid'),
  statusText: document.getElementById('statusText'),
  monthEarned: document.getElementById('monthEarned'),
  weekPercent: document.getElementById('weekPercent'),
  rotatingLine: document.getElementById('rotatingLine'),
  openSheetBtn: document.getElementById('openSheetBtn'),
  sheet: document.getElementById('sheet'),
  salaryInput: document.getElementById('salaryInput'),
  startInput: document.getElementById('startInput'),
  endInput: document.getElementById('endInput'),
  holidayToggle: document.getElementById('holidayToggle'),
  calendarSection: document.getElementById('calendarSection'),
  calendarGrid: document.getElementById('calendarGrid'),
  calendarTitle: document.getElementById('calendarTitle'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  clearMonth: document.getElementById('clearMonth'),
  fillMonth: document.getElementById('fillMonth'),
  copyStandard: document.getElementById('copyStandard'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn')
};

let state = loadState();
let draft = null;
let calendarCursor = new Date();
calendarCursor.setDate(1);

buildProgressGrid();
bindEvents();
render();
setInterval(render, 1000);
setInterval(rotateSlogan, 4200);

function loadState() {
  const defaults = {
    salary: 10000,
    mode: 'standard',
    workStart: '09:00',
    workEnd: '18:00',
    useHolidayOverride: true,
    manualSchedule: {},
    configVersion: CONFIG_VERSION
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed, configVersion: CONFIG_VERSION };
  } catch {
    return defaults;
  }
}

function saveState(next) {
  state = { ...next, configVersion: CONFIG_VERSION };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  els.openSheetBtn.addEventListener('click', openSheet);
  els.cancelBtn.addEventListener('click', closeSheet);
  els.sheet.addEventListener('click', (e) => {
    if (e.target === els.sheet) closeSheet();
  });

  document.querySelectorAll('input[name="mode"]').forEach((node) => {
    node.addEventListener('change', () => {
      if (!draft) return;
      draft.mode = node.value;
      toggleCalendarVisibility();
      renderCalendar();
    });
  });

  els.prevMonth.addEventListener('click', () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar();
  });
  els.nextMonth.addEventListener('click', () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar();
  });

  els.clearMonth.addEventListener('click', () => mutateMonth(() => false));
  els.fillMonth.addEventListener('click', () => mutateMonth(() => true));
  els.copyStandard.addEventListener('click', () => mutateMonth((date) => isStandardWorkday(date, Boolean(draft.useHolidayOverride))));

  els.saveBtn.addEventListener('click', () => {
    if (!draft) return;
    draft.salary = Math.max(0, Number(els.salaryInput.value) || 0);
    draft.workStart = els.startInput.value || '09:00';
    draft.workEnd = els.endInput.value || '18:00';
    draft.useHolidayOverride = els.holidayToggle.checked;
    saveState(draft);
    closeSheet();
    render();
  });
}

function openSheet() {
  draft = JSON.parse(JSON.stringify(state));
  els.salaryInput.value = String(draft.salary);
  els.startInput.value = draft.workStart;
  els.endInput.value = draft.workEnd;
  els.holidayToggle.checked = Boolean(draft.useHolidayOverride);
  document.querySelector(`input[name="mode"][value="${draft.mode}"]`).checked = true;
  calendarCursor = new Date();
  calendarCursor.setDate(1);
  toggleCalendarVisibility();
  renderCalendar();
  els.sheet.classList.add('open');
  els.sheet.setAttribute('aria-hidden', 'false');
}

function closeSheet() {
  els.sheet.classList.remove('open');
  els.sheet.setAttribute('aria-hidden', 'true');
  draft = null;
}

function toggleCalendarVisibility() {
  const mode = draft?.mode || 'standard';
  els.calendarSection.classList.toggle('hidden', mode !== 'manual');
}

function mutateMonth(decideWorkday) {
  if (!draft) return;
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d += 1) {
    const date = new Date(year, month, d);
    const key = toDateKey(date);
    draft.manualSchedule[key] = Boolean(decideWorkday(date));
  }
  renderCalendar();
}

function renderCalendar() {
  if (!draft || draft.mode !== 'manual') return;
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  els.calendarTitle.textContent = `${year}年 ${month + 1}月`;
  els.calendarGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < offset; i += 1) {
    const blank = document.createElement('button');
    blank.className = 'blank';
    blank.type = 'button';
    blank.disabled = true;
    els.calendarGrid.appendChild(blank);
  }

  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d += 1) {
    const date = new Date(year, month, d);
    const key = toDateKey(date);
    const on = Boolean(draft.manualSchedule[key]);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = String(d);
    btn.classList.toggle('on', on);
    btn.addEventListener('click', () => {
      draft.manualSchedule[key] = !on;
      renderCalendar();
    });
    els.calendarGrid.appendChild(btn);
  }
}

function render() {
  const now = new Date();
  const calc = calculate(now, state);
  els.todayText.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  els.todayEarned.textContent = formatMoney(calc.todayEarned);
  els.perSecond.textContent = formatMoney(calc.perSecond, 4);
  els.todayPercent.textContent = `${(calc.todayProgress * 100).toFixed(1)}%`;
  els.statusText.textContent = calc.statusText;
  els.monthEarned.textContent = formatMoney(calc.monthEarned);
  els.weekPercent.textContent = `${(calc.weekProgress * 100).toFixed(1)}%`;

  const blocks = els.todayGrid.querySelectorAll('span');
  const activeCount = Math.round(calc.todayProgress * blocks.length);
  blocks.forEach((block, i) => block.classList.toggle('active', i < activeCount));
}

function rotateSlogan() {
  const current = els.rotatingLine.textContent;
  const idx = sloganPool.indexOf(current);
  const next = sloganPool[(idx + 1 + sloganPool.length) % sloganPool.length];
  els.rotatingLine.textContent = next;
}

function calculate(now, config) {
  const shiftSeconds = getShiftSeconds(config.workStart, config.workEnd);
  const monthInfo = getMonthRange(now);
  const paidDaysInMonth = countPaidDays(monthInfo.start, monthInfo.end, config);
  const dailySalary = paidDaysInMonth > 0 ? config.salary / paidDaysInMonth : 0;
  const perSecond = shiftSeconds > 0 ? dailySalary / shiftSeconds : 0;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayWorkday = isPaidWorkday(today, config);
  const shift = getShiftTime(today, config.workStart, config.workEnd);
  const elapsedTodaySec = todayWorkday ? clamp((now - shift.start) / 1000, 0, shiftSeconds) : 0;
  const todayEarned = elapsedTodaySec * perSecond;

  let monthEarned = 0;
  for (let d = new Date(monthInfo.start); d <= monthInfo.end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    if (!isPaidWorkday(day, config)) continue;
    if (day < today) monthEarned += dailySalary;
    if (toDateKey(day) === toDateKey(today)) monthEarned += todayEarned;
  }

  const todayProgress = shiftSeconds ? elapsedTodaySec / shiftSeconds : 0;
  const week = getWeekRange(now);
  let weekTotalSec = 0;
  let weekEarnedSec = 0;

  for (let d = new Date(week.start); d <= week.end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    if (!isPaidWorkday(day, config)) continue;
    weekTotalSec += shiftSeconds;
    if (day < today) weekEarnedSec += shiftSeconds;
    if (toDateKey(day) === toDateKey(today)) weekEarnedSec += elapsedTodaySec;
  }

  const weekProgress = weekTotalSec ? weekEarnedSec / weekTotalSec : 0;

  return {
    perSecond,
    todayEarned,
    monthEarned,
    todayProgress: clamp(todayProgress, 0, 1),
    weekProgress: clamp(weekProgress, 0, 1),
    statusText: getStatusText(now, todayWorkday, shift)
  };
}

function getStatusText(now, todayWorkday, shift) {
  if (!todayWorkday) {
    const key = toDateKey(now);
    if (isHolidayByOverride(key)) return '今日法定节假日，暂停回血。';
    return '今日休息日，快乐躺平中。';
  }
  if (now < shift.start) return '上班前：工资条还没开始打印。';
  if (now > shift.end) return '下班后：今日回血已封箱。';
  return '上班中：每一秒都在回血。';
}

function isPaidWorkday(date, config) {
  if (config.mode === 'manual') {
    return Boolean(config.manualSchedule[toDateKey(date)]);
  }
  return isStandardWorkday(date, Boolean(config.useHolidayOverride));
}

function isStandardWorkday(date, useOverride) {
  const weekday = date.getDay();
  let result = weekday >= 1 && weekday <= 5;
  if (!useOverride) return result;

  const key = toDateKey(date);
  const yearData = HOLIDAY_DATA[date.getFullYear()];
  if (!yearData) return result;
  if (yearData.holidays.includes(key)) result = false;
  if (yearData.workdays.includes(key)) result = true;
  return result;
}

function isHolidayByOverride(key) {
  const year = Number(key.slice(0, 4));
  const yearData = HOLIDAY_DATA[year];
  return yearData ? yearData.holidays.includes(key) : false;
}

function getShiftSeconds(start, end) {
  const startSec = timeToSec(start);
  const endSec = timeToSec(end);
  return Math.max(0, endSec - startSec);
}

function getShiftTime(baseDate, start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return {
    start: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), sh || 0, sm || 0, 0),
    end: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), eh || 0, em || 0, 0)
  };
}

function countPaidDays(start, end, config) {
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isPaidWorkday(new Date(d), config)) count += 1;
  }
  return count;
}

function getWeekRange(now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function getMonthRange(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeToSec(value) {
  const [h, m] = (value || '00:00').split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}

function formatMoney(value, digits = 2) {
  return `¥${Number(value).toFixed(digits)}`;
}

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, Number(num) || 0));
}

function buildProgressGrid() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 20; i += 1) {
    const span = document.createElement('span');
    frag.appendChild(span);
  }
  els.todayGrid.appendChild(frag);
}
