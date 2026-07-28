// ===== weight.js =====
// Weight tracking logic and chart

const WEIGH_INTERVAL_DAYS = 7;

function getWeights() {
  if (!Array.isArray(db.weights)) db.weights = [];
  return db.weights.slice().sort((a, b) => a.date.localeCompare(b.date));
}

function latestWeight() { 
  const w = getWeights(); 
  return w[w.length - 1] || null; 
}

function weightGoalMode() {
  return (db.profile && db.profile.goal && db.profile.goal !== 'maintain') ? 'diet' : 'maintenance';
}

function daysSince(dateKey) {
  const a = new Date(dateKey + 'T00:00:00'); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

function weightSparkline(ws) {
  const pts = ws.slice(-12);
  if (pts.length < 2) return '';
  const W = 300, H = 48, pad = 6;
  const kgs = pts.map(p => p.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs);
  const range = (max - min) || 1;
  const stepX = (W - pad * 2) / (pts.length - 1);
  const coords = pts.map((p, i) => [pad + i * stepX, pad + (1 - (p.kg - min) / range) * (H - pad * 2)]);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  return `<svg class="weight-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>
    <path d="${line}" fill="none" stroke="url(#wg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="#8b5cf6"/>
  </svg>`;
}

function renderWeightCard() {
  const ws = getWeights();
  const latest = ws[ws.length - 1] || null;
  const prev   = ws.length >= 2 ? ws[ws.length - 2] : null;
  const days   = latest ? daysSince(latest.date) : null;
  const due    = !latest || days >= WEIGH_INTERVAL_DAYS;

  const nudge = due
    ? `<div class="weight-nudge">⚖️ ${latest ? 'Zeit fürs wöchentliche Wiegen!' : 'Trage dein Gewicht ein, um deinen Fortschritt zu verfolgen.'}</div>`
    : '';

  let currentBlock;
  if (latest) {
    let trend = '';
    if (prev) {
      const diff  = latest.kg - prev.kg;
      const cls   = Math.abs(diff) < 0.05 ? 'flat' : diff < 0 ? 'down' : 'up';
      const arrow = Math.abs(diff) < 0.05 ? '→' : diff < 0 ? '▼' : '▲';
      trend = `<div class="weight-trend ${cls}">${arrow} ${fmtNum(Math.abs(diff))} kg seit letztem Wiegen</div>`;
    }
    const ago = days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`;
    currentBlock = `
      <div class="weight-head-title">Aktuelles Gewicht</div>
      <div class="weight-current">${fmtNum(latest.kg)}<span> kg</span></div>
      <div class="weight-trend flat" style="opacity:.75">Zuletzt gewogen: ${ago}</div>
      ${trend}`;
  } else {
    currentBlock = `
      <div class="weight-head-title">Gewicht</div>
      <div class="weight-trend flat" style="margin-top:10px">Noch keine Einträge.</div>`;
  }

  const spark = weightSparkline(ws);

  const recent = ws.slice(-8).reverse();
  const listHtml = recent.length ? `<div class="weight-list">${recent.map(w => {
    const realIdx = ws.indexOf(w);
    const earlier = realIdx > 0 ? ws[realIdx - 1] : null;
    const dStr = new Date(w.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'short' });
    let delta = '';
    if (earlier) {
      const diff = w.kg - earlier.kg;
      const cls  = Math.abs(diff) < 0.05 ? 'flat' : diff < 0 ? 'down' : 'up';
      const sign = diff < 0 ? '−' : diff > 0 ? '+' : '±';
      delta = `<span class="weight-row-delta ${cls}" style="color:${cls==='down'?'var(--green)':cls==='up'?'var(--fat)':'var(--muted)'}">${sign}${fmtNum(Math.abs(diff))}</span>`;
    }
    return `<div class="weight-row">
        <span class="weight-row-date">${dStr}</span>
        <span style="display:flex;align-items:center">
          <span class="weight-row-kg">${fmtNum(w.kg)} kg</span>${delta}
          <button class="weight-row-del" onclick="deleteWeight('${w.date}')" title="Eintrag löschen">✕</button>
        </span>
      </div>`;
  }).join('')}</div>` : '';

  return `
    <div class="weight-card">
      ${nudge}
      <div class="weight-head">
        <div>${currentBlock}</div>
        <button class="btn-primary" onclick="openWeightModal()" style="flex:none;width:auto;padding:10px 16px;font-size:13px;white-space:nowrap">⚖️ Eintragen</button>
      </div>
      ${spark}
      ${listHtml}
    </div>`;
}

function openWeightModal() {
  const latest = latestWeight();
  const input  = document.getElementById('weight-input');
  input.value  = latest ? latest.kg : (db.profile ? db.profile.weight : '');
  document.getElementById('weight-date').value = todayKey();
  updateWeightPreview();
  openModal('modal-weight');
}

function updateWeightPreview() {
  const box     = document.getElementById('weight-goal-preview');
  const actions = document.getElementById('weight-actions');
  const kg = parseFloat(String(document.getElementById('weight-input').value).replace(',', '.'));
  const valid = kg && kg >= 30 && kg <= 300;

  if (!db.profile) {
    box.innerHTML = `<p style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:12px">💡 Berechne zuerst deinen Tagesbedarf (Button „Jetzt berechnen"), damit aus deinem Gewicht automatisch neue Makro-Ziele entstehen.</p>`;
    actions.innerHTML = `<button class="btn-primary" onclick="saveWeight(false)" ${valid ? '' : 'disabled'}>Gewicht speichern</button>`;
    return;
  }
  if (!valid) {
    box.innerHTML = '';
    actions.innerHTML = `<button class="btn-primary" disabled>Gewicht speichern</button>`;
    return;
  }

  const mode   = weightGoalMode();
  const needs  = computeNeeds({ ...db.profile, weight: kg });
  const target = mode === 'diet' ? needs.diet : needs.maintenance;
  const modeLabel = mode === 'diet' ? (db.profile.goal === 'cut' ? 'Diät' : 'Aufbau') : 'Erhaltung';
  const dk = target.kcal - db.goals.kcal;

  box.innerHTML = `
    <div class="weight-preview-box">
      <div class="weight-preview-title">Neue Ziele bei ${fmtNum(kg)} kg · ${modeLabel}</div>
      <div class="weight-preview-row"><span style="color:var(--kcal)">Kalorien</span><b>${target.kcal} kcal <span style="color:var(--muted);font-weight:600">(${dk >= 0 ? '+' : ''}${dk})</span></b></div>
      <div class="weight-preview-row"><span style="color:var(--protein)">Protein</span><b>${target.protein} g</b></div>
      <div class="weight-preview-row"><span style="color:var(--carbs)">Kohlenhydrate</span><b>${target.carbs} g</b></div>
      <div class="weight-preview-row"><span style="color:var(--fat)">Fett</span><b>${target.fat} g</b></div>
    </div>`;
  actions.innerHTML = `
    <button class="btn-primary" onclick="saveWeight(true)">✅ Speichern &amp; neue Ziele übernehmen</button>
    <button class="btn-outline" onclick="saveWeight(false)">Nur Gewicht speichern</button>`;
}

function saveWeight(applyGoals) {
  const kg = parseFloat(String(document.getElementById('weight-input').value).replace(',', '.'));
  if (!kg || kg < 30 || kg > 300) { alert('Bitte ein gültiges Gewicht eingeben (30–300 kg).'); return; }
  const date = document.getElementById('weight-date').value || todayKey();

  if (!Array.isArray(db.weights)) db.weights = [];
  const rounded  = Math.round(kg * 10) / 10;
  const existing = db.weights.find(w => w.date === date);
  if (existing) existing.kg = rounded;
  else db.weights.push({ date, kg: rounded });
  db.weights.sort((a, b) => a.date.localeCompare(b.date));

  if (db.profile) {
    const newest = db.weights[db.weights.length - 1];
    db.profile.weight = newest.kg;
    const needs = computeNeeds(db.profile);
    db.profile.maintenance = needs.maintenance;
    db.profile.diet = needs.diet;
    if (applyGoals) {
      const target = weightGoalMode() === 'diet' ? needs.diet : needs.maintenance;
      db.goals = { kcal: target.kcal, protein: target.protein, carbs: target.carbs, fat: target.fat };
    }
  }
  save();
  closeModal('modal-weight');
  renderBedarf();
  loadGoalsForm();
  renderToday();
}

function deleteWeight(date) {
  if (!Array.isArray(db.weights)) return;
  if (!confirm('Diesen Gewichtseintrag löschen?')) return;
  db.weights = db.weights.filter(w => w.date !== date);
  if (db.profile && db.weights.length) {
    const newest = db.weights[db.weights.length - 1];
    db.profile.weight = newest.kg;
    const needs = computeNeeds(db.profile);
    db.profile.maintenance = needs.maintenance;
    db.profile.diet = needs.diet;
  }
  save();
  renderBedarf();
}
