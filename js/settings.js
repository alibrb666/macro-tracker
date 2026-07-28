// ===== settings.js =====
// Pro Settings, Theme Engine, and Strategy Selector

function getTheme() {
  if (db && db.theme && THEMES[db.theme]) return db.theme;
  return 'violet';
}

function setTheme(themeKey) {
  if (!THEMES[themeKey]) themeKey = 'violet';
  if (!db) db = EMPTY_DB();
  db.theme = themeKey;
  save();
  applyTheme(themeKey);
  renderSettingsModal();
  showToast(`🎨 Theme auf ${THEMES[themeKey].name} geändert!`, 'success');
}

function applyTheme(themeKey) {
  themeKey = themeKey || getTheme();
  const theme = THEMES[themeKey] || THEMES['violet'];
  const root = document.documentElement;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent2', theme.accent2);
  root.style.setProperty('--accent3', theme.accent3);
  root.style.setProperty('--accent-glow', theme.glow);
}

function getMacroStrategy() {
  if (db && db.macroStrategy && MACRO_STRATEGIES[db.macroStrategy]) return db.macroStrategy;
  return 'balanced';
}

function setMacroStrategy(stratKey) {
  if (!MACRO_STRATEGIES[stratKey]) stratKey = 'balanced';
  db.macroStrategy = stratKey;

  const strat = MACRO_STRATEGIES[stratKey];
  const targetKcal = (db.goals && db.goals.kcal) ? db.goals.kcal : 2000;

  // Calculate grams from Pct & Kcal: Protein 4kcal/g, Carbs 4kcal/g, Fat 9kcal/g
  const proteinG = Math.round((targetKcal * (strat.proteinPct / 100)) / 4);
  const carbsG   = Math.round((targetKcal * (strat.carbsPct / 100)) / 4);
  const fatG     = Math.round((targetKcal * (strat.fatPct / 100)) / 9);

  db.goals = {
    kcal: targetKcal,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG
  };

  save();
  loadGoalsForm();
  refreshAll();
  renderSettingsModal();
  showToast(`🎯 Strategie "${strat.name}" angewendet (${proteinG}g P / ${carbsG}g C / ${fatG}g F)!`, 'success');
}

function openSettingsModal() {
  renderSettingsModal();
  openModal('modal-settings');
}

function renderSettingsModal() {
  const modal = document.getElementById('settings-content');
  if (!modal) return;

  const activeTheme = getTheme();
  const activeStrat = getMacroStrategy();

  modal.innerHTML = `
    <!-- 1. THEMES & FARBEN -->
    <div style="font-weight:800;font-size:14px;color:var(--text);margin-bottom:8px">🎨 Akzentfarbe / Theme</div>
    <div class="theme-grid">
      ${Object.keys(THEMES).map(k => {
        const t = THEMES[k];
        return `
          <button class="theme-option ${k === activeTheme ? 'selected' : ''}" onclick="setTheme('${k}')">
            <span class="theme-dot" style="background:${t.accent}"></span>
            <span style="font-size:13px;font-weight:600">${t.name}</span>
          </button>`;
      }).join('')}
    </div>

    <div class="divider" style="margin:16px 0"></div>

    <!-- 2. MAKRONÄHRSTOFF-STRATEGIEN -->
    <div style="font-weight:800;font-size:14px;color:var(--text);margin-bottom:8px">🎯 Makro-Verteilung Presets</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${Object.keys(MACRO_STRATEGIES).map(k => {
        const s = MACRO_STRATEGIES[k];
        return `
          <button class="choice-btn ${k === activeStrat ? 'selected' : ''}" onclick="setMacroStrategy('${k}')" style="padding:12px 14px">
            <div style="font-weight:700;font-size:14px">${s.name}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">Protein: ${s.proteinPct}% · Carbs: ${s.carbsPct}% · Fett: ${s.fatPct}%</div>
          </button>`;
      }).join('')}
    </div>

    <div class="divider" style="margin:16px 0"></div>

    <!-- 3. PROFIL & PIN VERWALTEN -->
    <div style="font-weight:800;font-size:14px;color:var(--text);margin-bottom:8px">🔒 Profil-Sicherheit (PIN)</div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">
      ${currentUser && currentUser.pinHash ? 'Dein Profil ist aktuell mit einem 4-stelligen PIN geschützt.' : 'Kein PIN gesetzt. Du kannst einen 4-stelligen PIN festlegen.'}
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn-outline" onclick="closeModal('modal-settings');createGoToPin()" style="flex:1">🔑 PIN ändern / festlegen</button>
      ${currentUser && currentUser.pinHash ? `<button class="btn-outline danger" onclick="removeProfilePin()" style="flex:1">🗑️ PIN entfernen</button>` : ''}
    </div>
  `;
}

function removeProfilePin() {
  if (!currentUser) return;
  delete currentUser.pinHash;
  saveUsers();
  renderSettingsModal();
  showToast('🔓 PIN erfolgreich entfernt', 'success');
}
