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

// Creates a self-contained, analysis-friendly export for the day currently
// shown on the "Heute" page. Food data is copied into every entry so an
// export remains interpretable even when the food library changes later.
function exportDayData() {
  const date = viewKey();
  const entries = db.log[date] || [];
  const targets = goalsForDate(date);
  const workoutEntries = typeof workoutsForDate === 'function' ? workoutsForDate(date) : [];
  const netWorkoutBurn = typeof netWorkoutBurnForDate === 'function' ? netWorkoutBurnForDate(date) : 0;
  const adjustedKcalTarget = Number(targets.kcal || 0) + netWorkoutBurn;
  const totals = entries.reduce((sum, entry) => ({
    kcal: sum.kcal + Number(entry.kcal || 0),
    protein_g: sum.protein_g + Number(entry.protein || 0),
    carbs_g: sum.carbs_g + Number(entry.carbs || 0),
    fat_g: sum.fat_g + Number(entry.fat || 0),
  }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const meals = MEALS.map(meal => ({
    id: meal.id,
    name: meal.label,
    emoji: meal.emoji,
    entries: entries
      .filter(entry => (entry.meal || 'hauptspeise') === meal.id)
      .map((entry, index) => dayExportEntry(entry, index + 1)),
  }));
  const weightEntries = (db.weights || []).filter(entry => entry.date === date);
  const waterEntries = ((db.waterEntries || {})[date] || []).map(entry => ({ ...entry }));
  const dayStart = new Date(date + 'T00:00:00');
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const fastingSessions = (db.fastingHistory || []).filter(entry => {
    const start = new Date(entry.start);
    const end = new Date(entry.end);
    return start < dayEnd && end > dayStart;
  }).map(entry => ({ ...entry }));

  const payload = {
    schema: 'macro-tracker-day-export',
    schema_version: 1,
    exported_at: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    day: {
      date,
      weekday: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(dayStart),
      entries_count: entries.length,
      nutrition_targets: {
        kcal: Number(targets.kcal || 0),
        kcal_with_net_workout_burn: adjustedKcalTarget,
        protein_g: Number(targets.protein || 0),
        carbs_g: Number(targets.carbs || 0),
        fat_g: Number(targets.fat || 0),
      },
      totals,
      remaining_to_target: {
        kcal: adjustedKcalTarget - totals.kcal,
        protein_g: Number(targets.protein || 0) - totals.protein_g,
        carbs_g: Number(targets.carbs || 0) - totals.carbs_g,
        fat_g: Number(targets.fat || 0) - totals.fat_g,
      },
      // Flat list for analysis tools; the same entries are also grouped below.
      logged_food_entries: entries.map((entry, index) => dayExportEntry(entry, index + 1)),
      meals,
      workouts: {
        net_calories_burned: netWorkoutBurn,
        entries: workoutEntries.map(entry => ({ ...entry })),
      },
      hydration: {
        total_ml: Number((db.water || {})[date] || 0),
        target_ml: Number(getWaterTarget()),
        entries: waterEntries,
      },
      weight_entries_kg: weightEntries,
      fasting: {
        selected_plan: db.fastingPlan || '16:8',
        plan_details: FASTING_PLANS[db.fastingPlan || '16:8'] || null,
        completed_sessions_overlapping_day: fastingSessions,
        active_session_at_export: db.fastingStart || null,
      },
    },
    // A snapshot makes the targets and weight context understandable in a
    // later analysis. It does not contain account identifiers or PIN data.
    analysis_context: {
      profile: db.profile ? { ...db.profile } : null,
      weight_goal_mode: typeof weightGoalMode === 'function' ? weightGoalMode() : null,
      latest_weight_on_or_before_day: latestWeightForExport(date),
    },
  };

  downloadJson(payload, `macro-tracker-tag-${date}.json`);
  showToast('📥 Tagesdaten als JSON heruntergeladen', 'success');
}

function dayExportEntry(entry, position) {
  const food = (db.foods || []).find(item => item.id === entry.foodId);
  return {
    position,
    entry_id: entry._id || null,
    meal_id: entry.meal || 'hauptspeise',
    meal_name: (MEALS.find(meal => meal.id === (entry.meal || 'hauptspeise')) || {}).label || 'Hauptspeise',
    food_name: food ? food.name : null,
    consumed_amount: {
      grams: Number(entry.amount || 0),
      units: entry.units == null ? null : Number(entry.units),
      unit_label: entry.unitLabel || null,
      unit_plural: entry.unitPlural || null,
    },
    consumed_nutrition: {
      kcal: Number(entry.kcal || 0),
      protein_g: Number(entry.protein || 0),
      carbs_g: Number(entry.carbs || 0),
      fat_g: Number(entry.fat || 0),
    },
    // Complete food snapshot, including custom fields and an optional photo.
    // Null means the food was removed from the library after it was logged.
    food_at_export: food ? JSON.parse(JSON.stringify(food)) : null,
    // Preserves every original log property should the app gain new fields.
    raw_log_entry: JSON.parse(JSON.stringify(entry)),
  };
}

function latestWeightForExport(date) {
  return (db.weights || []).filter(entry => entry.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date)).pop() || null;
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
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
