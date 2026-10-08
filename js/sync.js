// ===== sync.js =====
// Cloud Sync and Supabase Auth

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const CLOUD_DATA_TABLE = 'mt_cloud_data';
const CLOUD_PROFILE_TABLE = 'mt_profiles';

let cloudToken     = null;
let cloudEmail     = null;
let cloudPushTimer = null;
let cloudLastSync  = null;
let cloudApplying  = false;
let cloudPostLoginDone = false;
let cloudSessionReady = null;
let passwordRecoveryPending = false;

function handleAuthExpired() {
  sb.auth.signOut();
  cloudToken = null; cloudEmail = null;
  setCloudStatus('⚠️ Sitzung abgelaufen — bitte neu einloggen.', true);
  renderCloudUI();
}

function initCloud() {
  if (cloudSessionReady) return cloudSessionReady;
  cloudSessionReady = new Promise(resolve => {
    let resolved = false;
    const finish = () => {
      if (!resolved) { resolved = true; resolve(); }
    };

    sb.auth.onAuthStateChange((event, session) => {
      cloudToken = session ? session.access_token : null;
      cloudEmail = session ? (session.user.email || '') : null;
      renderCloudUI();
      if (event === 'INITIAL_SESSION') { finish(); return; }
      if (event === 'SIGNED_OUT') { cloudPostLoginDone = false; return; }
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryPending = true;
        finish();
        if (typeof showPasswordRecovery === 'function') showPasswordRecovery();
        return;
      }
      if (session && event === 'SIGNED_IN') handleSignedIn();
    });
    // Fallback bei blockiertem Browser-Speicher oder einer gestörten Auth-Antwort.
    setTimeout(finish, 2500);
  });
  return cloudSessionReady;
}

async function handleSignedIn() {
  if (cloudPostLoginDone) return;
  cloudPostLoginDone = true;
  const loginScreen = document.getElementById('login-screen');
  const onLogin = !loginScreen.classList.contains('hidden');
  try {
    await resolvePostLogin();
    await cloudAfterLogin(onLogin ? loginCloudStatus : setCloudStatus);
  } catch (e) {}
  if (loginScreen.classList.contains('hidden')) return;
  resolvePostLogin();
}

function cloudSnapshot() {
  return { v: 2, data: db, savedAt: new Date().toISOString() };
}

function applyCloudSnapshot(snap) {
  if (!snap || !currentUser) return;
  cloudApplying = true;
  try {
    let data = snap.data;
    if (!data && snap.v === 1 && snap.profiles) {
      localStorage.setItem('mt-legacy-cloud-backup-' + currentUser.id, JSON.stringify(snap));
      const oldSessionId = sessionStorage.getItem('mt-current');
      data = snap.profiles[oldSessionId] || Object.values(snap.profiles)[0];
      setCloudStatus('Alte Profildaten wurden in dein Konto übernommen.');
    }
    if (data) {
      localStorage.setItem(dataKey(currentUser.id), JSON.stringify(data));
      loadUserDB(currentUser.id);
      refreshAll();
    }
    setCloudMarker(snap.savedAt);
  } finally {
    cloudApplying = false;
  }
}

function cloudSyncSoon() {
  if (!cloudToken || cloudApplying) return;
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(cloudPush, 1500);
}

window.addEventListener('beforeunload', () => {
  if (cloudPushTimer && cloudToken) {
    clearTimeout(cloudPushTimer);
    cloudPushTimer = null;
    // Der normale Sync läuft nach jeder Änderung; dies startet ihn beim
    // Schließen zusätzlich sofort. Supabase fügt die Sitzung automatisch hinzu.
    cloudPush();
  }
});

// Beim Wechsel zurück in einen Browser-Tab den kanonischen Cloud-Stand laden.
// Der Browser-LocalStorage ist nur ein Offline-Cache, nicht eine zweite Datenquelle.
function refreshFromCloudWhenActive() {
  if (cloudToken && !cloudApplying) cloudPull({ silent: true });
}
window.addEventListener('focus', refreshFromCloudWhenActive);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshFromCloudWhenActive();
});

function setCloudMarker(at) { if (at) localStorage.setItem('mt-cloud-synced-at', at); }

async function cloudPush() {
  if (!cloudToken) return;
  setCloudStatus('Synchronisiere…');
  const snap = cloudSnapshot();
  try {
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session && sessionData.session.user && sessionData.session.user.id;
    if (!userId) { handleAuthExpired(); return; }
    const { error } = await sb.from(CLOUD_DATA_TABLE).upsert({
      user_id: userId,
      data: snap,
      updated_at: snap.savedAt,
    }, { onConflict: 'user_id' });
    if (error) { setCloudStatus('⚠️ Sync-Fehler: ' + error.message, true); return; }
    setCloudMarker(snap.savedAt);
    cloudLastSync = new Date();
    renderCloudUI();
  } catch (e) {
    setCloudStatus('⚠️ Keine Verbindung zum Server.', true);
  }
}

async function cloudPull(opts = {}) {
  if (!cloudToken) return null;
  try {
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session && sessionData.session.user && sessionData.session.user.id;
    if (!userId) { handleAuthExpired(); return null; }
    const { data: row, error } = await sb.from(CLOUD_DATA_TABLE)
      .select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) { if (!opts.silent) setCloudStatus('⚠️ Cloud-Fehler: ' + error.message, true); return null; }
    const remote = row && row.data ? row.data : null;
    if (!remote) { await cloudPush(); return null; }
    const remoteAt = remote.savedAt;
    if (opts.silent && remoteAt && remoteAt === localStorage.getItem('mt-cloud-synced-at')) return remote;
    applyCloudSnapshot(remote);
    cloudLastSync = new Date();
    renderCloudUI();
    return remote;
  } catch (e) {
    if (!opts.silent) setCloudStatus('⚠️ Keine Verbindung zum Server.', true);
    return null;
  }
}

async function cloudAfterLogin(status) {
  status = status || setCloudStatus;
  renderCloudUI();
  status('Hole Cloud-Daten…');
  const remote = await cloudPull();
  if (remote) status('✅ Cloud-Daten übernommen.');
}

async function doCloudAuth(mode, email, pw, status, displayName) {
  email = (email || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) { status('⚠️ Bitte eine gültige E-Mail eingeben.', true); return false; }
  if (!pw || pw.length < 10) { status('⚠️ Passwort muss mindestens 10 Zeichen haben.', true); return false; }
  status(mode === 'up' ? 'Registriere…' : 'Melde an…');
  try {
    if (mode === 'up') {
      const { data, error } = await sb.auth.signUp({ email, password: pw,
        options: { emailRedirectTo: REDIRECT_URL, data: { display_name: displayName || undefined } } });
      if (error) { status('⚠️ ' + authErrorText(error), true); return false; }
      if (!data.session) {
        status('✅ Fast geschafft! Wir haben dir eine Bestätigungsmail an ' + email + ' geschickt. Bestätige den Link und logge dich dann ein.');
        return false;
      }
      return true;
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) { status('⚠️ ' + authErrorText(error), true); return false; }
      return true;
    }
  } catch (e) {
    status('⚠️ Keine Verbindung zum Server.', true);
    return false;
  }
}

function authErrorText(error) {
  const m = (error && error.message) || '';
  if (/confirm/i.test(m))                                return 'E-Mail noch nicht bestätigt. Bitte den Link in deiner Mail anklicken (auch Spam-Ordner).';
  if (/invalid login|invalid credentials/i.test(m))      return 'E-Mail oder Passwort falsch.';
  if (/already|registered|exists/i.test(m))              return 'E-Mail ist bereits registriert.';
  if (/rate limit|too many/i.test(m))                    return 'Zu viele Versuche — bitte kurz warten.';
  return m || 'Anmeldung fehlgeschlagen.';
}

function cloudSignUp() {
  return doCloudAuth('up', document.getElementById('cloud-email').value, document.getElementById('cloud-pw').value, setCloudStatus);
}
function cloudSignIn() {
  return doCloudAuth('in', document.getElementById('cloud-email').value, document.getElementById('cloud-pw').value, setCloudStatus);
}

async function loginCloudSignIn() {
  await doCloudAuth('in', document.getElementById('login-cloud-email').value, document.getElementById('login-cloud-pw').value, loginCloudStatus);
}
function loginCloudStatus(msg, isErr) {
  const el = document.getElementById('login-cloud-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = isErr ? 'var(--danger)' : 'var(--muted)';
  el.textContent = msg;
}

async function cloudOAuth(provider) {
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: REDIRECT_URL } });
  if (error) alert('Anmeldung mit ' + provider + ' fehlgeschlagen: ' + error.message);
}

async function cloudResetPassword(email, status) {
  email = (email || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) { status('⚠️ Bitte gib zuerst deine E-Mail-Adresse ein.', true); return; }
  status('Sende Link zum Zurücksetzen…');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT_URL });
  if (error) { status('⚠️ ' + authErrorText(error), true); return; }
  status('✅ Falls ein Konto existiert, wurde ein Link an deine E-Mail gesendet.');
}
function loginCloudResetPassword() {
  cloudResetPassword(document.getElementById('login-cloud-email').value, loginCloudStatus);
}

async function cloudResendWith(email, status) {
  email = (email || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) { status('⚠️ Bitte zuerst deine E-Mail eingeben.', true); return; }
  status('Sende Bestätigungsmail…');
  try {
    await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: REDIRECT_URL } });
    status('✅ Falls ein Konto existiert (und noch nicht bestätigt ist), ist eine neue Bestätigungsmail unterwegs. Postfach & Spam prüfen.');
  } catch (e) {
    status('⚠️ Konnte nicht senden. Bitte später erneut versuchen.', true);
  }
}
function cloudResend()      { cloudResendWith(document.getElementById('cloud-email').value, setCloudStatus); }
function loginCloudResend() { cloudResendWith(document.getElementById('login-cloud-email').value, loginCloudStatus); }

async function cloudSignOut() {
  await sb.auth.signOut();
  cloudToken = null; cloudEmail = null; cloudLastSync = null;
  showLogin();
  renderCloudUI();
}

function setCloudStatus(msg, isErr) {
  const el = document.getElementById('cloud-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = isErr ? 'var(--danger)' : 'var(--muted)';
  el.textContent = msg;
}

function renderCloudUI() {
  const box = document.getElementById('cloud-box');
  if (!box) return;
  if (cloudToken) {
    const last = cloudLastSync ? cloudLastSync.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '–';
    box.innerHTML = `
      <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35);border-radius:var(--r-sm);padding:12px 14px;font-size:13px">
        <div style="font-weight:700;color:var(--text)">✅ Synchronisiert</div>
        <div style="color:var(--muted);margin-top:3px">${esc(cloudEmail||'')}</div>
        <div style="color:var(--muted);margin-top:2px;font-size:12px">Zuletzt: ${last}</div>
      </div>
      <button class="btn-outline" onclick="cloudPush()" style="font-size:13px">🔄 Jetzt synchronisieren</button>
      <button class="btn-outline" onclick="cloudSignOut()" style="font-size:13px">Abmelden</button>
      <div id="cloud-status" style="display:none;font-size:12.5px;text-align:center;padding:4px"></div>`;
  } else {
    box.innerHTML = `
      <div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:4px">
        Melde dich an, damit deine Daten sicher in der Cloud liegen und auf allen Geräten synchron sind.
      </div>
      <input type="email" id="cloud-email" placeholder="E-Mail" autocomplete="email"
             style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);padding:11px 14px;font-size:14px;outline:none;width:100%">
      <input type="password" id="cloud-pw" placeholder="Passwort (mind. 10 Zeichen)" autocomplete="current-password"
             style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);padding:11px 14px;font-size:14px;outline:none;width:100%">
      <div style="display:flex;gap:10px">
        <button class="btn-primary" onclick="cloudSignIn()" style="flex:1">Einloggen</button>
        <button class="btn-outline" onclick="cloudSignUp()" style="flex:1">Registrieren</button>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" onclick="cloudOAuth('google')" style="flex:1;font-size:13px">Google</button>
      </div>
      <button class="btn-outline" onclick="cloudResend()" style="font-size:12.5px;border:none;color:var(--muted);padding:4px">✉️ Bestätigungsmail erneut senden</button>
      <div id="cloud-status" style="display:none;font-size:12.5px;text-align:center;padding:4px"></div>`;
  }
}
