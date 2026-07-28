// ===== sync.js =====
// Cloud Sync and Supabase Auth

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cloudToken     = null;
let cloudEmail     = null;
let cloudPushTimer = null;
let cloudLastSync  = null;
let cloudApplying  = false;
let cloudPendingRemote = null;
let cloudPostLoginDone = false;

async function api(path, { method = 'GET', body, auth = false, timeoutMs = 30000 } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const { data } = await sb.auth.getSession();
    const tok = data.session && data.session.access_token;
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function handleAuthExpired() {
  sb.auth.signOut();
  cloudToken = null; cloudEmail = null;
  setCloudStatus('⚠️ Sitzung abgelaufen — bitte neu einloggen.', true);
  renderCloudUI();
}

function initCloud() {
  sb.auth.onAuthStateChange((event, session) => {
    cloudToken = session ? session.access_token : null;
    cloudEmail = session ? (session.user.email || '') : null;
    renderCloudUI();
    if (event === 'SIGNED_OUT') { cloudPostLoginDone = false; return; }
    if (session && event === 'INITIAL_SESSION') cloudPull({ silent: true });
    if (session && event === 'SIGNED_IN')        handleSignedIn();
  });
}

async function handleSignedIn() {
  if (cloudPostLoginDone) return;
  cloudPostLoginDone = true;
  const loginScreen = document.getElementById('login-screen');
  const onLogin = !loginScreen.classList.contains('hidden');
  try { await cloudAfterLogin(onLogin ? loginCloudStatus : setCloudStatus); } catch (e) {}
  if (loginScreen.classList.contains('hidden')) return;
  if (!document.getElementById('modal-cloud-conflict').classList.contains('open')) resolvePostLogin();
}

function cloudSnapshot() {
  const profiles = {};
  users.forEach(u => {
    const raw = localStorage.getItem(dataKey(u.id));
    if (raw) { try { profiles[u.id] = JSON.parse(raw); } catch(e) {} }
  });
  return { v: 1, users, profiles, savedAt: new Date().toISOString() };
}

function applyCloudSnapshot(snap) {
  if (!snap) return;
  cloudApplying = true;
  try {
    if (Array.isArray(snap.users)) { users = snap.users; saveUsers(); }
    if (snap.profiles) {
      Object.keys(snap.profiles).forEach(id => {
        try {
          localStorage.setItem(dataKey(id), JSON.stringify(snap.profiles[id]));
        } catch(e) {
          console.error('Storage quota exceeded for profile', id, e);
        }
      });
    }
    setCloudMarker(snap.savedAt);
    if (currentUser) {
      if (users.some(u => u.id === currentUser.id)) { loadUserDB(currentUser.id); refreshAll(); }
      else { logout(); return; }
    } else {
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen && !loginScreen.classList.contains('hidden')) {
        resolvePostLogin();
      }
    }
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
    const snap = cloudSnapshot();
    const blob = new Blob([JSON.stringify({ data: snap })], { type: 'application/json' });
    navigator.sendBeacon(API_BASE + '/api/data', blob);
  }
});

function setCloudMarker(at) { if (at) localStorage.setItem('mt-cloud-synced-at', at); }

async function cloudPush() {
  if (!cloudToken) return;
  setCloudStatus('Synchronisiere…');
  const snap = cloudSnapshot();
  try {
    const res = await api('/api/data', { method: 'PUT', auth: true, body: { data: snap } });
    if (res.status === 401 || res.status === 403) { handleAuthExpired(); return; }
    if (!res.ok) { setCloudStatus('⚠️ Sync-Fehler (' + res.status + ')', true); return; }
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
    const res = await api('/api/data', { auth: true });
    if (res.status === 401 || res.status === 403) { handleAuthExpired(); return null; }
    if (!res.ok) { if (!opts.silent) setCloudStatus('⚠️ Fehler (' + res.status + ')', true); return null; }
    const json = await res.json();
    const remote = json && json.data ? json.data : null;
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

function localHasData() {
  return users.some(u => {
    const raw = localStorage.getItem(dataKey(u.id));
    if (!raw) return false;
    try { const d = JSON.parse(raw); return (d.foods && d.foods.length) || (d.log && Object.keys(d.log).length); }
    catch(e) { return false; }
  });
}

async function cloudAfterLogin(status) {
  status = status || setCloudStatus;
  renderCloudUI();
  let remote = null;
  status('1/4 Hole Daten vom Server…');
  const res = await api('/api/data', { auth: true, timeoutMs: 45000 });
  if (res.status === 401 || res.status === 403) { handleAuthExpired(); return; }
  if (res.ok) {
    status('2/4 Empfange Daten…');
    const txt = await res.text();
    status('3/4 Verarbeite Daten… (' + Math.round(txt.length/1024) + ' KB)');
    await new Promise(r => setTimeout(r, 40));
    try {
      const j = JSON.parse(txt);
      remote = j && j.data ? j.data : null;
    } catch (e) {
      status('⚠️ Daten beschädigt (Parse): ' + (e && e.message || e), true);
      return;
    }
  }
  const hasRemote = remote && (((remote.users||[]).length) || (remote.profiles && Object.keys(remote.profiles).length));
  if (!hasRemote) { status('Lade hoch…'); await cloudPush(); return; }
  if (!localHasData()) {
    status('4/4 Speichere lokal…');
    await new Promise(r => setTimeout(r, 40));
    try {
      applyCloudSnapshot(remote);
    } catch (e) {
      status('⚠️ Speichern fehlgeschlagen: ' + (e && e.message || e) + ' (privates Fenster / Speicher voll?)', true);
      return;
    }
    cloudLastSync = new Date(); renderCloudUI(); return;
  }
  cloudPendingRemote = remote;
  const rProfiles = remote.profiles ? Object.keys(remote.profiles).length : 0;
  const rDays = remote.profiles ? Object.values(remote.profiles).reduce((a,p)=>a+(p && p.log?Object.keys(p.log).length:0),0) : 0;
  const lDays = users.reduce((a,u)=>{ try{const d=JSON.parse(localStorage.getItem(dataKey(u.id))||'{}');return a+(d.log?Object.keys(d.log).length:0);}catch(e){return a;} },0);
  document.getElementById('cloud-conflict-info').innerHTML =
    `☁️ <b style="color:var(--text)">Cloud:</b> ${rProfiles} Profil(e), ${rDays} getrackte Tage<br>` +
    `📱 <b style="color:var(--text)">Dieses Gerät:</b> ${users.length} Profil(e), ${lDays} getrackte Tage`;
  openModal('modal-cloud-conflict');
}

async function resolveCloudConflict(choice) {
  closeModal('modal-cloud-conflict');
  if (choice === 'download' && cloudPendingRemote) {
    applyCloudSnapshot(cloudPendingRemote); cloudLastSync = new Date();
  } else if (choice === 'upload') {
    await cloudPush();
  }
  cloudPendingRemote = null;
  renderCloudUI();
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen && !loginScreen.classList.contains('hidden')) resolvePostLogin();
}

async function doCloudAuth(mode, email, pw, status) {
  email = (email || '').trim();
  if (!email || !/.+@.+\..+/.test(email)) { status('⚠️ Bitte eine gültige E-Mail eingeben.', true); return false; }
  if (!pw || pw.length < 6) { status('⚠️ Passwort muss mind. 6 Zeichen haben.', true); return false; }
  status(mode === 'up' ? 'Registriere…' : 'Melde an…');
  try {
    if (mode === 'up') {
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: REDIRECT_URL } });
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
      <input type="password" id="cloud-pw" placeholder="Passwort (mind. 6 Zeichen)" autocomplete="current-password"
             style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);padding:11px 14px;font-size:14px;outline:none;width:100%">
      <div style="display:flex;gap:10px">
        <button class="btn-primary" onclick="cloudSignIn()" style="flex:1">Einloggen</button>
        <button class="btn-outline" onclick="cloudSignUp()" style="flex:1">Registrieren</button>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" onclick="cloudOAuth('google')" style="flex:1;font-size:13px">Google</button>
        <button class="btn-outline" onclick="cloudOAuth('github')" style="flex:1;font-size:13px">GitHub</button>
      </div>
      <button class="btn-outline" onclick="cloudResend()" style="font-size:12.5px;border:none;color:var(--muted);padding:4px">✉️ Bestätigungsmail erneut senden</button>
      <div id="cloud-status" style="display:none;font-size:12.5px;text-align:center;padding:4px"></div>`;
  }
}
