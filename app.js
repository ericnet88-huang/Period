const storageKey = 'period-app-state';
const demoResetKey = 'period-app-demo-cleared-v1';
if (!localStorage.getItem(demoResetKey)) { localStorage.removeItem(storageKey); localStorage.setItem(demoResetKey, '1'); }
const savedState = JSON.parse(localStorage.getItem(storageKey) || '{}');
const state = { mood: savedState.mood || '', records: savedState.records || {}, cycleLength: savedState.cycleLength || 28, reminders: savedState.reminders || [
  { icon: '◷', title: '經期即將到來', detail: '預計還有 17 天', on: true },
  { icon: '♧', title: '每日身體記錄', detail: '每天晚上 9:00', on: true },
  { icon: '◌', title: '補充水分', detail: '每天早上 10:00', on: false }
] };
const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
const toast = (message) => { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove('show'), 2200); };
const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function renderCycleInfo() {
  const periodDates = Object.keys(state.records).filter((date) => state.records[date].period).sort();
  const periodStartKeys = periodDates.filter((date, index) => index === 0 || (new Date(`${date}T00:00:00`) - new Date(`${periodDates[index - 1]}T00:00:00`)) / 86400000 > 1);
  const periodStartDates = periodStartKeys.map((date) => new Date(`${date}T00:00:00`));
  const cycleIntervals = periodStartDates.slice(1).map((date, index) => Math.round((date - periodStartDates[index]) / 86400000)).filter((days) => days >= 15 && days <= 60);
  const hasHistoryAverage = cycleIntervals.length > 0;
  const calculatedCycleLength = hasHistoryAverage ? Math.round(cycleIntervals.reduce((total, days) => total + days, 0) / cycleIntervals.length) : Number(state.cycleLength);
  const latestDateKey = periodStartKeys.at(-1);
  document.querySelector('#cycleLengthLabel').textContent = hasHistoryAverage ? `／ 平均 ${calculatedCycleLength} 天` : `／ ${calculatedCycleLength} 天`;
  document.querySelector('#cycleProgress').style.width = latestDateKey ? `${Math.min(100, Math.max(0, ((Math.floor((today - new Date(`${latestDateKey}T00:00:00`)) / 86400000) + 1) / calculatedCycleLength) * 100))}%` : '0%';
  if (!latestDateKey) { document.querySelector('#cycleDay').textContent = '尚未記錄'; document.querySelector('#lastPeriod').textContent = '尚未記錄'; document.querySelector('#nextPeriod').textContent = '請先補記'; return; }
  const latestDate = new Date(`${latestDateKey}T00:00:00`);
  const cycleDay = Math.max(1, Math.floor((today - latestDate) / 86400000) + 1);
  const nextDate = new Date(latestDate);
  nextDate.setDate(nextDate.getDate() + calculatedCycleLength);
  document.querySelector('#cycleDay').textContent = `第 ${cycleDay} 天`;
  document.querySelector('#lastPeriod').textContent = `${latestDate.getMonth() + 1}月${latestDate.getDate()}日`;
  document.querySelector('#nextPeriod').textContent = `${nextDate.getMonth() + 1}月${nextDate.getDate()}日`;
}

function renderCalendar() {
  const target = document.querySelector('#calendarDays');
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const todayKey = formatDateKey(today);
  target.innerHTML = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - mondayOffset + 1);
    const inMonth = date.getMonth() === month;
    const day = date.getDate();
    const dateKey = formatDateKey(date);
    const period = state.records[dateKey]?.period ? ' period' : '';
    const fertile = '';
    const today = dateKey === todayKey ? ' today' : '';
    return `<span class="day${inMonth ? '' : ' muted'}${period}${fertile}${today}" title="${dateKey}">${day}</span>`;
  }).join('');
  document.querySelector('#monthButton').textContent = `${month + 1}月 ${year}`;
}

function renderReminders() {
  document.querySelector('#reminderList').innerHTML = state.reminders.map((item, index) => `<div class="reminder-item"><div class="reminder-info"><span class="reminder-icon">${item.icon}</span><div><strong>${item.title}</strong><small>${item.detail}</small></div></div><button class="toggle ${item.on ? 'on' : ''}" data-reminder="${index}" aria-label="切換${item.title}"></button></div>`).join('');
  document.querySelectorAll('[data-reminder]').forEach((button) => button.addEventListener('click', () => { state.reminders[button.dataset.reminder].on = !state.reminders[button.dataset.reminder].on; save(); renderReminders(); toast(state.reminders[button.dataset.reminder].on ? '提醒已開啟' : '提醒已關閉'); }));
}

document.querySelectorAll('.mood-button').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.mood-button').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); state.mood = button.dataset.mood; save(); toast(`今天的狀態：${state.mood}`); }));
document.querySelector('#logButton').addEventListener('click', () => toast(state.mood ? `已記錄今天的「${state.mood}」` : '先選擇今天的狀態吧'));
const modal = document.querySelector('#backfillModal');
const recordDate = document.querySelector('#recordDate');
document.querySelector('#backfillButton').addEventListener('click', () => { recordDate.value = formatDateKey(today); document.querySelector('#recordDate').max = formatDateKey(today); document.querySelector('#cycleLengthInput').value = state.cycleLength; modal.hidden = false; recordDate.focus(); });
document.querySelector('#closeBackfill').addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', (event) => { if (event.target === modal) modal.hidden = true; });
document.querySelector('#backfillForm').addEventListener('submit', (event) => { event.preventDefault(); const date = recordDate.value; state.cycleLength = Number(document.querySelector('#cycleLengthInput').value); state.records[date] = { period: document.querySelector('#periodCheck').checked, flow: document.querySelector('#flowSelect').value, note: document.querySelector('#recordNote').value.trim() }; save(); renderCycleInfo(); renderCalendar(); modal.hidden = true; toast(`已補記 ${date.slice(5).replace('-', '月')}日`); });
document.querySelector('#addReminder').addEventListener('click', () => { state.reminders.push({ icon: '✦', title: '新的溫柔提醒', detail: '點擊右側開啟', on: true }); save(); renderReminders(); toast('已新增提醒'); });
document.querySelector('#settingsButton').addEventListener('click', () => toast('設定功能即將到來'));
document.querySelector('#prevMonth').addEventListener('click', () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1); renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1); renderCalendar(); });
document.querySelector('#monthButton').addEventListener('click', () => { visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); toast('已回到目前月份'); });
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active')); item.classList.add('active'); const target = item.dataset.target; if (target === 'calendar') document.querySelector('.calendar-section').scrollIntoView({ behavior: 'smooth' }); else if (target === 'reminders') document.querySelector('.reminder').scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }));
if (state.mood) document.querySelector(`[data-mood="${state.mood}"]`)?.classList.add('selected');
renderCycleInfo(); renderCalendar(); renderReminders();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));