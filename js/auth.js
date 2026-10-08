// ===== auth.js =====
// One Supabase account owns one Macro Tracker data set. Local mode is a
// deliberately separate, single-device guest mode.

let currentUser = null;
const GUEST_USER = { id: 'local-guest', name: 'Gast', emoji: '🥗', isGuest: true };

async function init() {
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); })
  );
  document.getElementById('lib-search').addEventListener('input', e => renderLibrary(e.target.value));
  await initCloud();
  if (passwordRecoveryPending) { showPasswordRecovery(); return; }
  if (cloudToken) {
    await resolvePostLogin();
    await cloudAfterLogin(loginCloudStatus);
  } else showLogin();
}

function showLogin() {
  currentUser = null;
  document.getElementById('login-screen').classList.remove('hidden');
  loginShowHome();
}

function showLoginView(id) {
  ['login-home', 'login-cloud', 'login-register', 'login-reset'].forEach(viewId => {
    const element = document.getElementById(viewId);
    if (element) element.style.display = viewId === id ? 'block' : 'none';
  });
}

function loginShowHome() { showLoginView('login-home'); }
function loginContinueOffline() { enterApp(GUEST_USER); }

function loginShowCloud() {
  showLoginView('login-cloud');
  const status = document.getElementById('login-cloud-status');
  if (status) status.style.display = 'none';
}

function loginShowRegister() {
  showLoginView('login-register');
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-email-form').style.display = 'none';
  ['reg-email', 'reg-pw'].forEach(id => { document.getElementById(id).value = ''; });
  const status = document.getElementById('login-reg-status');
  if (status) status.style.display = 'none';
  updateRegMethods();
}

function updateRegMethods() {
  const enabled = document.getElementById('reg-name').value.trim().length > 0;
  ['reg-m-email', 'reg-m-google'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = !enabled;
  });
}

function regChooseEmail() {
  document.getElementById('reg-email-form').style.display = 'block';
  document.getElementById('reg-email').focus();
}

function regOAuth(provider) {
  const name = document.getElementById('reg-name').value.trim();
  if (name) localStorage.setItem(PENDING_NAME_KEY, name.slice(0, 60));
  cloudOAuth(provider);
}

async function loginRegisterSubmit() {
  const name = document.getElementById('reg-name').value.trim();
  if (!name) { loginRegStatus('⚠️ Bitte gib deinen Namen ein.', true); return; }
  localStorage.setItem(PENDING_NAME_KEY, name.slice(0, 60));
  await doCloudAuth('up', document.getElementById('reg-email').value,
    document.getElementById('reg-pw').value, loginRegStatus, name);
}

function loginRegStatus(message, isError) {
  const element = document.getElementById('login-reg-status');
  if (!element) return;
  element.style.display = 'block';
  element.style.color = isError ? 'var(--danger)' : 'var(--muted)';
  element.textContent = message;
}

function showPasswordRecovery() {
  showLoginView('login-reset');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('reset-pw').value = '';
  document.getElementById('reset-pw-confirm').value = '';
  const status = document.getElementById('login-reset-status');
  if (status) status.style.display = 'none';
}

async function completePasswordReset() {
  const password = document.getElementById('reset-pw').value;
  const confirmation = document.getElementById('reset-pw-confirm').value;
  const status = document.getElementById('login-reset-status');
  const report = (message, isError) => {
    status.style.display = 'block'; status.style.color = isError ? 'var(--danger)' : 'var(--muted)'; status.textContent = message;
  };
  if (password.length < 10) { report('⚠️ Das Passwort muss mindestens 10 Zeichen haben.', true); return; }
  if (password !== confirmation) { report('⚠️ Die Passwörter stimmen nicht überein.', true); return; }
  const { error } = await sb.auth.updateUser({ password });
  if (error) { report('⚠️ ' + authErrorText(error), true); return; }
  passwordRecoveryPending = false;
  report('✅ Passwort gespeichert. Du wirst angemeldet…');
  await resolvePostLogin();
  await cloudAfterLogin(loginCloudStatus);
}

async function resolvePostLogin() {
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) { showLogin(); return; }
  const user = data.user;
  const pendingName = localStorage.getItem(PENDING_NAME_KEY);
  const fallbackName = pendingName || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Mein Profil';
  const profile = await ensureCloudProfile(user, fallbackName);
  localStorage.removeItem(PENDING_NAME_KEY);
  migrateLocalDataToAccount(user.id);
  enterApp({ id: user.id, name: profile?.display_name || fallbackName,
    emoji: profile?.avatar || '🥗', email: user.email || '' });
}

// The old app stored its active profile only in this browser. Copy it once to
// the new account key so the first cloud sync can safely upload it if needed.
function migrateLocalDataToAccount(accountId) {
  if (localStorage.getItem(dataKey(accountId))) return;
  const candidates = [sessionStorage.getItem('mt-current'), GUEST_USER.id];
  try {
    const legacyUsers = JSON.parse(localStorage.getItem('mt-users')) || [];
    legacyUsers.forEach(user => candidates.push(user.id));
  } catch (error) {}
  for (const id of candidates) {
    if (!id) continue;
    const data = localStorage.getItem(dataKey(id));
    if (data) { localStorage.setItem(dataKey(accountId), data); return; }
  }
  const legacyData = localStorage.getItem(LEGACY_KEY);
  if (legacyData) localStorage.setItem(dataKey(accountId), legacyData);
}

async function ensureCloudProfile(user, fallbackName) {
  try {
    const { data: existing, error: selectError } = await sb.from(CLOUD_PROFILE_TABLE)
      .select('display_name, avatar').eq('id', user.id).maybeSingle();
    if (selectError) throw selectError;
    if (existing) return existing;
    const { data, error } = await sb.from(CLOUD_PROFILE_TABLE).upsert({
      id: user.id, display_name: fallbackName.slice(0, 60), avatar: '🥗', updated_at: new Date().toISOString()
    }).select('display_name, avatar').single();
    if (error) throw error;
    return data;
  } catch (error) {
    // The account remains usable if the SQL migration has not been run yet.
    console.warn('Cloud profile could not be loaded:', error.message);
    return null;
  }
}

function enterApp(user) {
  currentUser = user;
  loadUserDB(user.id);
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('profile-chip-emoji').textContent = user.emoji;
  document.getElementById('profile-chip-name').textContent = user.name;
  renderToday(); renderLibrary(); renderBedarf(); loadGoalsForm();
}

async function logout() {
  if (cloudToken) await cloudSignOut();
  else showLogin();
}
