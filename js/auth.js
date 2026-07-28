// ===== auth.js =====
// Authentication, PIN pad, and Profile selection

let users        = [];     // Profil-Liste
let currentUser  = null;   // aktives Profil-Objekt
let pinBuffer    = '';     // aktuell eingetippter PIN
let pinMode      = 'enter';// 'enter' | 'set' | 'confirm'
let pinTarget    = null;   // Profil bei 'enter'
let firstPin     = '';     // gemerkter PIN bei 'set' → 'confirm'
let newProfile   = null;   // { name, emoji } während Erstellung

function init() {
  loadUsers();
  initCloud();
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); })
  );
  document.getElementById('lib-search').addEventListener('input', e => renderLibrary(e.target.value));

  const sessionId = sessionStorage.getItem('mt-current');
  if (sessionId && users.some(u => u.id === sessionId)) {
    enterApp(users.find(u => u.id === sessionId));
  } else if (!users.length) {
    const defaultUser = { id: 'user-ali', name: 'Ali', emoji: '🥗' };
    users = [defaultUser];
    saveUsers();
    enterApp(defaultUser);
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  loadUsers();
  // Hat das Gerät schon Profile → direkt zur Auswahl; sonst der Einstieg
  // (Einloggen / Registrieren / ohne Konto).
  if (users.length) loginShowSelect();
  else loginShowHome();
}

// Zeigt genau EINE Login-Ansicht, blendet die anderen aus.
function showLoginView(id) {
  ['login-home','login-select','login-cloud','login-register','login-create','login-pin']
    .forEach(v => { const el = document.getElementById(v); if (el) el.style.display = (v === id ? 'block' : 'none'); });
}
function loginShowHome() { showLoginView('login-home'); }

function loginContinueOffline() {
  loadUsers();
  if (users.length) loginShowSelect();
  else loginShowCreate();
}
function loginBackFromCreate() {
  loadUsers();
  if (users.length) loginShowSelect();
  else loginShowHome();
}

function resolvePostLogin() {
  loadUsers();
  const pending = localStorage.getItem(PENDING_NAME_KEY);
  if (!users.length && pending) {
    localStorage.removeItem(PENDING_NAME_KEY);
    const user = { id: uid(), name: pending.slice(0, 20) || 'Profil', emoji: AVATARS[0] };  // kein pinHash
    users.push(user);
    saveUsers();
    enterApp(user);
    return;
  }
  if (users.length === 1 && !users[0].pinHash) { enterApp(users[0]); return; }
  loginShowSelect();
}

function enterApp(user) {
  currentUser = user;
  sessionStorage.setItem('mt-current', user.id);
  loadUserDB(user.id);

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' });
  document.getElementById('profile-chip-emoji').textContent = user.emoji;
  document.getElementById('profile-chip-name').textContent  = user.name;

  renderToday();
  renderLibrary();
  renderBedarf();
  loadGoalsForm();
}

function logout() {
  sessionStorage.removeItem('mt-current');
  currentUser = null;
  showLogin();
}

function loginShowCloud() {
  showLoginView('login-cloud');
  const st = document.getElementById('login-cloud-status');
  if (st) st.style.display = 'none';
}

function loginShowRegister() {
  showLoginView('login-register');
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-email-form').style.display = 'none';
  ['reg-email','reg-pw'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  const st = document.getElementById('login-reg-status'); if (st) st.style.display = 'none';
  updateRegMethods();
}

function updateRegMethods() {
  const ok = document.getElementById('reg-name').value.trim().length >= 1;
  ['reg-m-email','reg-m-google','reg-m-github'].forEach(id => document.getElementById(id).disabled = !ok);
}
function regChooseEmail() {
  document.getElementById('reg-email-form').style.display = 'block';
  document.getElementById('reg-email').focus();
}
function regOAuth(provider) {
  const name = document.getElementById('reg-name').value.trim();
  if (name) localStorage.setItem(PENDING_NAME_KEY, name.slice(0, 20));
  cloudOAuth(provider);
}
async function loginRegisterSubmit() {
  const name = document.getElementById('reg-name').value.trim();
  if (name) localStorage.setItem(PENDING_NAME_KEY, name.slice(0, 20));
  await doCloudAuth('up',
    document.getElementById('reg-email').value,
    document.getElementById('reg-pw').value,
    loginRegStatus);
}
function loginRegStatus(msg, isErr) {
  const el = document.getElementById('login-reg-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = isErr ? 'var(--danger)' : 'var(--muted)';
  el.textContent = msg;
}

function loginShowSelect() {
  loadUsers();
  showLoginView('login-select');

  const grid = document.getElementById('profile-grid');
  grid.innerHTML = users.map(u => `
    <div class="profile-card" onclick="loginPickUser('${u.id}')">
      <div class="profile-card-emoji">${u.emoji}</div>
      <div class="profile-card-name">${esc(u.name)}</div>
    </div>`).join('') + `
    <div class="profile-card add" onclick="loginShowCreate()">
      <div class="profile-card-emoji">+</div>
      <div class="profile-card-name">Neues Profil</div>
    </div>`;
}

function loginShowCreate() {
  showLoginView('login-create');

  newProfile = { name: '', emoji: AVATARS[0] };
  document.getElementById('create-name').value = '';
  document.getElementById('create-next').disabled = true;
  document.getElementById('emoji-picker').innerHTML = AVATARS.map((em, i) =>
    `<div class="emoji-opt ${i===0?'selected':''}" onclick="pickEmoji(this,'${em}')">${em}</div>`
  ).join('');
}

function pickEmoji(el, em) {
  newProfile.emoji = em;
  document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}
function updateCreateNext() {
  const name = document.getElementById('create-name').value.trim();
  newProfile.name = name;
  document.getElementById('create-next').disabled = name.length < 1;
}

function createGoToPin() {
  pinMode = 'set';
  firstPin = '';
  showPinView(newProfile.emoji, newProfile.name, 'PIN festlegen (4 Ziffern)');
}

function loginPickUser(id) {
  pinTarget = users.find(u => u.id === id);
  if (!pinTarget) return;
  if (!pinTarget.pinHash) { enterApp(pinTarget); return; }  // Konto-Profil ohne PIN → direkt rein
  pinMode = 'enter';
  showPinView(pinTarget.emoji, pinTarget.name, 'PIN eingeben');
}

function showPinView(emoji, name, prompt) {
  showLoginView('login-pin');
  document.getElementById('pin-avatar').textContent = emoji;
  document.getElementById('pin-name').textContent   = name;
  document.getElementById('pin-prompt').textContent = prompt;
  pinBuffer = '';
  renderPinDots();
  renderPinPad();
}

function renderPinDots() {
  const dots = document.getElementById('pin-dots');
  dots.innerHTML = [0,1,2,3].map(i =>
    `<div class="pin-dot ${i < pinBuffer.length ? 'filled' : ''}"></div>`
  ).join('');
}
function renderPinPad() {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  document.getElementById('pin-pad').innerHTML = keys.map(k => {
    if (k === '')  return `<div class="pin-key empty"></div>`;
    if (k === '⌫') return `<div class="pin-key action" onclick="pinDelete()">⌫</div>`;
    return `<div class="pin-key" onclick="pinPress('${k}')">${k}</div>`;
  }).join('');
}
function pinPress(d) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += d;
  renderPinDots();
  if (pinBuffer.length === 4) setTimeout(pinComplete, 180);
}
function pinDelete() {
  pinBuffer = pinBuffer.slice(0, -1);
  renderPinDots();
}
function pinShakeReset() {
  const dots = document.getElementById('pin-dots');
  dots.classList.add('shake');
  setTimeout(() => { dots.classList.remove('shake'); pinBuffer = ''; renderPinDots(); }, 420);
}

function pinComplete() {
  if (pinMode === 'enter') {
    if (hashPin(pinBuffer) === pinTarget.pinHash) {
      enterApp(pinTarget);
    } else {
      document.getElementById('pin-prompt').textContent = 'Falscher PIN — erneut versuchen';
      pinShakeReset();
    }
  } else if (pinMode === 'set') {
    firstPin = pinBuffer;
    pinMode = 'confirm';
    document.getElementById('pin-prompt').textContent = 'PIN bestätigen';
    pinBuffer = '';
    renderPinDots();
  } else if (pinMode === 'confirm') {
    if (pinBuffer === firstPin) {
      finishCreateProfile(hashPin(firstPin));
    } else {
      document.getElementById('pin-prompt').textContent = 'PINs stimmen nicht — neu festlegen';
      pinMode = 'set'; firstPin = '';
      pinShakeReset();
    }
  }
}

function finishCreateProfile(pinHash) {
  const isFirst = users.length === 0;
  const user = { id: uid(), name: newProfile.name, emoji: newProfile.emoji, pinHash };
  users.push(user);
  saveUsers();

  // Erstes Profil: bestehende Single-User-Daten übernehmen
  if (isFirst) {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) localStorage.setItem(dataKey(user.id), legacy);
  }
  enterApp(user);
}
