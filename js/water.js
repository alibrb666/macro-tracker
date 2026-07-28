// ===== water.js =====
// Hydration Tracker Pro

function getWaterTarget() {
  if (db && db.waterGoal) return db.waterGoal;
  return 2500; // Standard 2.5L
}

function getWaterLogged(key) {
  key = key || viewKey();
  if (db && db.water && db.water[key]) {
    return db.water[key];
  }
  return 0;
}

function addWater(amountMl) {
  const key = viewKey();
  if (!db.water) db.water = {};
  const current = db.water[key] || 0;
  const updated = Math.max(0, current + amountMl);
  db.water[key] = updated;
  if (!db.waterEntries) db.waterEntries = {};
  if (!db.waterEntries[key]) db.waterEntries[key] = [];
  db.waterEntries[key].push({ amount: amountMl, at: new Date().toISOString() });
  save();
  renderToday();
  renderWaterPage();
  showToast(`💧 ${amountMl > 0 ? '+' : ''}${amountMl} ml Wasser getrackt!`, 'success');
}

function addWaterQuick(amountMl) {
  addWater(amountMl);
}

function resetWater() {
  const key = viewKey();
  if (!db.water) db.water = {};
  db.water[key] = 0;
  if (db.waterEntries) db.waterEntries[key] = [];
  save();
  renderToday();
  renderWaterPage();
  showToast('💧 Wasser-Tracker zurückgesetzt', 'warning');
}

function setWaterTarget(ml) {
  ml = parseInt(ml, 10);
  if (isNaN(ml) || ml < 500) ml = 2500;
  db.waterGoal = ml;
  save();
  renderToday();
  renderWaterPage();
  showToast(`💧 Wasserziel auf ${ml} ml gesetzt!`, 'success');
}

function renderWaterModule(targetId) {
  const card = document.getElementById(targetId);
  if (!card) return;

  const target = getWaterTarget();
  const logged = getWaterLogged();
  const pct = Math.min(100, Math.round((logged / target) * 100));
  const remaining = Math.max(0, target - logged);

  const cups = Math.min(8, Math.ceil(target / 250));
  const filledCups = Math.min(cups, Math.round(logged / target * cups));
  card.innerHTML = `
    <section class="water-card-box hydration-module" aria-label="Wasser Tracker">
    <div class="water-card-header">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="water-card-icon">💧</div>
        <div>
          <div class="module-kicker">HYDRATION</div>
          <div style="font-weight:800;font-size:15px;color:var(--text)">Wasser-Tracker</div>
        </div>
      </div>
      <button class="btn-outline" onclick="openWaterGoalModal()" style="font-size:12px;padding:6px 10px;border-radius:var(--r-xs)">⚙️ Ziel</button>
    </div>

    <div class="module-statline"><span>${remaining > 0 ? `${remaining.toLocaleString('de-DE')} ml offen` : 'Ziel erreicht ✦'}</span><b>${pct}%</b></div>
    <div class="water-progress-wrap">
      <div class="water-progress-bar" style="width: ${pct}%"></div>
      <div class="water-progress-text">
        <span style="font-weight:900;font-size:18px;color:var(--text)">${logged.toLocaleString('de-DE')}</span>
        <span style="font-size:13px;color:var(--muted)"> / ${target.toLocaleString('de-DE')} ml (${pct}%)</span>
      </div>
    </div>

    <div class="water-cups" aria-label="${filledCups} von ${cups} Trinkportionen geschafft">${Array.from({ length: cups }, (_, i) => `<i class="${i < filledCups ? 'filled' : ''}"></i>`).join('')}</div>

    <!-- Quick Add Buttons -->
    <div class="water-quick-buttons">
      <button class="btn-outline water-btn" onclick="addWater(250)">
        <span>🥤</span> +250 ml
      </button>
      <button class="btn-outline water-btn" onclick="addWater(500)">
        <span>🍾</span> +500 ml
      </button>
      <button class="btn-outline water-btn" onclick="addWater(750)">
        <span>🏺</span> +750 ml
      </button>
      <button class="btn-outline water-btn danger" onclick="resetWater()" title="Zurücksetzen">
        <span>🔄</span>
      </button>
    </div>
    </section>
  `;
}

function renderWaterCard() {
  const card = document.getElementById('water-card');
  if (!card) return;
  const target = getWaterTarget(), logged = getWaterLogged(), pct = Math.min(100, Math.round(logged / target * 100));
  card.innerHTML = `<section class="water-card-box module-summary" aria-label="Wasser Übersicht">
    <div class="module-summary-head"><span>💧 Wasser</span><button onclick="openSection('water')">Details ↗</button></div>
    <div class="module-summary-value">${logged.toLocaleString('de-DE')}<small> / ${target.toLocaleString('de-DE')} ml</small></div>
    <div class="module-summary-track water-summary-track"><i style="width:${pct}%"></i></div>
    <div class="module-summary-bottom"><span>${pct}% deines Ziels</span><button class="module-quick-add" onclick="addWater(250)">+250 ml</button></div>
  </section>`;
}
function renderWaterPage() {
  renderWaterModule('water-page-module');
  const page = document.getElementById('water-page-module');
  if (!page) return;
  const entries = ((db.waterEntries || {})[viewKey()] || []).slice().reverse();
  const week = Array.from({ length: 7 }, (_, index) => { const d = new Date(); d.setDate(d.getDate() - (6 - index)); return { label:d.toLocaleDateString('de-DE',{weekday:'short'}), ml:getWaterLogged(dateKeyOf(d)) }; });
  page.insertAdjacentHTML('beforeend', `<div class="module-detail-grid"><section class="module-detail-card"><span>7-Tage-Rhythmus</span><div class="water-week">${week.map(day => `<div><i style="height:${Math.max(8, Math.min(100, day.ml / getWaterTarget() * 100))}%"></i><b>${day.label}</b></div>`).join('')}</div></section><section class="module-detail-card"><span>Heute protokolliert</span><div class="water-entry-list">${entries.length ? entries.slice(0,6).map(entry => `<div><b>+${entry.amount} ml</b><span>${new Date(entry.at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</span></div>`).join('') : '<p>Noch keine Trinkportion erfasst.</p>'}</div></section></div>`);
}

function openWaterGoalModal() {
  const current = getWaterTarget();
  const val = prompt('Tägliches Wasserziel in ml eingeben (z.B. 2500 oder 3000):', current);
  if (val !== null) setWaterTarget(val);
}
