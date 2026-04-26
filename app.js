const salaryInput = document.getElementById('monthlySalary');
const hoursInput = document.getElementById('workHours');
const daysInput = document.getElementById('workDays');
const resultEl = document.getElementById('result');
const breakdownEl = document.getElementById('breakdown');
const calcBtn = document.getElementById('calcBtn');

function formatMoney(n) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function calculate() {
  const salary = Number(salaryInput.value);
  const hours = Number(hoursInput.value);
  const days = Number(daysInput.value || 21.75);

  if (!(salary > 0) || !(hours >= 0) || !(days > 0)) {
    resultEl.textContent = '¥0.00';
    breakdownEl.textContent = '请输入有效数字';
    return;
  }

  const hourly = salary / days / 8;
  const recovered = hourly * hours;

  resultEl.textContent = formatMoney(recovered);
  breakdownEl.textContent = `时薪约 ${formatMoney(hourly)} × ${hours} 小时`;
}

calcBtn.addEventListener('click', calculate);
[salaryInput, hoursInput, daysInput].forEach((el) => el.addEventListener('input', calculate));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
