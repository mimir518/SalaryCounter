const STORAGE_KEY = 'salary-healer-settings-v1';

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const DEFAULT_SETTINGS = {
  monthlySalary: 0,
  workDaysPerMonth: 21,
  workStart: '09:00',
  workEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workingWeekdays: [1, 2, 3, 4, 5],
};

const form = document.getElementById('settingsForm');
const weekdayContainer = document.getElementById('weekdayOptions');
const statusText = document.getElementById('statusText');
const todayValue = document.getElementById('todayValue');
const monthValue = document.getElementById('monthValue');
const hourlyValue = document.getElementById('hourlyValue');
const perSecondValue = document.getElementById('perSecondValue');
const saveHint = document.getElementById('saveHint');

function toMinutes(timeString) {
  const [h, m] = timeString.split(':').map(Number);
  return h * 60 + m;
}

function parseSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  merged.monthlySalary = Number(merged.monthlySalary) || 0;
  merged.workDaysPerMonth = Math.max(1, Number(merged.workDaysPerMonth) || 21);
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
  });
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

function getStatus(now, settings) {
  const weekday = now.getDay();
  if (!settings.workingWeekdays.includes(weekday)) return '非工作日';

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
    } else if (settings.workingWeekdays.includes(cursor.getDay())) {
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

  statusText.textContent = getStatus(now, settings);
  todayValue.textContent = formatCurrency(todayIncome);
  monthValue.textContent = formatCurrency(monthIncome);
  hourlyValue.textContent = `¥${hourlyRate.toFixed(2)} / h`;

  const isRunning = statusText.textContent === '上班中';
  perSecondValue.textContent = isRunning ? formatPerSecond(perSecondRate) : formatPerSecond(0);
}

let activeSettings = loadSettings();
fillForm(activeSettings);
calculateAndRender(activeSettings);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const next = readForm();

  if (next.monthlySalary <= 0) {
    saveHint.textContent = '请先填写正确的月到手工资（大于 0）。';
    return;
  }

  activeSettings = next;
  saveSettings(next);
  fillForm(next);
  calculateAndRender(next);
  saveHint.textContent = `已保存（本地时区：${Intl.DateTimeFormat().resolvedOptions().timeZone}）`;
});

setInterval(() => {
  calculateAndRender(activeSettings);
}, 1000);
