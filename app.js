const STORAGE_KEY = 'salary-healer-settings-v2';

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

// 内置中国节假日（含调休工作日）示例数据；若公司安排不同，允许用户手动改。
const CHINA_HOLIDAY_CALENDAR = {
  2026: {
    holidays: [
      '2026-01-01',
      '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22',
      '2026-04-04', '2026-04-05', '2026-04-06',
      '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
      '2026-06-19', '2026-06-20', '2026-06-21',
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
    ],
    makeupWorkdays: ['2026-02-15', '2026-02-28', '2026-04-26', '2026-05-09', '2026-09-27', '2026-10-10'],
  },
};

const DEFAULT_SETTINGS = {
  monthlySalary: 0,
  workDaysPerMonth: 21,
  workStart: '09:00',
  workEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workingWeekdays: [1, 2, 3, 4, 5],
  customWorkDays: false,
};

const form = document.getElementById('settingsForm');
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const recalcWorkDaysBtn = document.getElementById('recalcWorkDays');
const weekdayContainer = document.getElementById('weekdayOptions');
const statusText = document.getElementById('statusText');
const todayValue = document.getElementById('todayValue');
const monthValue = document.getElementById('monthValue');
const hourlyValue = document.getElementById('hourlyValue');
const perSecondValue = document.getElementById('perSecondValue');
const saveHint = document.getElementById('saveHint');
const workdayHint = document.getElementById('workdayHint');

function toMinutes(timeString) {
  const [h, m] = timeString.split(':').map(Number);
  return h * 60 + m;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  merged.monthlySalary = Number(merged.monthlySalary) || 0;
  merged.workDaysPerMonth = Math.max(1, Number(merged.workDaysPerMonth) || 21);
  merged.customWorkDays = Boolean(merged.customWorkDays);
  merged.workingWeekdays = Array.isArray(merged.workingWeekdays)
    ? merged.workingWeekdays.map(Number).filter((n) => n >= 0 && n <= 6)
    : DEFAULT_SETTINGS.workingWeekdays;
  return merged;
}

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parseSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function renderWeekdayOptions(settings) {
  weekdayContainer.innerHTML = '';
  WEEKDAYS.forEach((day) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'workingWeekdays';
    input.value = String(day.value);
    input.checked = settings.workingWeekdays.includes(day.value);
    label.append(input, day.label);
    weekdayContainer.append(label);
  });
}

function fillForm(settings) {
  document.getElementById('monthlySalary').value = settings.monthlySalary || '';
  document.getElementById('workDaysPerMonth').value = settings.workDaysPerMonth;
  document.getElementById('workStart').value = settings.workStart;
  document.getElementById('workEnd').value = settings.workEnd;
  document.getElementById('lunchStart').value = settings.lunchStart;
  document.getElementById('lunchEnd').value = settings.lunchEnd;
  renderWeekdayOptions(settings);
}

function readForm() {
  const formData = new FormData(form);
  const workingWeekdays = formData
    .getAll('workingWeekdays')
    .map(Number)
    .filter((n) => !Number.isNaN(n));

  return parseSettings({
    monthlySalary: formData.get('monthlySalary'),
    workDaysPerMonth: formData.get('workDaysPerMonth'),
    workStart: String(formData.get('workStart') || DEFAULT_SETTINGS.workStart),
    workEnd: String(formData.get('workEnd') || DEFAULT_SETTINGS.workEnd),
    lunchStart: String(formData.get('lunchStart') || DEFAULT_SETTINGS.lunchStart),
    lunchEnd: String(formData.get('lunchEnd') || DEFAULT_SETTINGS.lunchEnd),
    workingWeekdays: workingWeekdays.length ? workingWeekdays : DEFAULT_SETTINGS.workingWeekdays,
    customWorkDays: true,
  });
}

function calculateWorkdaysForMonth(year, monthIndex, settings) {
  const calendar = CHINA_HOLIDAY_CALENDAR[year];
  const holidays = new Set(calendar?.holidays || []);
  const makeup = new Set(calendar?.makeupWorkdays || []);

  let total = 0;
  const cursor = new Date(year, monthIndex, 1);
  while (cursor.getMonth() === monthIndex) {
    const key = toDateKey(cursor);
    let isWorkday = settings.workingWeekdays.includes(cursor.getDay());

    if (holidays.has(key)) isWorkday = false;
    if (makeup.has(key)) isWorkday = true;

    if (isWorkday) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function getAutoWorkdayCount(settings, now = new Date()) {
  return calculateWorkdaysForMonth(now.getFullYear(), now.getMonth(), settings);
}

function applyAutoWorkdayCount(settings, now = new Date()) {
  const count = getAutoWorkdayCount(settings, now);
  settings.workDaysPerMonth = count;
  settings.customWorkDays = false;
  document.getElementById('workDaysPerMonth').value = count;
  workdayHint.textContent = `已按 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月中国节假日估算：${count} 天。可手动改。`;
}

function getDailyPaidMinutes(settings) {
  const start = toMinutes(settings.workStart);
  const end = toMinutes(settings.workEnd);
  const lunchStart = toMinutes(settings.lunchStart);
  const lunchEnd = toMinutes(settings.lunchEnd);
  const total = Math.max(0, end - start);
  const lunch = Math.max(0, Math.min(end, lunchEnd) - Math.max(start, lunchStart));
  return Math.max(0, total - lunch);
}

function getPaidMinutesInDayUntil(date, settings) {
  const day = date.getDay();
  if (!settings.workingWeekdays.includes(day)) return 0;

  const key = toDateKey(date);
  const calendar = CHINA_HOLIDAY_CALENDAR[date.getFullYear()];
  if (calendar?.holidays?.includes(key) && !calendar?.makeupWorkdays?.includes(key)) return 0;

  const current = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const workStart = toMinutes(settings.workStart);
  const workEnd = toMinutes(settings.workEnd);
  const lunchStart = toMinutes(settings.lunchStart);
  const lunchEnd = toMinutes(settings.lunchEnd);

  if (current <= workStart) return 0;

  const capped = Math.min(current, workEnd);
  let paid = Math.max(0, capped - workStart);

  if (capped > lunchStart) {
    const lunchCut = Math.min(capped, lunchEnd) - lunchStart;
    paid -= Math.max(0, lunchCut);
  }

  return Math.max(0, paid);
}

function isWorkingDate(date, settings) {
  const key = toDateKey(date);
  const calendar = CHINA_HOLIDAY_CALENDAR[date.getFullYear()];
  if (calendar?.makeupWorkdays?.includes(key)) return true;
  if (calendar?.holidays?.includes(key)) return false;
  return settings.workingWeekdays.includes(date.getDay());
}

function getStatus(now, settings) {
  if (!isWorkingDate(now, settings)) return '非工作日';

  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(settings.workStart);
  const end = toMinutes(settings.workEnd);
  const lunchStart = toMinutes(settings.lunchStart);
  const lunchEnd = toMinutes(settings.lunchEnd);

  if (current < start) return '上班前';
  if (current >= end) return '下班后';
  if (current >= lunchStart && current < lunchEnd) return '午休中';
  return '上班中';
}

function getMonthPaidMinutes(now, settings) {
  let total = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);

  while (cursor <= now) {
    const sameDay =
      cursor.getFullYear() === now.getFullYear() &&
      cursor.getMonth() === now.getMonth() &&
      cursor.getDate() === now.getDate();

    if (sameDay) {
      total += getPaidMinutesInDayUntil(now, settings);
    } else if (isWorkingDate(cursor, settings)) {
      total += getDailyPaidMinutes(settings);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function formatCurrency(number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatPerSecond(number) {
  return `¥${number.toFixed(4)} / s`;
}

function calculateAndRender(settings) {
  const now = new Date();
  const paidMinutesPerDay = getDailyPaidMinutes(settings);
  const hourlyRate = paidMinutesPerDay > 0
    ? settings.monthlySalary / settings.workDaysPerMonth / (paidMinutesPerDay / 60)
    : 0;
  const perSecondRate = hourlyRate / 3600;

  const todayMinutes = getPaidMinutesInDayUntil(now, settings);
  const monthMinutes = getMonthPaidMinutes(now, settings);

  const todayIncome = (todayMinutes / 60) * hourlyRate;
  const monthIncome = (monthMinutes / 60) * hourlyRate;

  const status = getStatus(now, settings);
  statusText.textContent = status;
  todayValue.textContent = formatCurrency(todayIncome);
  monthValue.textContent = formatCurrency(monthIncome);
  hourlyValue.textContent = `¥${hourlyRate.toFixed(2)} / h`;
  perSecondValue.textContent = status === '上班中' ? formatPerSecond(perSecondRate) : formatPerSecond(0);
}

let activeSettings = loadSettings();
if (!activeSettings.customWorkDays) {
  applyAutoWorkdayCount(activeSettings);
}
fillForm(activeSettings);
calculateAndRender(activeSettings);
saveSettings(activeSettings);

openSettingsBtn.addEventListener('click', () => {
  fillForm(activeSettings);
  settingsModal.showModal();
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.close();
});

recalcWorkDaysBtn.addEventListener('click', () => {
  const previewSettings = readForm();
  const autoCount = getAutoWorkdayCount(previewSettings);
  document.getElementById('workDaysPerMonth').value = autoCount;
  workdayHint.textContent = `已重新估算当月工作天数：${autoCount} 天。`;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const next = readForm();

  if (next.monthlySalary <= 0) {
    saveHint.textContent = '请先填写正确的月到手工资（大于 0）。';
    return;
  }

  const autoCount = getAutoWorkdayCount(next);
  next.customWorkDays = Number(next.workDaysPerMonth) !== autoCount;

  activeSettings = next;
  saveSettings(next);
  calculateAndRender(next);
  saveHint.textContent = `已保存（本地时区：${Intl.DateTimeFormat().resolvedOptions().timeZone}）`;
  settingsModal.close();
});

setInterval(() => {
  calculateAndRender(activeSettings);
}, 1000);
