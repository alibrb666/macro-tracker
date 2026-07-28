// ===== app.js =====
// App initialization and global presets logic

let activeCat = 'all';

function openPresets() {
  activeCat = 'all';
  document.getElementById('preset-search').value = '';
  renderPresetCats();
  renderPresets('');
  openModal('modal-presets');
}

function renderPresetCats() {
  document.getElementById('preset-cats').innerHTML = PRESET_CATS.map(c => `
    <button onclick="setPresetCat('${c.id}')" id="pcat-${c.id}"
      style="flex:none;padding:6px 12px;border-radius:20px;border:1px solid var(--border);
             background:${activeCat===c.id ? 'var(--accent)' : 'var(--surface2)'};
             color:${activeCat===c.id ? '#fff' : 'var(--muted)'};
             cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;transition:background .2s">
      ${c.label}
    </button>`).join('');
}

function setPresetCat(id) {
  activeCat = id;
  renderPresetCats();
  renderPresets(document.getElementById('preset-search').value);
}

function renderPresets(q) {
  const inLibrary = new Set(db.foods.map(f => f.name.toLowerCase()));
  const items = PRESETS.filter(p =>
    (activeCat === 'all' || p.cat === activeCat) &&
    matchQuery(p.name, q)
  );

  if (!items.length) {
    document.getElementById('preset-list').innerHTML =
      `<div class="empty" style="grid-column:auto"><div class="icon">🔍</div><p>Keine Vorlagen gefunden.</p></div>`;
    return;
  }

  document.getElementById('preset-list').innerHTML = items.map(p => {
    const already = inLibrary.has(p.name.toLowerCase());
    const btnHtml = already
      ? `<button style="flex:none;padding:6px 10px;border-radius:6px;border:1px solid var(--border);
                        background:var(--surface2);color:var(--muted);font-size:12px;cursor:default">✅</button>`
      : `<button onclick="addPreset('${p.name.replace(/'/g,"\\'")}');this.textContent='✅';this.disabled=true"
              style="flex:none;padding:6px 10px;border-radius:6px;border:1px solid var(--accent);
                     background:rgba(139,92,246,.12);color:var(--accent);font-size:13px;
                     font-weight:700;cursor:pointer">+</button>`;
    return `
      <div style="background:var(--surface2);border-radius:var(--r-sm);padding:12px;
                  display:flex;align-items:center;gap:12px;border:1px solid var(--border)">
        <span style="font-size:28px;flex:none">${p.emoji}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;margin-bottom:3px">${esc(p.name)}</div>
          <div style="font-size:11px;color:var(--muted);display:flex;gap:8px;flex-wrap:wrap">
            <span style="color:var(--kcal);font-weight:700">${p.per100g.kcal} kcal</span>
            <span>P <b style="color:var(--text)">${p.per100g.protein}g</b></span>
            <span>C <b style="color:var(--text)">${p.per100g.carbs}g</b></span>
            <span>F <b style="color:var(--text)">${p.per100g.fat}g</b></span>
            <span style="opacity:.6">/ 100g</span>
            ${p.unit ? `<span style="opacity:.85;color:var(--accent)">· 1 ${p.unit.label} ≈ ${p.unit.g} g</span>` : ''}
          </div>
        </div>
        ${btnHtml}
      </div>`;
  }).join('');
}

function addPreset(name) {
  const p = PRESETS.find(x => x.name === name);
  if (!p) return;
  // Don't add duplicates
  if (db.foods.some(f => f.name.toLowerCase() === p.name.toLowerCase())) return;
  db.foods.push({
    id: uid(),
    name: p.name,
    photo: null,
    per100g: { ...p.per100g },
    servingSize: p.serving,
    unit: p.unit ? { ...p.unit } : null,
  });
  save();
  renderLibrary(document.getElementById('lib-search').value);
}

// ===== START =====
init();
