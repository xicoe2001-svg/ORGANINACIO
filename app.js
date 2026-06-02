/* ── CONFIG ── */
const HOUR_HEIGHT = 60; // px por hora en el calendario

const CONFIG = {
  startHour: 7,
  endHour: 24,
  days: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
  categories: [
    { id: 'trabajo',   label: 'Trabajo',   color: '#4A8BC4', light: '#D6EAFB', icon: '💼' },
    { id: 'ejercicio', label: 'Ejercicio', color: '#5AAF5A', light: '#D6F0D6', icon: '🏋️' },
    { id: 'comida',    label: 'Comida',    color: '#D4900A', light: '#FEF0C8', icon: '🍽️' },
    { id: 'ocio',      label: 'Ocio',      color: '#9060D0', light: '#EAD9F8', icon: '🎮' },
    { id: 'social',    label: 'Social',    color: '#D04880', light: '#FAD5E8', icon: '👥' },
    { id: 'higiene',   label: 'Higiene',   color: '#2090B0', light: '#C8EAF5', icon: '🚿' },
    { id: 'descanso',  label: 'Descanso',  color: '#8090A0', light: '#E0E8F0', icon: '😴' },
    { id: 'personal',  label: 'Personal',  color: '#C04040', light: '#FAD4D4', icon: '⭐' }
  ]
};

/* ── STATE ── */
let state = {
  currentWeekStart: getWeekStart(new Date()),
  selectedDay: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  blocks: {},   // key: "YYYY-WW" → { "dayIndex-hour": [{id, label, catId, hour, endHour}] }
  goals: {},    // key: "YYYY-WW" → [{id, text, done}]
  modal: { open: false, day: null, hour: null }
};

/* ── STORAGE ── */
function saveState() {
  try {
    localStorage.setItem('semana_blocks', JSON.stringify(state.blocks));
    localStorage.setItem('semana_goals', JSON.stringify(state.goals));
  } catch(e) {}
}

function loadState() {
  try {
    const b = localStorage.getItem('semana_blocks');
    const g = localStorage.getItem('semana_goals');
    if (b) state.blocks = JSON.parse(b);
    if (g) state.goals = JSON.parse(g);
  } catch(e) {}
}

/* ── HELPERS ── */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekKey(weekStart) {
  const y = weekStart.getFullYear();
  const start = new Date(weekStart.getFullYear(), 0, 1);
  const week = Math.ceil(((weekStart - start) / 86400000 + start.getDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

function getDayDate(weekStart, dayIndex) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${fmt(weekStart)} — ${fmt(end)}`;
}

function formatHour(h) {
  return h === 24 ? '00:00' : `${String(h).padStart(2,'0')}:00`;
}

function isToday(weekStart, dayIndex) {
  const today = new Date();
  const d = getDayDate(weekStart, dayIndex);
  return d.toDateString() === today.toDateString();
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function getCat(id) {
  return CONFIG.categories.find(c => c.id === id) || CONFIG.categories[0];
}

function getBlocks(weekKey, dayIndex, hour) {
  return (state.blocks[weekKey]?.[`${dayIndex}-${hour}`] || []);
}

function getAllDayBlocks(weekKey, dayIndex) {
  const all = [];
  for (let h = CONFIG.startHour; h < CONFIG.endHour; h++) {
    const key = `${dayIndex}-${h}`;
    if (state.blocks[weekKey]?.[key]) {
      all.push(...state.blocks[weekKey][key]);
    }
  }
  return all;
}

function getWeekStats(weekKey) {
  const totals = {};
  CONFIG.categories.forEach(c => totals[c.id] = 0);
  if (!state.blocks[weekKey]) return totals;
  for (const key of Object.keys(state.blocks[weekKey])) {
    for (const block of state.blocks[weekKey][key]) {
      const duration = (block.endHour || block.hour + 1) - block.hour;
      totals[block.catId] = (totals[block.catId] || 0) + duration;
    }
  }
  return totals;
}

function getGoals(weekKey) {
  return state.goals[weekKey] || [];
}

/* ── RENDER ── */
function render() {
  renderDayPills();
  renderCalendar();
  renderWeekNav();
}

function renderWeekNav() {
  document.getElementById('week-label').textContent = formatWeekLabel(state.currentWeekStart);
}

function renderDayPills() {
  const wk = getWeekKey(state.currentWeekStart);
  const container = document.getElementById('day-pills');
  container.innerHTML = CONFIG.days.map((name, i) => {
    const date = getDayDate(state.currentWeekStart, i);
    const num = date.getDate();
    const todayClass = isToday(state.currentWeekStart, i) ? 'today' : '';
    const activeClass = i === state.selectedDay ? 'active' : '';
    const hasBlocks = getAllDayBlocks(wk, i).length > 0 ? 'has-blocks' : '';
    return `<div class="day-pill ${todayClass} ${activeClass} ${hasBlocks}" onclick="selectDay(${i})">
      <span class="dp-name">${name}</span>
      <span class="dp-num">${num}</span>
      <div class="dp-dot"></div>
    </div>`;
  }).join('');
}

function renderCalendar() {
  const wk = getWeekKey(state.currentWeekStart);
  const day = state.selectedDay;
  const grid = document.getElementById('calendar-grid');
  const totalHours = CONFIG.endHour - CONFIG.startHour;
  const totalHeight = totalHours * HOUR_HEIGHT;

  let hoursHtml = '';
  for (let h = CONFIG.startHour; h < CONFIG.endHour; h++) {
    const top = (h - CONFIG.startHour) * HOUR_HEIGHT;
    hoursHtml += `
      <div class="hour-row" style="top:${top}px;height:${HOUR_HEIGHT}px;"
           onclick="openModal(${day},${h})">
        <div class="hour-label">${formatHour(h)}</div>
        <div class="hour-click"></div>
      </div>`;
  }
  hoursHtml += `<div class="last-hour-line" style="top:${totalHeight}px;"></div>`;

  const allBlocks = [];
  for (let h = CONFIG.startHour; h < CONFIG.endHour; h++) {
    getBlocks(wk, day, h).forEach(b => allBlocks.push(b));
  }

  let blocksHtml = '';
  for (const block of allBlocks) {
    const cat = getCat(block.catId);
    const duration = (block.endHour || block.hour + 1) - block.hour;
    const top = (block.hour - CONFIG.startHour) * HOUR_HEIGHT + 2;
    const height = duration * HOUR_HEIGHT - 4;
    const blockDataStr = JSON.stringify(block).replace(/"/g, '&quot;');
    const showCat = height > 38;
    const showDuration = duration > 1;

    blocksHtml += `
      <div class="block"
           style="top:${top}px;height:${height}px;background:${cat.light};border-left-color:${cat.color};color:${cat.color};"
           onclick="event.stopPropagation();openEditModal(${blockDataStr})">
        <div class="block-top">
          <div class="block-info">
            <div class="block-name">${cat.icon} ${block.label}</div>
            ${showCat ? `<div class="block-cat">${formatHour(block.hour)}–${formatHour(block.endHour || block.hour+1)}</div>` : ''}
          </div>
          <button class="block-delete"
                  onclick="event.stopPropagation();deleteBlock('${wk}',${day},${block.hour},'${block.id}')">×</button>
        </div>
        ${showDuration ? `<div class="block-duration">${duration}h</div>` : ''}
      </div>`;
  }

  grid.innerHTML = `
    <div class="cal-wrap" style="height:${totalHeight + 1}px;">
      <div class="hour-lines">${hoursHtml}</div>
      <div class="blocks-layer">${blocksHtml}</div>
    </div>`;
}

function renderGoals() {
  const wk = getWeekKey(state.currentWeekStart);
  const goals = getGoals(wk);
  const container = document.getElementById('goals-list');
  const date = getDayDate(state.currentWeekStart, 0);
  const weekLabel = `Semana del ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

  document.getElementById('goals-week-title').textContent = weekLabel;
  document.getElementById('goals-week-sub').textContent = getWeekKey(state.currentWeekStart);

  if (goals.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🎯</div>
      <div class="empty-text">Ningún objetivo esta semana.<br>Añade algo que quieras conseguir.</div>
    </div>`;
    return;
  }

  container.innerHTML = goals.map(g => `
    <div class="goal-item ${g.done ? 'done' : ''}">
      <div class="goal-check" onclick="toggleGoal('${wk}','${g.id}')">${g.done ? '✓' : ''}</div>
      <div class="goal-text">${g.text}</div>
      <button class="goal-del" onclick="deleteGoal('${wk}','${g.id}')">×</button>
    </div>
  `).join('');
}

function renderStats() {
  const wk = getWeekKey(state.currentWeekStart);
  const totals = getWeekStats(wk);
  const totalHours = Object.values(totals).reduce((a, b) => a + b, 0);
  const goals = getGoals(wk);
  const done = goals.filter(g => g.done).length;

  document.getElementById('stat-total-hours').textContent = totalHours;
  document.getElementById('stat-blocks').textContent = totalHours > 0 ? Math.round(totalHours / 7 * 10) / 10 + 'h' : '0h';
  document.getElementById('stat-goals-done').textContent = `${done}/${goals.length}`;
  document.getElementById('stat-productivity').textContent =
    totalHours === 0 ? '—' : Math.round((totals.trabajo || 0) / totalHours * 100) + '%';

  const maxHours = Math.max(...Object.values(totals), 1);
  const statsRows = document.getElementById('stats-rows');

  const sorted = CONFIG.categories
    .map(c => ({ ...c, hours: totals[c.id] || 0 }))
    .filter(c => c.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  if (sorted.length === 0) {
    statsRows.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-text">Todavía no hay bloques esta semana.</div>
    </div>`;
    return;
  }

  statsRows.innerHTML = sorted.map(c => `
    <div class="stat-row">
      <div class="stat-icon">${c.icon}</div>
      <div class="stat-info">
        <div class="stat-label">${c.label}</div>
        <div class="stat-bar-wrap">
          <div class="stat-bar" style="width:${Math.round(c.hours/maxHours*100)}%;background:${c.color};"></div>
        </div>
      </div>
      <div class="stat-hours">${c.hours}h</div>
    </div>
  `).join('');
}

/* ── NAVIGATION ── */
function selectDay(i) {
  state.selectedDay = i;
  renderDayPills();
  renderCalendar();
}

function prevWeek() {
  state.currentWeekStart = new Date(state.currentWeekStart);
  state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
  render();
}

function nextWeek() {
  state.currentWeekStart = new Date(state.currentWeekStart);
  state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
  render();
}

function goToday() {
  state.currentWeekStart = getWeekStart(new Date());
  const today = new Date().getDay();
  state.selectedDay = today === 0 ? 6 : today - 1;
  render();
}

function setView(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`view-${tab}`).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'goals') renderGoals();
  if (tab === 'stats') renderStats();
  if (tab === 'history') renderHistory();
}

/* ── MODAL LOGIC ── */
let editingBlock = null;

function openModal(day, hour) {
  editingBlock = null;
  document.getElementById('modal-title').textContent = `${formatHour(hour)} · ${CONFIG.days[day]}`;
  document.getElementById('block-label').value = '';
  document.getElementById('block-hour-start').value = hour;
  document.getElementById('block-hour-end').value = Math.min(hour + 1, CONFIG.endHour);
  selectCat(CONFIG.categories[0].id);
  renderHourOptions();
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('block-label').focus(), 300);
  state.modal = { open: true, day, hour };
}

function openEditModal(block) {
  editingBlock = block;
  document.getElementById('modal-title').textContent = `Editar bloque`;
  document.getElementById('block-label').value = block.label;
  document.getElementById('block-hour-start').value = block.hour;
  document.getElementById('block-hour-end').value = block.endHour || block.hour + 1;
  selectCat(block.catId);
  renderHourOptions();
  document.getElementById('modal-overlay').classList.add('open');
  state.modal = { open: true, day: state.selectedDay, hour: block.hour };
}

function renderHourOptions() {
  const startSel = document.getElementById('block-hour-start');
  const endSel = document.getElementById('block-hour-end');
  const startVal = parseInt(startSel.value);
  const endVal = parseInt(endSel.value);

  startSel.innerHTML = Array.from({ length: CONFIG.endHour - CONFIG.startHour }, (_, i) => {
    const h = CONFIG.startHour + i;
    return `<option value="${h}" ${h === startVal ? 'selected' : ''}>${formatHour(h)}</option>`;
  }).join('');

  endSel.innerHTML = Array.from({ length: CONFIG.endHour - CONFIG.startHour }, (_, i) => {
    const h = CONFIG.startHour + i + 1;
    return `<option value="${h}" ${h === endVal ? 'selected' : ''}>${formatHour(h === 24 ? 0 : h)} ${h < 10 ? '' : ''}</option>`;
  }).join('');
}

let selectedCat = CONFIG.categories[0].id;

function selectCat(id) {
  selectedCat = id;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.cat === id);
    if (p.dataset.cat === id) {
      const cat = getCat(id);
      p.style.borderColor = cat.color;
    } else {
      p.style.borderColor = 'transparent';
    }
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingBlock = null;
}

function saveBlock() {
  const label = document.getElementById('block-label').value.trim();
  if (!label) { document.getElementById('block-label').focus(); return; }
  const hour = parseInt(document.getElementById('block-hour-start').value);
  const endHour = parseInt(document.getElementById('block-hour-end').value);
  const wk = getWeekKey(state.currentWeekStart);
  const day = state.modal.day;

  if (!state.blocks[wk]) state.blocks[wk] = {};
  const key = `${day}-${hour}`;

  if (editingBlock) {
    const oldKey = `${day}-${editingBlock.hour}`;
    if (state.blocks[wk][oldKey]) {
      state.blocks[wk][oldKey] = state.blocks[wk][oldKey].filter(b => b.id !== editingBlock.id);
    }
  }

  if (!state.blocks[wk][key]) state.blocks[wk][key] = [];
  state.blocks[wk][key].push({
    id: editingBlock ? editingBlock.id : genId(),
    label,
    catId: selectedCat,
    hour,
    endHour: endHour > hour ? endHour : hour + 1
  });

  saveState();
  closeModal();
  render();
}

function deleteBlock(wk, day, hour, id) {
  const key = `${day}-${hour}`;
  if (state.blocks[wk]?.[key]) {
    state.blocks[wk][key] = state.blocks[wk][key].filter(b => b.id !== id);
  }
  saveState();
  render();
}

/* ── GOALS ── */
function addGoal() {
  const input = document.getElementById('goal-input');
  const text = input.value.trim();
  if (!text) return;
  const wk = getWeekKey(state.currentWeekStart);
  if (!state.goals[wk]) state.goals[wk] = [];
  state.goals[wk].push({ id: genId(), text, done: false });
  input.value = '';
  saveState();
  renderGoals();
}

function toggleGoal(wk, id) {
  const g = state.goals[wk]?.find(g => g.id === id);
  if (g) g.done = !g.done;
  saveState();
  renderGoals();
}

function deleteGoal(wk, id) {
  if (state.goals[wk]) {
    state.goals[wk] = state.goals[wk].filter(g => g.id !== id);
  }
  saveState();
  renderGoals();
}

/* ── HISTORY ── */
function renderHistory() {
  const container = document.getElementById('history-list');
  const sub = document.getElementById('history-sub');

  // Recopilar todas las semanas que tienen datos (blocks o goals)
  const allKeys = new Set([
    ...Object.keys(state.blocks),
    ...Object.keys(state.goals)
  ]);

  if (allKeys.size === 0) {
    sub.textContent = '';
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📅</div>
      <div class="empty-text">Todavía no hay semanas guardadas.<br>Empieza a planificar para ver el historial.</div>
    </div>`;
    return;
  }

  // Ordenar de más reciente a más antigua
  const sorted = [...allKeys].sort((a, b) => b.localeCompare(a));
  sub.textContent = `${sorted.length} semana${sorted.length !== 1 ? 's' : ''} guardada${sorted.length !== 1 ? 's' : ''}`;

  container.innerHTML = sorted.map(wk => {
    const weekStart = weekKeyToDate(wk);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const totals = getWeekStats(wk);
    const totalHours = Object.values(totals).reduce((a, b) => a + b, 0);
    const goals = getGoals(wk);
    const doneGoals = goals.filter(g => g.done).length;

    const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const isCurrentWeek = wk === getWeekKey(state.currentWeekStart);

    // Mini barras de categorías
    const maxH = Math.max(...Object.values(totals), 1);
    const catBars = CONFIG.categories
      .filter(c => totals[c.id] > 0)
      .sort((a, b) => totals[b.id] - totals[a.id])
      .slice(0, 5)
      .map(c => `
        <div class="hist-cat-row">
          <span class="hist-cat-icon">${c.icon}</span>
          <div class="hist-bar-wrap">
            <div class="hist-bar" style="width:${Math.round(totals[c.id]/maxH*100)}%;background:${c.color};"></div>
          </div>
          <span class="hist-cat-hours">${totals[c.id]}h</span>
        </div>
      `).join('');

    return `
      <div class="history-card ${isCurrentWeek ? 'current-week' : ''}" onclick="goToWeek('${wk}')">
        <div class="hist-card-top">
          <div>
            <div class="hist-week-label">${fmt(weekStart)} — ${fmt(weekEnd)}</div>
            <div class="hist-week-key">${wk}${isCurrentWeek ? ' · semana actual' : ''}</div>
          </div>
          <div class="hist-total">${totalHours}<span class="hist-total-unit">h</span></div>
        </div>
        ${catBars ? `<div class="hist-cats">${catBars}</div>` : ''}
        ${goals.length > 0 ? `
          <div class="hist-goals-row">
            <span class="hist-goals-text">${doneGoals}/${goals.length} objetivos</span>
            <div class="hist-goals-dots">
              ${goals.slice(0, 6).map(g => `<div class="hist-dot ${g.done ? 'done' : ''}"></div>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="hist-goto">Ver semana →</div>
      </div>
    `;
  }).join('');
}

function weekKeyToDate(wk) {
  // wk = "YYYY-WNN"
  const [yearStr, weekStr] = wk.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (dayOfWeek <= 4 ? 2 - dayOfWeek : 9 - dayOfWeek));
  const d = new Date(firstMonday);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d;
}

function goToWeek(wk) {
  state.currentWeekStart = weekKeyToDate(wk);
  state.selectedDay = 0;
  setView('calendar');
}


function onStartHourChange() {
  const h = parseInt(document.getElementById('block-hour-start').value);
  const endSel = document.getElementById('block-hour-end');
  endSel.innerHTML = Array.from({ length: CONFIG.endHour - h }, (_, i) => {
    const eh = h + i + 1;
    return `<option value="${eh}" ${eh === h + 1 ? 'selected' : ''}>${formatHour(eh === 24 ? 0 : eh)}</option>`;
  }).join('');
}

/* ── INIT ── */
loadState();
render();

// Scroll to current hour (approximately)
window.addEventListener('load', () => {
  const currentHour = new Date().getHours();
  if (currentHour >= CONFIG.startHour && currentHour < CONFIG.endHour) {
    const grid = document.getElementById('calendar-grid');
    const rowH = 52;
    const scrollTo = (currentHour - CONFIG.startHour) * rowH - 100;
    if (scrollTo > 0) window.scrollTo({ top: scrollTo, behavior: 'smooth' });
  }
});
