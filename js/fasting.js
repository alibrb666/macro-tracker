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
  if (elapsedHours < 4)  return { name: 'Fasten gestartet', icon: '🍽️', desc: 'Dein Körper verdaut noch die letzte Mahlzeit.' };
  if (elapsedHours < 12) return { name: 'Fasten läuft',     icon: '⏱️', desc: 'Trinke ausreichend und achte auf dein Wohlbefinden.' };
  if (elapsedHours < 16) return { name: 'Längeres Fasten',  icon: '🌙', desc: 'Hunger kann in Wellen kommen und wieder abflauen.' };
  return                        { name: 'Fastenziel erreicht', icon: '✨', desc: 'Beende dein Fasten, wenn es zu deinem Plan und Befinden passt.' };
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
  document.querySelectorAll('[data-fasting-summary]').forEach(el => { el.textContent = `${hours}h ${mins}m`; });
  document.querySelectorAll('[data-fasting-summary-progress]').forEach(el => { el.style.width = `${pct}%`; });
  document.querySelectorAll('[data-fasting-summary-pct]').forEach(el => { el.textContent = `${pct}% des Ziels`; });
}

function renderFastingWidget(targetId = 'fasting-widget') {
  const widget = document.getElementById(targetId);
  if (!widget) return;

  const planKey = getFastingPlan();
  const plan = FASTING_PLANS[planKey] || FASTING_PLANS['16:8'];
  const isFasting = !!db.fastingStart;
  const history = db.fastingHistory || [];
  const lastFast = history.length ? history[history.length - 1] : null;

  if (targetId === 'fasting-widget') {
    const elapsed = isFasting ? Math.max(0, (Date.now() - new Date(db.fastingStart).getTime()) / 3600000) : 0;
    const pct = Math.min(100, Math.round(elapsed / plan.fastHours * 100));
    widget.innerHTML = `<section class="fasting-card-box module-summary ${isFasting ? 'is-active' : ''}" aria-label="Fasten Übersicht"><div class="module-summary-head"><span>⏱️ Fasten</span><button onclick="openSection('fasting')">Details ↗</button></div><div class="module-summary-value">${isFasting ? `<span data-fasting-summary>${Math.floor(elapsed)}h ${Math.round(elapsed % 1 * 60)}m</span>` : plan.name}<small>${isFasting ? ' Fasten läuft' : ' bereit zum Start'}</small></div><div class="module-summary-track fasting-summary-track"><i data-fasting-summary-progress style="width:${pct}%"></i></div><div class="module-summary-bottom"><span ${isFasting ? 'data-fasting-summary-pct' : ''}>${isFasting ? `${pct}% des Ziels` : `${plan.fastHours}h Fastenfenster`}</span><button class="module-quick-add" onclick="${isFasting ? 'stopFast()' : 'startFast()'}">${isFasting ? 'Beenden' : 'Starten'}</button></div></section>`;
    return;
  }

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

function renderFastingPage() {
  renderFastingWidget('fasting-page-module');
  const page = document.getElementById('fasting-page-module');
  if (!page) return;
  const history = (db.fastingHistory || []).slice().reverse();
  const totalHours = history.reduce((sum, fast) => sum + fast.hours, 0);
  page.insertAdjacentHTML('beforeend', `<div class="module-detail-grid fasting-details"><section class="module-detail-card"><span>Deine Statistik</span><div class="fasting-stat-grid"><div><b>${history.length}</b><small>Fasten</small></div><div><b>${Math.round(totalHours)}</b><small>Stunden</small></div><div><b>${history.length ? Math.round(totalHours / history.length * 10) / 10 : 0}</b><small>Ø Stunden</small></div></div></section><section class="module-detail-card"><span>Letzte Fasten</span><div class="fasting-history-list">${history.length ? history.slice(0,5).map(fast => `<div><b>${fast.hours.toLocaleString('de-DE')} h</b><span>${FASTING_PLANS[fast.plan]?.name || fast.plan} · ${new Date(fast.end).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}</span></div>`).join('') : '<p>Dein Fastenverlauf erscheint nach dem ersten abgeschlossenen Fasten.</p>'}</div></section></div>${renderFastingGuide()}`);
}

function renderFastingGuide() {
  return `<section class="fasting-guide" aria-labelledby="fasting-guide-title">
    <div class="fasting-guide-heading"><div><span class="module-kicker">HILFE & WISSEN</span><h2 id="fasting-guide-title">Fasten einfach erklärt</h2></div><span aria-hidden="true">💡</span></div>
    <p class="fasting-guide-intro">Intervallfasten beschreibt einen Essensrhythmus: Du wechselst zwischen einem Essensfenster und einer Fastenzeit. Es ist keine Pflicht und kein Ersatz für eine ausgewogene Ernährung.</p>
    <div class="fasting-guide-steps">
      <article><b>1. Sanft starten</b><span>Wähle zum Einstieg 14:10. Wenn es sich gut anfühlt, kannst du später 16:8 ausprobieren.</span></article>
      <article><b>2. Fastenzeit</b><span>Wasser, ungesüßter Tee und schwarzer Kaffee passen für viele Menschen in die Fastenzeit.</span></article>
      <article><b>3. Essensfenster</b><span>Iss ausreichend, ausgewogen und proteinreich – Fasten soll kein Anlass sein, Mahlzeiten zwanghaft auszulassen.</span></article>
    </div>
    <details class="fasting-guide-details"><summary>Welcher Plan passt zu mir?</summary><p><b>14:10</b> ist ein leichter Einstieg. <b>16:8</b> ist ein verbreiteter Alltagsrhythmus. <b>18:6 und 20:4</b> sind enger und nicht automatisch wirksamer. Entscheidend ist, was dauerhaft zu deinem Alltag und deinem Wohlbefinden passt.</p></details>
    <details class="fasting-guide-details"><summary>Tipps für den Alltag</summary><p>Plane dein Essensfenster rund um Arbeit, Sport und soziale Termine. Trinke regelmäßig. Bei starkem Hunger, Schwindel, Zittern, Kopfschmerzen oder Unwohlsein: Fasten beenden, etwas essen und bei anhaltenden Beschwerden medizinischen Rat einholen.</p></details>
    <aside class="fasting-guide-note"><b>Wichtig:</b> Nicht ohne ärztliche Rücksprache fasten bei Schwangerschaft oder Stillzeit, Essstörungen, Untergewicht, Diabetes bzw. blutzuckersenkenden Medikamenten oder einer Erkrankung. Diese Hilfe ist allgemeine Information und keine medizinische Beratung.</aside>
  </section>`;
}

function openFastingModal() {
  openModal('modal-fasting-plan');
}
