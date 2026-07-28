// ===== ui.js =====
// UI Helpers, Modals, Tabs, DOM Utilities

let currentTab = 'today';

const _modalStack = [];

function openModal(id)  {
  _modalStack.push(id);
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const idx = _modalStack.indexOf(id);
  if (idx !== -1) _modalStack.splice(idx, 1);
  document.getElementById(id).classList.remove('open');
  if (_modalStack.length === 0) document.body.style.overflow = '';
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function refreshAll() {
  renderToday(); renderLibrary(); renderBedarf(); loadGoalsForm();
}

function showTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');

  const fab = document.getElementById('main-fab');
  if (fab) fab.style.display = (tab === 'bedarf' || tab === 'goals') ? 'none' : 'flex';

  if (tab === 'today')   { viewDate = null; renderToday(); }
  if (tab === 'library') renderLibrary();
  if (tab === 'bedarf')  renderBedarf();
}

function handleFab() {
  if (currentTab === 'library') openFoodModal('');
  else {
    // Auto-select meal based on time of day
    const h = new Date().getHours();
    openLogModal(h < 11 ? 'fruehstueck' : h < 16 ? 'hauptspeise' : 'snack');
  }
}

function uid() { 
  return Math.random().toString(36).slice(2) + Date.now().toString(36); 
}

function calcMacros(food, grams) {
  const f = grams / 100;
  return {
    kcal:    Math.round(food.per100g.kcal    * f),
    protein: Math.round(food.per100g.protein * f * 10) / 10,
    carbs:   Math.round(food.per100g.carbs   * f * 10) / 10,
    fat:     Math.round(food.per100g.fat     * f * 10) / 10,
  };
}

function fmtNum(n) {
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

function normSearch(s) {
  return (s || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, 'ss');
}

function matchQuery(name, q) {
  const nq = normSearch(q).trim();
  if (!nq) return true;
  const hay = normSearch(name);
  return nq.split(/\s+/).every(tok => hay.includes(tok));
}

function unitCountLabel(count, label, plural) {
  const n = Math.abs(count - 1) < 1e-9 ? label : (plural || label);
  return `${fmtNum(count)} ${esc(n)}`;
}

function resizeImage(dataUrl, max = 640) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      try {
        const s = Math.min(1, max / img.width);
        const c = document.createElement('canvas');
        c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.62));
      } catch (e) { res(null); }
    };
    img.onerror = () => res(null);   // korruptes/nicht dekodierbares Bild → nicht ewig hängen
    img.src = dataUrl;
  });
}

// ===== TOAST NOTIFICATION SYSTEM =====
function showToast(message, type = 'success', durationMs = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', warning: '⚠️', error: '❌' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${esc(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}
