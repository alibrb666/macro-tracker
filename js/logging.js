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

// The current modal markup uses pills and an inline amount preview.  These
// definitions intentionally replace the legacy select-based controls above.
function openLogModal(meal = 'hauptspeise') {
  logMealType = meal;
  activeLogFood = null;
  document.getElementById('log-search').value = '';
  document.getElementById('log-amount').value = '';
  document.getElementById('amount-section').style.display = 'none';
  document.querySelectorAll('#meal-pills .meal-pill').forEach(button => {
    const selected = button.dataset.meal === meal;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  openModal('modal-log');
  renderSelectList('');
  setTimeout(() => document.getElementById('log-search').focus(), 50);
}

function selectMealPill(button) {
  logMealType = button.dataset.meal;
  document.querySelectorAll('#meal-pills .meal-pill').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-checked', String(selected));
  });
}

function renderSelectList(query = '') {
  const list = document.getElementById('select-list');
  const foods = db.foods.filter(food => matchQuery(food.name, query));
  if (!foods.length) {
    list.innerHTML = `<div class="empty"><div class="icon">🔍</div><p>Keine Lebensmittel gefunden.</p></div>`;
    return;
  }
  list.innerHTML = foods.map(food => `
    <button type="button" class="lib-card" onclick="selectLogFood('${food.id}')">
      ${food.photo ? `<div class="lib-card-thumb"><img src="${food.photo}" alt=""></div>` : '<div class="lib-card-thumb">🍽️</div>'}
      <span class="lib-card-name">${esc(food.name)}</span>
      <span class="lib-card-meta"><b style="color:var(--kcal)">${food.per100g.kcal} kcal</b><span>P ${food.per100g.protein} · C ${food.per100g.carbs} · F ${food.per100g.fat}</span></span>
    </button>`).join('');
}

function selectLogFood(id) {
  activeLogFood = db.foods.find(food => food.id === id);
  if (!activeLogFood) return;
  document.querySelectorAll('#select-list .lib-card').forEach(item => item.classList.toggle('selected', item.getAttribute('onclick').includes(`'${id}'`)));
  const hasUnit = Boolean(activeLogFood.unit);
  document.getElementById('log-unit-toggle').style.display = hasUnit ? 'flex' : 'none';
  setLogUnit(hasUnit ? 'piece' : 'g');
  document.getElementById('log-amount').value = hasUnit ? 1 : activeLogFood.servingSize;
  document.getElementById('amount-section').style.display = 'block';
  updatePreview();
}

function setLogUnit(unit) {
  const isPiece = unit === 'piece' && activeLogFood && activeLogFood.unit;
  document.getElementById('log-ut-piece').classList.toggle('active', Boolean(isPiece));
  document.getElementById('log-ut-g').classList.toggle('active', !isPiece);
  document.getElementById('log-amount-unit').textContent = isPiece ? activeLogFood.unit.label : 'g';
  document.getElementById('log-unit-toggle').dataset.unit = isPiece ? 'piece' : 'g';
  updatePreview();
}

function updatePreview() {
  const preview = document.getElementById('amount-preview');
  const amount = parseFloat(document.getElementById('log-amount').value);
  if (!activeLogFood || !amount || amount <= 0) { preview.textContent = ''; return; }
  const isPiece = document.getElementById('log-unit-toggle').dataset.unit === 'piece';
  const macros = calcMacros(activeLogFood, isPiece ? amount * activeLogFood.unit.g : amount);
  preview.textContent = `${macros.kcal} kcal · ${macros.protein} g Protein · ${macros.carbs} g KH · ${macros.fat} g Fett`;
}

function logFood() {
  if (!activeLogFood) return;
  const amount = parseFloat(document.getElementById('log-amount').value);
  if (!amount || amount <= 0) return;
  const isPiece = document.getElementById('log-unit-toggle').dataset.unit === 'piece';
  const grams = isPiece ? amount * activeLogFood.unit.g : amount;
  const macros = calcMacros(activeLogFood, grams);
  if (!db.log[viewKey()]) db.log[viewKey()] = [];
  db.log[viewKey()].push({
    _id: uid(), foodId: activeLogFood.id, meal: logMealType, amount: grams,
    units: isPiece ? amount : null, unitLabel: isPiece ? activeLogFood.unit.label : null,
    unitPlural: isPiece ? (activeLogFood.unit.plural || activeLogFood.unit.label) : null, ...macros
  });
  save(); closeModal('modal-log'); renderToday(); showToast('Mahlzeit hinzugefügt');
}

function openEditEntry(idx) {
  const entry = (db.log[viewKey()] || [])[idx];
  if (!entry) return;
  editLogIdx = idx;
  const food = db.foods.find(item => item.id === entry.foodId);
  document.getElementById('edit-food-name').textContent = food ? food.name : 'Eintrag';
  document.getElementById('edit-food-per100').textContent = food ? `${food.per100g.kcal} kcal / 100 g` : '';
  const hasUnit = Boolean(food && food.unit);
  document.getElementById('edit-unit-toggle').style.display = hasUnit ? 'flex' : 'none';
  document.getElementById('edit-unit-toggle').dataset.unit = entry.units && hasUnit ? 'piece' : 'g';
  document.getElementById('edit-amount').value = entry.units || entry.amount;
  setEditUnit(document.getElementById('edit-unit-toggle').dataset.unit);
  openModal('modal-edit');
}

function setEditUnit(unit) {
  const entry = (db.log[viewKey()] || [])[editLogIdx];
  const food = entry && db.foods.find(item => item.id === entry.foodId);
  const isPiece = unit === 'piece' && food && food.unit;
  document.getElementById('edit-unit-toggle').dataset.unit = isPiece ? 'piece' : 'g';
  document.getElementById('edit-ut-piece').classList.toggle('active', Boolean(isPiece));
  document.getElementById('edit-ut-g').classList.toggle('active', !isPiece);
  document.getElementById('edit-amount-unit').textContent = isPiece ? food.unit.label : 'g';
  updateEditPreview();
}

function updateEditPreview() {
  const entry = (db.log[viewKey()] || [])[editLogIdx];
  const food = entry && db.foods.find(item => item.id === entry.foodId);
  const amount = parseFloat(document.getElementById('edit-amount').value);
  if (!food || !amount) return;
  const piece = document.getElementById('edit-unit-toggle').dataset.unit === 'piece';
  const macros = calcMacros(food, piece ? amount * food.unit.g : amount);
  document.getElementById('edit-macro-preview').textContent = `${macros.kcal} kcal · P ${macros.protein} g · C ${macros.carbs} g · F ${macros.fat} g`;
}

function saveEditEntry() {
  const entry = (db.log[viewKey()] || [])[editLogIdx];
  const food = entry && db.foods.find(item => item.id === entry.foodId);
  const amount = parseFloat(document.getElementById('edit-amount').value);
  if (!entry || !food || !amount || amount <= 0) return;
  const piece = document.getElementById('edit-unit-toggle').dataset.unit === 'piece';
  const grams = piece ? amount * food.unit.g : amount;
  Object.assign(entry, calcMacros(food, grams), { amount: grams, units: piece ? amount : null, unitLabel: piece ? food.unit.label : null, unitPlural: piece ? (food.unit.plural || food.unit.label) : null });
  save(); closeModal('modal-edit'); renderToday();
}

function deleteEditEntry() {
  const entries = db.log[viewKey()] || [];
  if (editLogIdx < 0 || !entries[editLogIdx]) return;
  entries.splice(editLogIdx, 1); save(); closeModal('modal-edit'); renderToday();
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
