// ===== store.js =====
// State and local storage

let db = {
  foods: [],
  log: {},
  goals: { kcal: 2000, protein: 150, carbs: 250, fat: 65 },
  profile: null,  // { gender, age, weight, height, activity, goal, delta, maintenance, diet }
  weights: []     // [{ date: 'YYYY-MM-DD', kg: number }] — chronologisch, älteste zuerst
};

function hashPin(pin) {
  // Leichtgewichtiger Hash (clientseitig, keine echte Krypto möglich)
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h + pin.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(36);
}

function loadUsers() {
  try { users = JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch(e) { users = []; }
}

function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  cloudSyncSoon();
}

function dataKey(id) {
  return 'mt-data-' + id;
}

function loadUserDB(id) {
  try {
    const raw = localStorage.getItem(dataKey(id));
    if (raw) {
      const parsed = JSON.parse(raw);
      const empty = EMPTY_DB();
      db = {
        foods: Array.isArray(parsed.foods) ? parsed.foods : empty.foods,
        log: (parsed.log && typeof parsed.log === 'object') ? parsed.log : empty.log,
        goals: { ...empty.goals, ...(parsed.goals || {}) },
        profile: parsed.profile || empty.profile,
        weights: Array.isArray(parsed.weights) ? parsed.weights : empty.weights,
      };
    } else {
      db = EMPTY_DB();
    }
  } catch(e) { db = EMPTY_DB(); }
}

function save() {
  try {
    if (currentUser) localStorage.setItem(dataKey(currentUser.id), JSON.stringify(db));
  } catch (e) {
    // Quota überschritten (z. B. zu viele Fotos) oder privates Fenster ohne Speicher.
    alert('⚠️ Speicher voll — der letzte Eintrag konnte nicht lokal gespeichert werden.\n\nLösche alte Fotos oder Einträge, um Platz zu schaffen.');
    return;
  }
  cloudSyncSoon();
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
