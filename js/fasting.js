// ===== fasting.js =====
// Intermittent Fasting Clock & Plan Tracker

let fastingInterval = null;

function getFastingPlan() {
  if (db && db.fastingPlan) return db.fastingPlan;
  return '16:8';
}

function setFastingPlan(planKey) {
  if (!FASTING_PLANS[planKey]) planKey = '16:8';
  db.fastingPlan = planKey;
  save();
  renderFastingWidget();
  renderFastingPage();
  showToast(`⏱️ Fastenplan auf ${FASTING_PLANS[planKey].name} gesetzt!`, 'success');
}

function startFast() {
  db.fastingStart = new Date().toISOString();
  save();
  startFastingTimer();
  renderFastingWidget();
  renderFastingPage();
  showToast('⏱️ Fasten-Timer gestartet! Viel Erfolg!', 'success');
}

function stopFast() {
  if (!db.fastingStart) return;
  const start = new Date(db.fastingStart).getTime();
  const now = Date.now();
  const elapsedHours = ((now - start) / (1000 * 60 * 60)).toFixed(1);

  if (!db.fastingHistory) db.fastingHistory = [];
  db.fastingHistory.push({
    start: db.fastingStart,
    end: new Date().toISOString(),
    hours: parseFloat(elapsedHours),
    plan: getFastingPlan()
  });

  db.fastingStart = null;
  save();
  stopFastingTimer();
  renderFastingWidget();
  renderFastingPage();
  showToast(`🎉 Fasten beendet! ${elapsedHours} Stunden gefastet!`, 'success');
}

function startFastingTimer() {
  stopFastingTimer();
  fastingInterval = setInterval(updateFastingClock, 1000);
}

function stopFastingTimer() {
  if (fastingInterval) {
    clearInterval(fastingInterval);
    fastingInterval = null;
  }
}

function getFastingPhase(elapsedHours) {
  if (elapsedHours < 4)  return { name: 'Verdauung & Nährstoffaufnahme', icon: '🍽️', desc: 'Blutzucker & Insulin steigen an' };
  if (elapsedHours < 12) return { name: 'Blutzuckerspiegel fällt',        icon: '📉', desc: 'Insulin sinkt, Körper bereitet Fettverbrennung vor' };
  if (elapsedHours < 16) return { name: '🔥 Fettverbrennung (Ketose)',    icon: '🔥', desc: 'Körper verbrennt primär Fett zur Energiegewinnung' };
  return                        { name: '✨ Autophagie & Zellregeneration',icon: '✨', desc: 'Zellen reinigen und erneuern sich selbst' };
}

function updateFastingClock() {
  if (!db.fastingStart) return;

  const planKey = getFastingPlan();
  const plan = FASTING_PLANS[planKey] || FASTING_PLANS['16:8'];
  const targetMs = plan.fastHours * 60 * 60 * 1000;

  const start = new Date(db.fastingStart).getTime();
  const now = Date.now();
  const elapsedMs = now - start;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const mins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((elapsedMs % (1000 * 60)) / 1000);

  const time = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

  const pct = Math.min(100, Math.round((elapsedMs / targetMs) * 100));
  const phase = getFastingPhase(elapsedHours);
  document.querySelectorAll('[data-fasting-clock]').forEach(el => { el.textContent = time; });
  document.querySelectorAll('[data-fasting-progress]').forEach(el => { el.style.width = `${pct}%`; });
  document.querySelectorAll('[data-fasting-phase]').forEach(el => { el.innerHTML = `<span>${phase.icon}</span> <span><b>${phase.name}</b> · ${phase.desc}</span>`; });
}

function renderFastingWidget(targetId = 'fasting-widget') {
  const widget = document.getElementById(targetId);
  if (!widget) return;

  const planKey = getFastingPlan();
  const plan = FASTING_PLANS[planKey] || FASTING_PLANS['16:8'];
  const isFasting = !!db.fastingStart;
  const history = db.fastingHistory || [];
  const lastFast = history.length ? history[history.length - 1] : null;

  widget.innerHTML = `
    <section class="fasting-card-box fasting-module ${isFasting ? 'is-active' : ''}" aria-label="Intervallfasten">
    <div class="fasting-header">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="fasting-icon">⏱️</div>
        <div>
          <div class="module-kicker">INTERVALLFASTEN</div>
          <div style="font-weight:800;font-size:15px;color:var(--text)">Intervallfasten</div>
        </div>
      </div>
      <button class="btn-outline" onclick="openFastingModal()" style="font-size:12px;padding:6px 10px;border-radius:var(--r-xs)">⚙️ Plan</button>
    </div>

    ${isFasting ? `
      <!-- Live Fasting Timer -->
      <div class="fasting-clock-box">
        <div class="fasting-clock-time" data-fasting-clock>00:00:00</div>
        <div class="fasting-progress-wrap">
          <div class="fasting-progress-bar" data-fasting-progress style="width: 0%"></div>
        </div>
        <div class="fasting-phase-tag" data-fasting-phase>
          <span>🔄</span> Berechne Fastenphase…
        </div>
        <button class="btn-primary danger" onclick="stopFast()" style="margin-top:14px;width:100%">⏹️ Fasten beenden</button>
      </div>
    ` : `
      <!-- Idle State: Start Fasting Button -->
      <div class="fasting-idle-copy">${plan.desc}</div>
      <div class="fasting-plan-visual"><span>${plan.fastHours}h</span><i></i><span>${plan.eatHours}h</span></div>
      ${lastFast ? `<div class="fasting-last-fast">Letztes Fasten: <b>${lastFast.hours.toLocaleString('de-DE')} h</b></div>` : ''}
      <button class="btn-primary" onclick="startFast()" style="width:100%">▶️ Fasten jetzt starten (${plan.fastHours}h)</button>
    `}
    </section>
  `;

  if (isFasting) {
    updateFastingClock();
    startFastingTimer();
  }
}

function renderFastingPage() { renderFastingWidget('fasting-page-module'); }

function openFastingModal() {
  openModal('modal-fasting-plan');
}
