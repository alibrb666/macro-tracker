// ===== bedarf.js =====
// Daily Needs (Bedarf) Tab logic

function renderBedarf() {
  const el = document.getElementById('bedarf-content');
  if (!db.profile) {
    el.innerHTML = renderWeightCard() + `
      <div class="bedarf-intro">
        <div class="icon">🎯</div>
        <h3>Tagesbedarf berechnen</h3>
        <p>Beantworte 5 kurze Fragen zu deinem Körper und deinen Zielen. Wir berechnen deinen genauen Erhaltungsbedarf und deine optimalen Diät-Makros.</p>
        <button class="btn-primary" onclick="openWizard()" style="width:auto;padding:12px 32px">
          Jetzt berechnen →
        </button>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;font-size:13px;color:var(--muted);line-height:1.6">
        <b style="color:var(--text);display:block;margin-bottom:6px">Wie wird berechnet?</b>
        Wir nutzen die <b style="color:var(--text)">Mifflin-St Jeor Formel</b> für den Grundumsatz (BMR) — die genaueste frei verfügbare Methode.
        Multipliziert mit deinem Aktivitätsfaktor ergibt das deinen Gesamtumsatz (TDEE).
        Protein wird auf <b style="color:var(--text)">1,8 g/kg</b> gesetzt zum Muskelerhalt, Fett auf mindestens <b style="color:var(--text)">0,9 g/kg</b>.
        Kohlenhydrate füllen die restlichen Kalorien.
      </div>`;
    return;
  }

  const p = db.profile;
  const goalLabels = { cut:'Definieren', maintain:'Halten', bulk:'Aufbauen' };
  const actLabels  = { '1.2':'Kaum aktiv', '1.375':'Leicht aktiv', '1.55':'Moderat aktiv', '1.725':'Sehr aktiv', '1.9':'Extrem aktiv' };
  const deltaSign  = p.goal === 'cut' ? '-' : '+';
  const deltaTxt   = p.goal === 'maintain' ? '' : ` (${deltaSign}${p.delta} kcal)`;
  const badgeClass = { cut:'cut', maintain:'maintain', bulk:'bulk' }[p.goal];

  el.innerHTML = renderWeightCard() + `
    <div class="profile-summary">
      <div class="profile-summary-text">
        <strong>${p.gender === 'm' ? '♂' : '♀'} ${p.age} J · ${p.weight} kg · ${p.height} cm</strong>
        ${actLabels[String(p.activity)]} · ${goalLabels[p.goal]}${deltaTxt}
      </div>
      <button class="btn-outline" onclick="openWizard()" style="flex:none;padding:8px 14px;font-size:12px">
        Neu berechnen
      </button>
    </div>

    <div class="needs-result">
      <div class="needs-header">
        <span>Dein Tagesbedarf</span>
        <span class="delta-badge ${badgeClass}">${goalLabels[p.goal]}${deltaTxt}</span>
      </div>
      <div class="needs-cols">
        ${needsCol('Erhaltung', p.maintenance, 'm')}
        ${p.goal !== 'maintain' ? needsCol('Diät', p.diet, 'd') : needsCol('(= Erhaltung)', p.maintenance, 'd')}
      </div>
      <div class="needs-actions">
        ${p.goal !== 'maintain'
          ? `<button class="btn-outline accent" onclick="applyNeeds('diet')" style="font-size:12px">📌 Diät als Ziele</button>
             <button class="btn-outline" onclick="applyNeeds('maintain')" style="font-size:12px">📌 Erhaltung als Ziele</button>`
          : `<button class="btn-outline accent" onclick="applyNeeds('maintain')" style="font-size:12px">📌 Als Ziele übernehmen</button>`
        }
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;font-size:13px;color:var(--muted);line-height:1.7">
      <b style="color:var(--text);display:block;margin-bottom:4px">Dein Grundumsatz (BMR)</b>
      ${Math.round(calcBMR(p))} kcal/Tag ohne jegliche Aktivität.<br>
      Mit Aktivitätsfaktor ${p.activity}: <b style="color:var(--text)">${p.maintenance.kcal} kcal TDEE</b>.
    </div>`;
}

function needsCol(title, m, cls) {
  return `
    <div class="needs-col">
      <div class="needs-col-title ${cls}">${title}</div>
      <div class="needs-kcal">${m.kcal}<span> kcal</span></div>
      <div class="needs-macro-row"><span class="needs-macro-label" style="color:var(--protein)">Protein</span><span class="needs-macro-val">${m.protein} g</span></div>
      <div class="needs-macro-row"><span class="needs-macro-label" style="color:var(--carbs)">Kohlenhydrate</span><span class="needs-macro-val">${m.carbs} g</span></div>
      <div class="needs-macro-row"><span class="needs-macro-label" style="color:var(--fat)">Fett</span><span class="needs-macro-val">${m.fat} g</span></div>
    </div>`;
}

function applyNeeds(type) {
  if (typeof wData !== 'undefined' && wData._result) {
    db.profile = wData._result;
    if (!Array.isArray(db.weights)) db.weights = [];
    if (wData._result.weight) {
      const today = todayKey();
      const existing = db.weights.find(w => w.date === today);
      if (existing) existing.kg = wData._result.weight;
      else db.weights.push({ date: today, kg: wData._result.weight });
      db.weights.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  if (!db.profile) return;
  const m = type === 'diet' ? db.profile.diet : db.profile.maintenance;
  db.goals = { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat };
  save();
  loadGoalsForm();
  renderToday();

  // Flash feedback
  const btns = document.querySelectorAll('#bedarf-content button');
  btns.forEach(b => {
    if (b.textContent.includes(type === 'diet' ? 'Diät' : 'Erhaltung')) {
      const orig = b.textContent;
      b.textContent = '✅ Übernommen!';
      setTimeout(() => b.textContent = orig, 1800);
    }
  });
}
