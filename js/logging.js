// ===== logging.js =====
// Logging entries, edit modal, and drag & drop reordering

let logMealType = 'hauptspeise';
let editLogIdx = -1;

function openLogModal(meal) {
  logMealType = meal;
  document.getElementById('log-search').value = '';
  document.getElementById('log-amount').value = '';
  document.getElementById('log-unit-select').style.display = 'none';
  document.getElementById('log-results').innerHTML = '';
  document.getElementById('log-add-btn').style.display = 'none';
  openModal('modal-log');
  document.getElementById('log-search').focus();
  applyLogSearch();
}

function applyLogSearch() {
  const q = document.getElementById('log-search').value;
  const res = db.foods.filter(f => matchQuery(f.name, q));
  const el = document.getElementById('log-results');

  if (!res.length) {
    el.innerHTML = `<div class="empty" style="grid-column: 1/-1;"><div class="icon">🔍</div><p>Nichts gefunden. Neues Lebensmittel erstellen?</p></div>`;
    return;
  }
  el.innerHTML = res.map(f => {
    const thumb = f.photo
      ? `<div class="lib-card-thumb"><img src="${f.photo}" loading="lazy" decoding="async"></div>`
      : `<div class="lib-card-thumb">🍽️</div>`;
    return `
      <div class="lib-card" onclick="selectLogItem(this, '${f.id}')">
        ${thumb}
        <div class="lib-card-name">${esc(f.name)}</div>
        <div class="lib-card-meta">
          <span style="color:var(--kcal)">${f.per100g.kcal} kcal</span>
          <div style="display:flex;gap:4px">
            <span>P ${f.per100g.protein}</span>
            <span>C ${f.per100g.carbs}</span>
            <span>F ${f.per100g.fat}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

let activeLogFood = null;
function selectLogItem(div, id) {
  document.querySelectorAll('#log-results .lib-card').forEach(c => c.style.border = '1px solid var(--border)');
  div.style.border = '2px solid var(--accent)';
  activeLogFood = db.foods.find(f => f.id === id);
  if (!activeLogFood) return;
  
  const unitSel = document.getElementById('log-unit-select');
  if (activeLogFood.unit) {
    unitSel.style.display = 'inline-block';
    unitSel.innerHTML = `<option value="g">Gramm (g)</option><option value="unit" selected>${esc(activeLogFood.unit.label)} (${activeLogFood.unit.g}g)</option>`;
  } else {
    unitSel.style.display = 'none';
  }
  
  const amtInput = document.getElementById('log-amount');
  if (!amtInput.value) amtInput.value = (activeLogFood.unit && unitSel.value === 'unit') ? 1 : activeLogFood.servingSize;
  
  document.getElementById('log-add-btn').style.display = 'block';
  setTimeout(() => amtInput.focus(), 50);
}

function addLogEntry() {
  if (!activeLogFood) return;
  const isUnit = activeLogFood.unit && document.getElementById('log-unit-select').value === 'unit';
  const rawAmt = parseFloat(document.getElementById('log-amount').value);
  if (isNaN(rawAmt) || rawAmt <= 0) return;

  const finalGrams = isUnit ? rawAmt * activeLogFood.unit.g : rawAmt;
  const unitCount  = isUnit ? rawAmt : null;
  const m = calcMacros(activeLogFood, finalGrams);

  if (!db.log[viewKey()]) db.log[viewKey()] = [];
  db.log[viewKey()].push({
    _id: uid(),
    foodId: activeLogFood.id,
    meal: logMealType,
    amount: finalGrams,
    units: unitCount,
    unitLabel: activeLogFood.unit ? activeLogFood.unit.label : null,
    unitPlural: activeLogFood.unit ? (activeLogFood.unit.plural || activeLogFood.unit.label) : null,
    kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat
  });
  save(); closeModal('modal-log'); renderToday();
}

// Edit Entry inline
function openEditEntry(idx) {
  const e = (db.log[viewKey()] || [])[idx];
  if (!e) return;
  editLogIdx = idx;
  const food = db.foods.find(f => f.id === e.foodId);
  const name = food ? food.name : 'Eintrag';
  document.getElementById('edit-entry-title').textContent = `${name} anpassen`;
  
  const unitSel = document.getElementById('edit-entry-unit');
  if (food && food.unit) {
    unitSel.style.display = 'inline-block';
    unitSel.innerHTML = `<option value="g">Gramm (g)</option><option value="unit">${esc(food.unit.label)} (${food.unit.g}g)</option>`;
    if (e.units) {
      unitSel.value = 'unit';
      document.getElementById('edit-entry-amount').value = e.units;
    } else {
      unitSel.value = 'g';
      document.getElementById('edit-entry-amount').value = e.amount;
    }
  } else {
    unitSel.style.display = 'none';
    document.getElementById('edit-entry-amount').value = e.amount;
  }
  
  openModal('modal-edit-entry');
}

function saveEditEntry() {
  const entries = db.log[viewKey()] || [];
  const e = entries[editLogIdx];
  if (!e) return;
  const food = db.foods.find(f => f.id === e.foodId);
  if (!food) return;

  const isUnit = food.unit && document.getElementById('edit-entry-unit').style.display !== 'none' && document.getElementById('edit-entry-unit').value === 'unit';
  const rawAmt = parseFloat(document.getElementById('edit-entry-amount').value);
  if (isNaN(rawAmt) || rawAmt <= 0) return;

  const finalGrams = isUnit ? rawAmt * food.unit.g : rawAmt;
  const unitCount  = isUnit ? rawAmt : null;
  const m = calcMacros(food, finalGrams);

  e.amount = finalGrams;
  e.units  = unitCount;
  e.kcal = m.kcal; e.protein = m.protein; e.carbs = m.carbs; e.fat = m.fat;
  
  save(); closeModal('modal-edit-entry'); renderToday();
}

// ===== Drag & Drop Logic =====
let dragSrcId = null;

function dragStart(e, id) {
  dragSrcId = id;
  e.target.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
}
function dragEnd(e) {
  e.target.style.opacity = '1';
  document.querySelectorAll('.meal-section').forEach(el => el.classList.remove('drag-over'));
}
function dragOver(e, mealId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}
function dragDrop(e, mealId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;
  
  const entries = db.log[viewKey()] || [];
  const idx = entries.findIndex(x => (x._id || entries.indexOf(x)) == id);
  if (idx !== -1) {
    entries[idx].meal = mealId;
    save(); renderToday();
  }
}
