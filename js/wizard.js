// ===== wizard.js =====
// TDEE Calculator Wizard

let wData = {};
let wStep = 1;

function openWizard() {
  wData = {};
  wStep = 1;

  // Reset all choices
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('w-age').value = '';
  document.getElementById('w-weight').value = '';
  document.getElementById('w-height').value = '';
  document.getElementById('w1-next').disabled = true;
  document.getElementById('w3-next').disabled = true;
  document.getElementById('w4-next').disabled = true;

  // Pre-fill if editing
  if (db.profile) {
    const p = db.profile;
    wData = { gender: p.gender, age: p.age, weight: p.weight, height: p.height, activity: p.activity, goal: p.goal, delta: p.delta };
    document.getElementById('w-age').value    = p.age;
    document.getElementById('w-weight').value = p.weight;
    document.getElementById('w-height').value = p.height;
    // Re-activate matching buttons
    document.querySelectorAll('.choice-btn').forEach(b => {
      const v = b.dataset.val;
      if (v === p.gender || v === String(p.activity) || v === p.goal) b.classList.add('active');
    });
    if (p.gender)   document.getElementById('w1-next').disabled = false;
    if (p.activity) document.getElementById('w3-next').disabled = false;
    if (p.goal)     document.getElementById('w4-next').disabled = false;
    // Build + pre-select the intensity step so step 5 isn't empty when editing.
    if (p.goal && p.goal !== 'maintain') {
      buildIntensityStep(p.goal);
      document.querySelectorAll('#w5-choices .choice-btn').forEach(b => {
        if (parseInt(b.dataset.val) === p.delta) b.classList.add('active');
      });
      if (p.delta) document.getElementById('w5-next').disabled = false;
    }
  }

  renderWizardStep(1);
  openModal('modal-wizard');
}

function renderWizardStep(step) {
  wStep = step;
  const total = db.profile || wData.goal === 'maintain' ? 5 : 6;

  // Progress dots (steps 1-5 or 1-6)
  const dots = [];
  for (let i = 1; i <= 5; i++) {
    let cls = i < step ? 'done' : i === step ? 'active' : '';
    dots.push(`<div class="wizard-dot ${cls}"></div>`);
  }
  document.getElementById('wizard-progress').innerHTML = dots.join('');
  document.getElementById('wizard-title').textContent =
    step === 6 ? 'Ergebnis' : 'Tagesbedarf berechnen';

  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`wstep-${step}`);
  if (el) el.classList.add('active');
}

function pickChoice(btn, field) {
  // Deselect siblings
  btn.closest('.choice-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  wData[field] = field === 'activity' ? parseFloat(btn.dataset.val) : btn.dataset.val;

  if (field === 'gender')   document.getElementById('w1-next').disabled = false;
  if (field === 'activity') document.getElementById('w3-next').disabled = false;
  if (field === 'goal') {
    document.getElementById('w4-next').disabled = false;
    // Prepare step 5 intensity options (only cut/bulk need an intensity; maintain skips it)
    if (wData.goal !== 'maintain') buildIntensityStep(wData.goal);
  }
}

function buildIntensityStep(goal) {
  if (goal === 'cut') {
    document.getElementById('w5-question').textContent = 'Wie stark soll das Kaloriendefizit sein?';
    document.getElementById('w5-sub').textContent      = 'Moderat schützt am besten die Muskelmasse und ist nachhaltig.';
    document.getElementById('w5-choices').innerHTML = `
      <button class="choice-btn" data-val="250" onclick="pickIntensity(this)">
        <div class="choice-icon">🐢</div>
        <span class="choice-label">Leicht (−250 kcal)</span>
        <span class="choice-desc">Sehr langsam · Ideal für Anfänger oder nach dem Bulk</span>
      </button>
      <button class="choice-btn" data-val="500" onclick="pickIntensity(this)">
        <div class="choice-icon">⚡</div>
        <span class="choice-label">Moderat (−500 kcal)</span>
        <span class="choice-desc">~0,5 kg/Woche · Der Klassiker · Empfohlen</span>
      </button>
      <button class="choice-btn" data-val="750" onclick="pickIntensity(this)">
        <div class="choice-icon">🔥</div>
        <span class="choice-label">Aggressiv (−750 kcal)</span>
        <span class="choice-desc">Schnell · Erhöhtes Risiko für Muskelverlust</span>
      </button>`;
  } else {
    document.getElementById('w5-question').textContent = 'Wie viel Überschuss für den Aufbau?';
    document.getElementById('w5-sub').textContent      = 'Weniger Überschuss = weniger Fettzunahme beim Bulk.';
    document.getElementById('w5-choices').innerHTML = `
      <button class="choice-btn" data-val="200" onclick="pickIntensity(this)">
        <div class="choice-icon">🐢</div>
        <span class="choice-label">Lean Bulk (+200 kcal)</span>
        <span class="choice-desc">Sehr langsam · Kaum Fettaufbau · Empfohlen</span>
      </button>
      <button class="choice-btn" data-val="400" onclick="pickIntensity(this)">
        <div class="choice-icon">💪</div>
        <span class="choice-label">Moderat (+400 kcal)</span>
        <span class="choice-desc">Gute Balance aus Wachstum und Fettaufbau</span>
      </button>
      <button class="choice-btn" data-val="700" onclick="pickIntensity(this)">
        <div class="choice-icon">🍔</div>
        <span class="choice-label">Dirty Bulk (+700 kcal)</span>
        <span class="choice-desc">Schnell · Deutliche Fettzunahme möglich</span>
      </button>`;
  }
  document.getElementById('w5-next').disabled = true;
}

function pickIntensity(btn) {
  btn.closest('.choice-grid').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  wData.delta = parseInt(btn.dataset.val);
  document.getElementById('w5-next').disabled = false;
}

function wizardNext() {
  if (wStep === 1 && !wData.gender) return;
  if (wStep === 3 && !wData.activity) return;
  if (wStep === 4 && !wData.goal) return;
  // "Halten" braucht keine Intensität → Schritt 5 überspringen und direkt berechnen.
  if (wStep === 4 && wData.goal === 'maintain') { wizardCalc(); return; }
  renderWizardStep(wStep + 1);
}

function wizardNext2() {
  const age    = parseInt(document.getElementById('w-age').value);
  const weight = parseFloat(document.getElementById('w-weight').value);
  const height = parseInt(document.getElementById('w-height').value);
  if (!age || age < 14 || age > 90)         { alert('Bitte ein gültiges Alter eingeben (14–90).'); return; }
  if (!weight || weight < 30 || weight > 300) { alert('Bitte ein gültiges Gewicht eingeben.'); return; }
  if (!height || height < 100 || height > 250) { alert('Bitte eine gültige Größe eingeben.'); return; }
  wData.age = age; wData.weight = weight; wData.height = height;
  renderWizardStep(3);
}

function wizardBack() {
  if (wStep <= 1) return;
  renderWizardStep(wStep - 1);
}

function wizardCalc() {
  if (wData.goal !== 'maintain' && !wData.delta) return;
  const needs = computeNeeds(wData);

  // Store in temporary wizard result (do NOT save to db yet)
  wData._result = { ...wData, ...needs };

  // Build result display
  const goalLabels = { cut:'Definieren (Cut)', maintain:'Halten', bulk:'Aufbauen (Bulk)' };
  const p = wData._result;
  document.getElementById('wizard-result-summary').textContent =
    `${p.gender === 'm' ? 'Männlich' : 'Weiblich'}, ${p.age} J, ${p.weight} kg, ${p.height} cm · ${goalLabels[p.goal]}`;

  const dietTitle = p.goal === 'cut'
    ? `Diät <small>−${p.delta} kcal</small>`
    : p.goal === 'bulk'
    ? `Aufbau <small>+${p.delta} kcal</small>`
    : `(= Erhaltung)`;

  document.getElementById('wizard-result-compare').innerHTML = `
    <div class="result-col">
      <div class="result-col-title m">Erhaltung</div>
      <div class="result-col-kcal">${p.maintenance.kcal}<small> kcal</small></div>
      <div class="result-macro"><span style="color:var(--protein)">Protein</span><b>${p.maintenance.protein} g</b></div>
      <div class="result-macro"><span style="color:var(--carbs)">Carbs</span><b>${p.maintenance.carbs} g</b></div>
      <div class="result-macro"><span style="color:var(--fat)">Fett</span><b>${p.maintenance.fat} g</b></div>
    </div>
    <div class="result-col highlight">
      <div class="result-col-title d">${dietTitle}</div>
      <div class="result-col-kcal">${p.diet.kcal}<small> kcal</small></div>
      <div class="result-macro"><span style="color:var(--protein)">Protein</span><b>${p.diet.protein} g</b></div>
      <div class="result-macro"><span style="color:var(--carbs)">Carbs</span><b>${p.diet.carbs} g</b></div>
      <div class="result-macro"><span style="color:var(--fat)">Fett</span><b>${p.diet.fat} g</b></div>
    </div>`;

  const applyDietBtn = document.getElementById('btn-apply-diet');
  const applyMaintBtn = document.getElementById('btn-apply-maintain');
  if (p.goal === 'cut') {
    applyDietBtn.textContent = '📌 Diät-Makros als Ziele übernehmen';
    applyMaintBtn.textContent = 'Stattdessen Erhaltung übernehmen';
  } else if (p.goal === 'bulk') {
    applyDietBtn.textContent = '📌 Aufbau-Makros als Ziele übernehmen';
    applyMaintBtn.textContent = 'Stattdessen Erhaltung übernehmen';
  } else {
    applyDietBtn.style.display = 'none';
    applyMaintBtn.textContent = '📌 Makros als Ziele übernehmen';
  }

  renderWizardStep(6);
}
