// ===== today.js =====
// Today view rendering, navigation, history, and suggestions

function renderDayNav() {
  const d = viewDate || new Date();
  const isToday = !viewDate;
  const dateStr = d.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' });

  // Keep the page header in sync with the viewed day
  const titleEl = document.getElementById('today-date');
  if (titleEl) titleEl.textContent = isToday ? 'Heute · ' + dateStr : dateStr;

  const navEl = document.getElementById('day-nav');
  if (navEl) {
    navEl.innerHTML = `
      <button class="day-nav-arrow" onclick="shiftDay(-1)" title="Vorheriger Tag">‹</button>
      <button class="day-nav-current ${isToday ? '' : 'past'}" onclick="openHistory()" title="Alle Tage ansehen">
        <span class="day-nav-date">${isToday ? '⭐ Heute' : dateStr}</span>
        <span class="day-nav-hint">📅 Alle Tage ansehen</span>
      </button>
      <button class="day-nav-arrow" onclick="shiftDay(1)" title="Nächster Tag" ${isToday ? 'disabled' : ''}>›</button>
      ${isToday ? '' : `<button class="day-nav-today" onclick="goToday()" title="Zurück zu heute">Heute</button>`}`;
  }
}

function renderToday() {
  renderDayNav();
  const allEntries = db.log[viewKey()] || [];
  allEntries.forEach(e => { if (!e.meal) e.meal = 'hauptspeise'; });

  const tot = allEntries.reduce(
    (a, e) => ({
      kcal: a.kcal + (e.kcal || 0),
      protein: a.protein + (e.protein || 0),
      carbs: a.carbs + (e.carbs || 0),
      fat: a.fat + (e.fat || 0),
      fiber: a.fiber + (e.fiber || 0),
      sugar: a.sugar + (e.sugar || 0),
    }),
    { kcal:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0 }
  );
  const g = goalsForDate(viewKey());

  // ── Vitality Score & Macro Ratio Calculations ───────────
  const eaten     = Math.round(tot.kcal);
  const remaining = g.kcal - eaten;
  const pctKcal   = Math.min(100, Math.round(eaten / (g.kcal || 1) * 100));
  const pctProtein= Math.min(100, Math.round((tot.protein || 0) / (g.protein || 1) * 100));
  const waterMl   = (db.water && db.water[viewKey()]) || 0;
  const waterGoal = (db.settings && db.settings.waterGoal) || 2500;
  const pctWater  = Math.min(100, Math.round(waterMl / waterGoal * 100));

  // Vitality Score (0-100)
  const scoreKcal = Math.max(0, 35 - Math.abs(100 - pctKcal) * 0.35);
  const scoreProt = Math.min(35, (tot.protein / (g.protein || 1)) * 35);
  const scoreWat  = (pctWater / 100) * 20;
  const scoreFast = db.fastingStart ? 10 : 5;
  const vitalityScore = Math.min(100, Math.round(scoreKcal + scoreProt + scoreWat + scoreFast));

  // Macro Ratio (% split of P / C / F)
  const totalGrams = (tot.protein || 0) + (tot.carbs || 0) + (tot.fat || 0);
  const rP = totalGrams > 0 ? Math.round((tot.protein / totalGrams) * 100) : 33;
  const rC = totalGrams > 0 ? Math.round((tot.carbs / totalGrams) * 100) : 34;
  const rF = totalGrams > 0 ? Math.max(0, 100 - rP - rC) : 33;

  const R = 42, CX = 52, CY = 52;
  const C = 2 * Math.PI * R;
  const dash = C - pctKcal / 100 * C;
  const isOver  = remaining < 0;
  const isWarn  = pctKcal > 85;
  const ringA   = isOver ? '#ff2a6d' : isWarn ? '#ffaa00' : 'var(--accent)';
  const ringB   = isOver ? '#ff5500' : isWarn ? '#ffee00' : 'var(--protein)';

  const miniCard = (label, val, goal, colorClass) => {
    const p = Math.min(100, goal > 0 ? Math.round(val / goal * 100) : 0);
    return `
      <div class="bento-tile bento-tile-macro bento-macro-card">
        <div class="bento-macro-header">
          <span class="bento-macro-label">${label}</span>
          <span class="bento-macro-pct">${p}%</span>
        </div>
        <div class="bento-macro-val">${val}<span> / ${goal}g</span></div>
        <div class="progress-bar ${colorClass}"><div class="progress-fill" style="width:${p}%"></div></div>
      </div>
    `;
  };

  const heroEl = document.getElementById('today-hero');
  if (heroEl) {
    heroEl.innerHTML = `
      <div class="bento-dashboard">
        <!-- Banner Tile: Vitality Score & Quick Action Dock -->
        <div class="bento-tile bento-tile-banner">
          <div class="vitality-card" style="margin-bottom: 12px;">
            <div class="vitality-left">
              <div class="vitality-badge">⚡</div>
              <div>
                <div class="vitality-info-title">Tages-Vitalität</div>
                <div class="vitality-info-sub">${vitalityScore >= 80 ? '🌟 Exzellent – Auf Kurs!' : vitalityScore >= 50 ? '👍 Gute Balance!' : '🎯 Weitermachen!'}</div>
              </div>
            </div>
            <div class="vitality-score-num">${vitalityScore}<span style="font-size:14px;opacity:0.7">%</span></div>
          </div>
          
          <!-- Quick Log Action Dock -->
          <div class="quick-dock">
            <button class="quick-dock-btn" onclick="addWaterQuick(250)" title="+250ml Wasser">💧 +250 ml</button>
            <button class="quick-dock-btn" onclick="openLogModal('hauptspeise')" title="Mahlzeit loggen">🍽️ Loggen</button>
            <button class="quick-dock-btn" onclick="openWeightModal()" title="Gewicht eintragen">⚖️ Gewicht</button>
            <button class="quick-dock-btn" onclick="openFoodModal()" title="Foto-OCR Scan">📸 Foto-OCR</button>
          </div>
        </div>

        <!-- Tile 1: Main Glowing Kcal Ring -->
        <div class="bento-tile bento-tile-hero">
          <div class="hero-ring" style="margin-bottom:10px;">
            <svg width="120" height="120" viewBox="0 0 104 104">
              <defs>
                <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${ringA}"/>
                  <stop offset="100%" stop-color="${ringB}"/>
                </linearGradient>
              </defs>
              <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="11"/>
              <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#rg)" stroke-width="11"
                stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${dash.toFixed(1)}"
                stroke-linecap="round" transform="rotate(-90 ${CX} ${CY})"
                style="transition:stroke-dashoffset .8s cubic-bezier(0.16,1,0.3,1);filter:drop-shadow(0 0 10px ${ringA}77)"/>
              <text x="${CX}" y="${CY-8}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="inherit" font-weight="800" letter-spacing="1">GEGESSEN</text>
              <text x="${CX}" y="${CY+16}" text-anchor="middle" font-size="24" font-weight="900" fill="#ffffff" font-family="inherit">${eaten}</text>
            </svg>
          </div>
          <div style="text-align:center;">
            <div class="hero-remaining-label">VERBLEIBEND</div>
            <div class="hero-remaining-val ${isOver ? 'over' : ''}" style="font-size:24px;margin-bottom:4px;font-weight:900;">
              ${Math.abs(remaining)} <span style="font-size:13px;font-weight:600;color:var(--muted)">kcal</span>
            </div>
            <!-- Macro Ratio Indicator -->
            <div style="font-size:10.5px;color:var(--muted);font-weight:800;letter-spacing:0.4px;">
              P <b style="color:var(--protein)">${rP}%</b> · C <b style="color:var(--carbs)">${rC}%</b> · F <b style="color:var(--fat)">${rF}%</b>
            </div>
            <div class="macro-ratio-bar">
              <div class="macro-ratio-seg" style="width:${rP}%;background:var(--protein);"></div>
              <div class="macro-ratio-seg" style="width:${rC}%;background:var(--carbs);"></div>
              <div class="macro-ratio-seg" style="width:${rF}%;background:var(--fat);"></div>
            </div>
          </div>
        </div>
        
        <!-- Tiles 2, 3, 4: Macro Bento Cards -->
        ${miniCard('Protein', Math.round((tot.protein||0)*10)/10, g.protein, 'protein')}
        ${miniCard('Carbs',   Math.round((tot.carbs||0)*10)/10,   g.carbs,   'carbs')}
        ${miniCard('Fett',    Math.round((tot.fat||0)*10)/10,     g.fat,     'fat')}
        
        <!-- Tiles 5, 6: Pro Widgets (Water & Fasting) -->
        <div id="water-card" class="bento-tile bento-tile-widget" style="padding:0;background:none;border:none;box-shadow:none;"></div>
        <div id="fasting-widget" class="bento-tile bento-tile-widget" style="padding:0;background:none;border:none;box-shadow:none;"></div>
        
        <!-- Tile 7: Glassmorphic Meal Carousel -->
        <div class="bento-tile bento-tile-full" id="meals-container"></div>
      </div>
    `;
  }

  // Render Pro Widgets inside their new bento slots
  if (typeof renderWaterCard === 'function') renderWaterCard();
  if (typeof renderFastingWidget === 'function') renderFastingWidget();

  // ── Meal Carousel Rendering ──────────────────────────
  renderSuggestions(allEntries, tot, g);

  const containerEl = document.getElementById('meals-container');
  if (containerEl) {
    const mealHtml = MEALS.map(meal => {
      const mEntries = allEntries.filter(e => e.meal === meal.id);
      const mTot = mEntries.reduce(
        (a, e) => ({ kcal:a.kcal+e.kcal, protein:a.protein+e.protein, carbs:a.carbs+e.carbs, fat:a.fat+e.fat }),
        { kcal:0, protein:0, carbs:0, fat:0 }
      );

      const itemsHtml = mEntries.length === 0
        ? `<div class="meal-empty">Noch leer — tippe auf das <b>+</b></div>`
        : mEntries.map(e => {
            const idx  = allEntries.indexOf(e);
            const food = db.foods.find(f => f.id === e.foodId);
            const name = food ? food.name : 'Unbekannt';
            const thumb = food && food.photo
              ? `<div class="meal-log-thumb"><img src="${food.photo}" loading="lazy" decoding="async"></div>`
              : `<div class="meal-log-thumb">🍴</div>`;
            return `
              <div class="meal-log-item"
                   draggable="true"
                   data-idx="${idx}"
                   ondragstart="dragStart(event,'${e._id || idx}')"
                   ondragend="dragEnd(event)">
                <span class="drag-handle" title="Verschieben">⠿</span>
                ${thumb}
                <div class="meal-log-info" onclick="openEditEntry(${idx})" style="cursor:pointer;flex:1;min-width:0">
                  <div class="meal-log-name">${esc(name)}</div>
                  <div class="meal-log-sub">
                    <span style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:1px 5px">${e.units ? `${unitCountLabel(e.units, e.unitLabel, e.unitPlural)} · ${e.amount} g` : `${e.amount} g`}</span>
                    <b style="color:var(--kcal)">${e.kcal} kcal</b>
                  </div>
                </div>
                <button class="btn-del" onclick="deleteEntry(${idx})" title="Löschen">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              </div>`;
          }).join('');

      return `
        <div class="meal-section" data-meal="${meal.id}"
             ondragover="dragOver(event,'${meal.id}')"
             ondragleave="dragLeave(event)"
             ondrop="dragDrop(event,'${meal.id}')">
          <div class="meal-header">
            <div class="meal-header-left">
              <div class="meal-icon">${meal.emoji}</div>
              <div>
                <div class="meal-name">${meal.label}</div>
                ${mEntries.length > 0 ? `<div class="meal-total-kcal">${Math.round(mTot.kcal)} kcal</div>` : ''}
              </div>
            </div>
            <button class="meal-add-btn" onclick="openLogModal('${meal.id}')" title="Hinzufügen">+</button>
          </div>
          <div class="meal-items">${itemsHtml}</div>
          ${mEntries.length > 0 ? `
          <div class="meal-footer">
            <span style="color:var(--protein)">${Math.round(mTot.protein*10)/10}g P</span>
            <span style="color:var(--carbs)">${Math.round(mTot.carbs*10)/10}g C</span>
            <span style="color:var(--fat)">${Math.round(mTot.fat*10)/10}g F</span>
          </div>` : ''}
        </div>`;
    }).join('');

    containerEl.innerHTML = `<div class="meal-carousel">${mealHtml}</div>`;
  }
}

function deleteEntry(i) {
  const entries = db.log[viewKey()] || [];
  entries.forEach(e => { if (!e.meal) e.meal = 'hauptspeise'; });
  entries.splice(i, 1);
  db.log[viewKey()] = entries;
  save(); renderToday();
}

function renderSuggestions(allEntries, tot, g) {
  const el = document.getElementById('suggestions-container');
  if (!el) return;
  if (!allEntries.length) { el.innerHTML = ''; return; }

  const suggestions = [];

  // Top contributor for a given macro key among today's entries
  function topEntry(macroKey) {
    return [...allEntries].sort((a, b) => b[macroKey] - a[macroKey])[0];
  }

  // ── Over-budget macros ──────────────────────────────
  const OVER_CHECKS = [
    { key: 'fat',   label: 'Fett',     unit: 'g',    emoji: '🧈', color: 'var(--fat)'  },
    { key: 'carbs', label: 'Kohlenhydrate', unit: 'g', emoji: '🍞', color: 'var(--carbs)' },
    { key: 'kcal',  label: 'Kalorien', unit: 'kcal', emoji: '🔥', color: 'var(--kcal)' },
  ];

  for (const m of OVER_CHECKS) {
    const val  = m.key === 'kcal' ? Math.round(tot.kcal) : Math.round(tot[m.key] * 10) / 10;
    const goal = g[m.key];
    const over = Math.round((val - goal) * 10) / 10;
    if (over <= 0 || !goal) continue;

    const top  = topEntry(m.key);
    const food = top ? db.foods.find(f => f.id === top.foodId) : null;

    let text = `Du hast dein <b style="color:${m.color}">${m.label}-Ziel</b> um <b>${over}${m.unit}</b> überschritten.`;

    if (food && top[m.key] > 0) {
      const per100 = m.key === 'kcal' ? food.per100g.kcal : food.per100g[m.key];
      if (per100 > 0) {
        const cutGrams = Math.ceil(over / per100 * 100);
        const newAmt   = Math.max(top.amount - cutGrams, 0);
        if (newAmt > 0) {
          text += ` Reduziere <b>${esc(food.name)}</b> von ${top.amount}g auf <b>${newAmt}g</b>, um dein Ziel zu erreichen.`;
        } else {
          text += ` Lass <b>${esc(food.name)}</b> (größter Verursacher) weg oder reduziere deutlich.`;
        }
      }
    }
    suggestions.push({ type: 'over', emoji: m.emoji, text });
  }

  // ── Under-protein warning (< 75 % of goal) ─────────
  const protPct = (tot.protein / (g.protein || 1)) * 100;
  if (protPct < 75 && g.protein > 0) {
    const missing = Math.round(g.protein - tot.protein);
    suggestions.push({
      type: 'under', emoji: '💪',
      text: `Noch <b style="color:var(--protein)">${missing}g Protein</b> offen — füge z.B. Hühnerbrust, Eier oder Thunfisch hinzu.`
    });
  }

  // ── All on track ───────────────────────────────────
  if (!suggestions.length) {
    const kcalPct = (tot.kcal / (g.kcal || 1)) * 100;
    if (kcalPct >= 85) {
      suggestions.push({ type: 'good', emoji: '✅', text: 'Perfekt! Du bist auf Kurs mit all deinen Makros für heute.' });
    } else {
      el.innerHTML = ''; return;
    }
  }

  el.innerHTML = `
    <div class="sugg-card">
      <div class="sugg-title">💡 Analyse &amp; Empfehlungen</div>
      ${suggestions.map(s => `
        <div class="sugg-item sugg-${s.type}">
          <span class="sugg-emoji">${s.emoji}</span>
          <div class="sugg-text">${s.text}</div>
        </div>`).join('')}
    </div>`;
}

function shiftDay(delta) {
  const base = viewDate ? new Date(viewDate) : new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + delta);
  const t = new Date(); t.setHours(12, 0, 0, 0);
  viewDate = (base >= t) ? null : base;   // never go past today
  renderToday();
}

function goToday() { viewDate = null; renderToday(); }

function gotoDay(dateKey) {
  viewDate = (dateKey === todayKey()) ? null : new Date(dateKey + 'T00:00:00');
  closeModal('modal-history');
  renderToday();
}

function openHistory() {
  const keys = Object.keys(db.log)
    .filter(k => (db.log[k] || []).length)
    .sort((a, b) => b.localeCompare(a));   // newest first
  const el = document.getElementById('history-list');
  const curK = viewKey();
  if (!keys.length) {
    el.innerHTML = `<div class="empty"><div class="icon">📅</div><p>Noch keine erfassten Tage.</p></div>`;
  } else {
    el.innerHTML = keys.map(key => {
      const entries = db.log[key];
      const d = new Date(key + 'T00:00:00');
      const tot = entries.reduce((a,e) => ({kcal:a.kcal+e.kcal,protein:a.protein+e.protein}),{kcal:0,protein:0});
      const isToday = key === todayKey();
      const dateStr = d.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      const mealChips = MEALS.filter(m => entries.some(e => (e.meal||'hauptspeise') === m.id))
        .map(m => `<span class="day-meal-chip">${m.emoji} ${m.label} (${entries.filter(e=>(e.meal||'hauptspeise')===m.id).length})</span>`).join('');
      return `
        <div class="day-item ${key === curK ? 'active' : ''}" onclick="gotoDay('${key}')">
          <div class="day-item-date">${isToday ? '⭐ Heute · ' : ''}${dateStr}</div>
          <div class="day-item-meta">${entries.length} Einträge · ${Math.round(tot.kcal)} kcal · ${Math.round(tot.protein*10)/10}g Protein</div>
          <div class="day-item-meals">${mealChips}</div>
        </div>`;
    }).join('');
  }
  openModal('modal-history');
}

function openCopyDay() {
  const days = [];
  for (let i = 1; i <= 21; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (db.log[key]?.length) days.push({ key, date: d, entries: db.log[key] });
  }
  const el = document.getElementById('copy-day-list');
  if (!days.length) {
    el.innerHTML = `<div class="empty"><div class="icon">📅</div><p>Keine Einträge in den letzten 21 Tagen gefunden.</p></div>`;
  } else {
    el.innerHTML = days.map(day => {
      const tot  = day.entries.reduce((a,e) => ({kcal:a.kcal+e.kcal,protein:a.protein+e.protein}),{kcal:0,protein:0});
      const dateStr = day.date.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' });
      const mealChips = MEALS.filter(m => day.entries.some(e => (e.meal||'hauptspeise') === m.id))
        .map(m => `<span class="day-meal-chip">${m.emoji} ${m.label} (${day.entries.filter(e=>(e.meal||'hauptspeise')===m.id).length})</span>`).join('');
      return `
        <div class="day-item" onclick="copyDayEntries('${day.key}')">
          <div class="day-item-date">${dateStr}</div>
          <div class="day-item-meta">${day.entries.length} Einträge · ${Math.round(tot.kcal)} kcal · ${Math.round(tot.protein*10)/10}g Protein</div>
          <div class="day-item-meals">${mealChips}</div>
        </div>`;
    }).join('');
  }
  openModal('modal-copy-day');
}

function copyDayEntries(dateKey) {
  const src = db.log[dateKey] || [];
  const destK = viewKey();
  if (!db.log[destK]) db.log[destK] = [];
  src.forEach(e => db.log[destK].push({ ...e }));
  save(); closeModal('modal-copy-day'); renderToday();
}
