// ===== goals.js =====
// Goals configuration, Import & Export

function loadGoalsForm() {
  document.getElementById('goal-kcal').value    = db.goals.kcal;
  document.getElementById('goal-protein').value = db.goals.protein;
  document.getElementById('goal-carbs').value   = db.goals.carbs;
  document.getElementById('goal-fat').value     = db.goals.fat;
}

function saveGoals(btn) {
  db.goals = {
    kcal:    parseFloat(document.getElementById('goal-kcal').value)    || 2000,
    protein: parseFloat(document.getElementById('goal-protein').value) || 150,
    carbs:   parseFloat(document.getElementById('goal-carbs').value)   || 250,
    fat:     parseFloat(document.getElementById('goal-fat').value)     || 65,
  };
  save(); renderToday();
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '✅ Gespeichert!';
  setTimeout(() => btn.textContent = orig, 1800);
}

function exportData() {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'macro-tracker-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const status = document.getElementById('import-status');
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed.foods || !parsed.log || !parsed.goals) throw new Error('Ungültiges Format');
      db = Object.assign(EMPTY_DB(), parsed);
      save();
      renderToday();
      renderLibrary();
      loadGoalsForm();
      status.style.display = 'block';
      status.style.background = 'rgba(16,185,129,.12)';
      status.style.color = 'var(--green)';
      status.textContent = '✅ Daten erfolgreich importiert!';
    } catch(err) {
      status.style.display = 'block';
      status.style.background = 'rgba(244,63,94,.12)';
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Fehler: ' + err.message;
    }
    setTimeout(() => status.style.display = 'none', 3500);
    e.target.value = '';
  };
  reader.readAsText(file);
}
