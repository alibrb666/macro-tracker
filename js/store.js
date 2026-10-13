// ===== store.js =====
// State and local storage

let db = {
  foods: [],
  log: {},
  goals: { kcal: 2000, protein: 150, carbs: 250, fat: 65, sugars: 50 },
  profile: null,  // { gender, age, weight, height, activity, goal, delta, maintenance, diet }
  weights: [],    // [{ date: 'YYYY-MM-DD', kg: number }] — chronologisch, älteste zuerst
  workouts: {}    // { 'YYYY-MM-DD': [WorkoutEntry] }
};

function dataKey(id) {
  return 'mt-data-' + id;
}

function loadUserDB(id, { persistFallback = true } = {}) {
  try {
    const raw = localStorage.getItem(dataKey(id));
    const empty = EMPTY_DB();
    if (raw) {
      const parsed = JSON.parse(raw);
      const hasData = (Array.isArray(parsed.foods) && parsed.foods.length > 0) || (parsed.log && Object.keys(parsed.log).length > 0);
      db = {
        foods: (Array.isArray(parsed.foods) && parsed.foods.length > 0) ? parsed.foods : empty.foods,
        log: (parsed.log && Object.keys(parsed.log).length > 0) ? parsed.log : empty.log,
        goals: { ...empty.goals, sugars: 50, ...(parsed.goals || {}) },
        profile: parsed.profile || empty.profile,
        weights: (Array.isArray(parsed.weights) && parsed.weights.length > 0) ? parsed.weights : empty.weights,
        water: parsed.water || {},
        waterGoal: parsed.waterGoal || 2500,
        waterEntries: parsed.waterEntries || {},
        fastingPlan: parsed.fastingPlan || '16:8',
        fastingStart: parsed.fastingStart || null,
        fastingHistory: Array.isArray(parsed.fastingHistory) ? parsed.fastingHistory : [],
        workouts: parsed.workouts || {},
      };
      if (!hasData && persistFallback) {
        save();
      }
    } else {
      db = empty;
      if (persistFallback) save();
    }
  } catch(e) { db = EMPTY_DB(); if (persistFallback) save(); }
  return db;
}

function mirrorUserDB(userId, projection) {
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(projection));
    return true;
  } catch (error) {
    console.warn('Durable projection committed but LocalStorage mirror failed:', error);
    return false;
  }
}

function save(onCommitted) {
  const durableSyncEnabled = typeof syncV2Enabled === 'function' && syncV2Enabled() && currentUser && !currentUser.isGuest;
  if (durableSyncEnabled) {
    const userId = currentUser.id;
    const sessionGeneration = authSessionGeneration;
    // IDs are assigned before enqueueing so repeated clicks while a prior
    // transaction is pending still describe the same local entities.
    db = ensureSyncEntityIds(db);
    return SyncWorker.commit(userId, db).then(({ projection }) => {
      if (!sessionIsActive(userId, sessionGeneration)) {
        console.info('Durable save completed after its session ended; UI update skipped.');
        return false;
      }
      // Keep the legacy copy intact during the opt-in migration. It is written
      // only after the IndexedDB transaction committed successfully.
      db = projection;
      const mirrored = mirrorUserDB(userId, projection);
      if (!mirrored) console.warn('Legacy LocalStorage mirror is stale; IndexedDB remains authoritative.');
      if (typeof onCommitted === 'function') {
        try { onCommitted(); }
        catch (callbackError) { console.error('Durable save committed, but its UI callback failed:', callbackError); }
      }
      return true;
    }).catch(error => {
      if (!sessionIsActive(userId, sessionGeneration)) {
        console.info('Durable save failed after its session ended; UI update skipped.');
        return false;
      }
      const reload = error.message === 'Local projection changed in another tab; reload required'
        ? SyncWorker.refresh(userId).catch(() => null)
        : Promise.resolve({ projection: SyncWorker.projection(userId) });
      console.error('Durable local sync save failed:', error);
      return reload.then(recovered => {
        if (!sessionIsActive(userId, sessionGeneration)) return false;
        if (recovered?.projection) {
          db = recovered.projection;
          if (typeof refreshAll === 'function') refreshAll();
        }
        alert(error.message === 'Local projection changed in another tab; reload required'
          ? '⚠️ Änderungen in einem anderen Tab erkannt. Der aktuelle lokale Stand wurde geladen; deine ungespeicherte Änderung wurde nicht übernommen.'
          : '⚠️ Lokale Synchronisierung konnte nicht sicher gespeichert werden. Bitte nicht schließen und Speicherplatz/Browsereinstellungen prüfen.');
        return false;
      });
    });
  }
  try {
    if (currentUser) localStorage.setItem(dataKey(currentUser.id), JSON.stringify(db));
  } catch (e) {
    // Quota überschritten (z. B. zu viele Fotos) oder privates Fenster ohne Speicher.
    alert('⚠️ Speicher voll — der letzte Eintrag konnte nicht lokal gespeichert werden.\n\nLösche alte Fotos oder Einträge, um Platz zu schaffen.');
    return Promise.resolve(false);
  }
  cloudSyncSoon();
  if (typeof onCommitted === 'function') onCommitted();
  return Promise.resolve(true);
}

function dateKeyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayKey() {
  return dateKeyOf(new Date());
}

// Currently viewed day on the "Heute" tab. null = today.
let viewDate = null;

function viewKey() {
  return viewDate ? dateKeyOf(viewDate) : todayKey();
}
