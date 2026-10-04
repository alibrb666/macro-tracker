// ===== library.js =====
// Food Library, creation, editing and OCR processing

function renderLibrary(query = '') {
  const container = document.getElementById('lib-grid');
  if (!container) return;
  const filters = [
    { id: 'all', label: 'Alle' },
    { id: 'protein', label: 'Proteinreich' },
    { id: 'quick', label: 'Quick Log' },
    { id: 'photos', label: 'Mit Foto' },
  ];
  const summary = document.getElementById('library-summary');
  const filterBar = document.getElementById('library-filters');
  const filtered = db.foods.filter(food => {
    if (!matchQuery(food.name, query)) return false;
    if (libraryFilter === 'protein') return food.per100g.protein >= 15;
    if (libraryFilter === 'quick') return food.servingSize > 0 && food.servingSize <= 100;
    if (libraryFilter === 'photos') return Boolean(food.photo);
    return true;
  });
  if (summary) summary.innerHTML = `<span class="library-eyebrow">DEINE FOOD COLLECTION</span><strong>${filtered.length}</strong><span>${filtered.length === 1 ? 'Lebensmittel' : 'Lebensmittel'} bereit zum Loggen</span>`;
  if (filterBar) filterBar.innerHTML = filters.map(filter =>
    `<button class="library-filter ${filter.id === libraryFilter ? 'active' : ''}" onclick="setLibraryFilter('${filter.id}')">${filter.label}</button>`
  ).join('');
  const items = filtered;
  if (!items.length) {
    container.innerHTML = `<div class="library-empty"><div class="icon">⌁</div><strong>Hier ist noch Platz für etwas Gutes.</strong><p>Ändere die Filter oder lege ein neues Lebensmittel an.</p><button class="btn-primary" onclick="openFoodModal('')">Lebensmittel anlegen</button></div>`;
    return;
  }
  container.innerHTML = items.map((f, index) => {
    const thumb = f.photo
      ? `<div class="library-card-image"><img src="${f.photo}" loading="lazy" decoding="async" alt=""></div>`
      : `<div class="library-card-image library-card-fallback"><span>${foodEmoji(f.name)}</span></div>`;
    const proteinWidth = Math.min(100, Math.round(f.per100g.protein / 30 * 100));
    return `
      <button class="library-card" style="--delay:${Math.min(index, 10) * 45}ms" onclick="openFoodModal('${f.id}')" aria-label="${esc(f.name)} bearbeiten">
        ${thumb}
        <span class="library-card-sheen"></span>
        <div class="library-card-content">
          <div class="library-card-topline"><span>${f.per100g.kcal} KCAL</span><span>${f.servingSize || 100} G PORTION</span></div>
          <div class="library-card-name">${esc(f.name)}</div>
          <div class="library-macro-row">
            <span><b>${f.per100g.protein}</b> Protein</span>
            <span><b>${f.per100g.carbs}</b> KH</span>
            <span><b>${f.per100g.fat}</b> Fett</span>
          </div>
          <div class="library-protein-meter"><i style="width:${proteinWidth}%"></i></div>
          <div class="library-card-footer">${f.unit ? `1 ${esc(f.unit.label)} · ${f.unit.g} g` : 'Pro 100 g'}<span>Bearbeiten →</span></div>
        </div>
        <span class="library-photo-action" role="button" tabindex="0" onclick="event.stopPropagation();openPhotoForFood('${f.id}')" aria-label="Foto für ${esc(f.name)} hinzufügen">${f.photo ? 'Foto ändern' : '+ Foto'}</span>
      </button>`;
  }).join('');
  container.querySelectorAll('.library-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    });
  });
}

function foodEmoji(name) {
  const text = name.toLowerCase();
  if (/protein|skyr|quark|hähnchen|egg|ei/.test(text)) return '◒';
  if (/brot|reis|hafer|sandwich|pasta/.test(text)) return '◐';
  if (/milch|joghurt|yopro|caffe/.test(text)) return '◌';
  return '◇';
}

let editFoodId = null;
let libraryFilter = 'all';
let barcodeScanStream = null;
let barcodeScanTimer = null;
let barcodeFallbackScanner = null;
let labelImageData = null;

function setLibraryFilter(filter) {
  libraryFilter = filter;
  renderLibrary(document.getElementById('lib-search').value);
}

function openPhotoForFood(id) {
  openFoodModal(id);
  document.getElementById('product-file-input').click();
}

function openFoodModal(id) {
  editFoodId = id;
  const f = id ? db.foods.find(x => x.id === id) : null;
  const title = document.getElementById('modal-food-title');
  if (title) title.textContent = f ? 'Bearbeiten' : 'Neu erstellen';
  
  document.getElementById('food-name').value    = f ? f.name : '';
  document.getElementById('food-kcal').value    = f ? f.per100g.kcal : '';
  document.getElementById('food-protein').value = f ? f.per100g.protein : '';
  document.getElementById('food-carbs').value   = f ? f.per100g.carbs : '';
  document.getElementById('food-fat').value     = f ? f.per100g.fat : '';
  document.getElementById('food-sugars').value = f && f.per100g.sugars != null ? f.per100g.sugars : '';
  document.getElementById('food-fiber').value = f && f.per100g.fiber != null ? f.per100g.fiber : '';
  document.getElementById('food-saturated-fat').value = f && f.per100g.saturatedFat != null ? f.per100g.saturatedFat : '';
  document.getElementById('food-sodium').value = f && f.per100g.sodium != null ? f.per100g.sodium : '';
  document.getElementById('food-polyols').value = f && f.per100g.polyols != null ? f.per100g.polyols : '';
  document.getElementById('food-brand').value = f && f.brand ? f.brand : '';
  document.getElementById('food-barcode').value = f && f.barcode ? f.barcode : '';
  document.getElementById('food-serving').value = f ? f.servingSize : 100;
  document.getElementById('food-unit-label').value = f && f.unit ? f.unit.label : '';
  document.getElementById('food-unit-g').value = f && f.unit ? f.unit.g : '';
  const ocrStatus = document.getElementById('ocr-status');
  ocrStatus.textContent = '';
  ocrStatus.className = 'ocr-status';
  labelImageData = null;
  setBarcodeStatus('');
  closeBarcodeScanner();
  const zone = document.getElementById('product-photo-zone');
  zone.dataset.photo = f && f.photo ? f.photo : '';
  zone.classList.toggle('has-photo', Boolean(f && f.photo));
  zone.style.backgroundImage = f && f.photo
    ? `linear-gradient(rgba(15,16,18,.46), rgba(15,16,18,.46)), url(${f.photo})`
    : '';
  const labelZone = document.getElementById('label-photo-zone');
  labelZone.classList.remove('has-photo');
  labelZone.style.backgroundImage = '';
  document.getElementById('btn-ocr').disabled = true;

  openModal('modal-food');
}

function setBarcodeStatus(message, type = '') {
  const status = document.getElementById('barcode-status');
  if (!status) return;
  status.textContent = message;
  status.className = `ocr-status${message ? ' show' : ''}${type ? ` ${type}` : ''}`;
}

function setBarcodeNutrition(product) {
  const nutrients = product.nutriments || {};
  const set = (id, value) => {
    const number = Number(value);
    if (Number.isFinite(number)) document.getElementById(id).value = number;
  };
  document.getElementById('food-name').value = product.product_name || product.product_name_de || document.getElementById('food-name').value;
  document.getElementById('food-brand').value = product.brands || document.getElementById('food-brand').value;
  set('food-kcal', nutrients['energy-kcal_100g'] ?? nutrients.energy_kcal_100g);
  set('food-protein', nutrients.proteins_100g);
  set('food-carbs', nutrients.carbohydrates_100g);
  set('food-fat', nutrients.fat_100g);
  set('food-sugars', nutrients.sugars_100g);
  set('food-fiber', nutrients.fiber_100g);
  set('food-saturated-fat', nutrients['saturated-fat_100g']);
  set('food-sodium', nutrients.salt_100g ?? nutrients.sodium_100g);
  set('food-polyols', nutrients.polyols_100g);
}

async function lookupBarcode(code) {
  const barcode = String(code || '').replace(/\D/g, '');
  if (barcode.length < 8 || barcode.length > 14) { setBarcodeStatus('Bitte einen gültigen EAN/UPC-Barcode eingeben.', 'err'); return; }
  document.getElementById('food-barcode').value = barcode;
  setBarcodeStatus('Produktdaten werden gesucht …');
  try {
    const fields = 'code,product_name,product_name_de,brands,nutriments';
    const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json?fields=${fields}`);
    const data = await response.json();
    if (!response.ok || !data.product) { setBarcodeStatus('Produkt nicht gefunden — Werte können manuell ergänzt werden.', 'err'); return; }
    setBarcodeNutrition(data.product);
    setBarcodeStatus('Produkt gefunden — bitte Etikettwerte kurz prüfen.', 'ok');
  } catch (error) {
    setBarcodeStatus('Produktdaten konnten nicht geladen werden. Bitte Verbindung prüfen oder Werte manuell eingeben.', 'err');
  }
}

function lookupBarcodeFromField() { lookupBarcode(document.getElementById('food-barcode').value); }

async function openBarcodeScanner() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setBarcodeStatus('Kamera-Zugriff wird von diesem Browser nicht unterstützt. Bitte Barcode eingeben und „Suchen“ wählen.', 'err');
    return;
  }
  if (!('BarcodeDetector' in window)) return openFallbackBarcodeScanner();
  try {
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    barcodeScanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const camera = document.getElementById('barcode-camera');
    const video = document.getElementById('barcode-video');
    video.srcObject = barcodeScanStream;
    camera.style.display = '';
    setBarcodeStatus('Barcode vor die Kamera halten …');
    barcodeScanTimer = setInterval(async () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      try {
        const results = await detector.detect(video);
        if (results[0] && results[0].rawValue) { closeBarcodeScanner(); lookupBarcode(results[0].rawValue); }
      } catch (error) { /* continue scanning while the camera frame is changing */ }
    }, 400);
  } catch (error) {
    await closeBarcodeScanner();
    if (window.Html5Qrcode) return openFallbackBarcodeScanner();
    setBarcodeStatus('Kamera konnte nicht geöffnet werden. Bitte Berechtigung erlauben oder Barcode manuell eingeben.', 'err');
  }
}

async function openFallbackBarcodeScanner() {
  if (!window.Html5Qrcode || !window.Html5QrcodeSupportedFormats) {
    setBarcodeStatus('Scanner-Fallback konnte nicht geladen werden. Bitte Barcode eingeben und „Suchen“ wählen.', 'err');
    return;
  }
  try {
    const camera = document.getElementById('barcode-camera');
    const video = document.getElementById('barcode-video');
    const reader = document.getElementById('barcode-fallback-reader');
    video.style.display = 'none';
    reader.innerHTML = '';
    camera.style.display = '';
    barcodeFallbackScanner = new window.Html5Qrcode('barcode-fallback-reader', {
      formatsToSupport: [window.Html5QrcodeSupportedFormats.EAN_13, window.Html5QrcodeSupportedFormats.EAN_8, window.Html5QrcodeSupportedFormats.UPC_A, window.Html5QrcodeSupportedFormats.UPC_E],
    }, false);
    await barcodeFallbackScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 1.8 },
      async decodedText => { await closeBarcodeScanner(); lookupBarcode(decodedText); },
      () => {} // Decode failures are expected until a barcode enters the frame.
    );
    setBarcodeStatus('Barcode vor die Kamera halten …');
  } catch (error) {
    await closeBarcodeScanner();
    setBarcodeStatus('Kamera konnte nicht geöffnet werden. Bitte Berechtigung erlauben oder Barcode manuell eingeben.', 'err');
  }
}

async function closeBarcodeScanner() {
  if (barcodeScanTimer) clearInterval(barcodeScanTimer);
  barcodeScanTimer = null;
  if (barcodeScanStream) barcodeScanStream.getTracks().forEach(track => track.stop());
  barcodeScanStream = null;
  if (barcodeFallbackScanner) {
    try { await barcodeFallbackScanner.stop(); } catch (error) { /* scanner was not started yet */ }
    try { await barcodeFallbackScanner.clear(); } catch (error) { /* scanner container may already be empty */ }
    barcodeFallbackScanner = null;
  }
  const video = document.getElementById('barcode-video');
  if (video) { video.srcObject = null; video.style.display = ''; }
  const reader = document.getElementById('barcode-fallback-reader');
  if (reader) reader.innerHTML = '';
  const camera = document.getElementById('barcode-camera');
  if (camera) camera.style.display = 'none';
}

function handlePhotoDragOver(event, zone) { event.preventDefault(); zone.classList.add('drag-over'); }
function handlePhotoDragLeave(zone) { zone.classList.remove('drag-over'); }
function handleProductPhotoDrop(event) { event.preventDefault(); handlePhotoDragLeave(event.currentTarget); loadProductPhoto(event.dataTransfer.files[0]); }
function handleLabelPhotoDrop(event) { event.preventDefault(); handlePhotoDragLeave(event.currentTarget); loadLabelPhoto(event.dataTransfer.files[0]); }
function handleProductPhoto(event) { loadProductPhoto(event.target.files[0]); event.target.value = ''; }
function handleLabelPhoto(event) { loadLabelPhoto(event.target.files[0]); event.target.value = ''; }

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('no-image'));
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadProductPhoto(file) {
  try {
    const dataUrl = await readImageFile(file);
    const photo = await resizeImage(dataUrl, 1200, 0.82);
    if (!photo) throw new Error('resize');
    const zone = document.getElementById('product-photo-zone');
    zone.dataset.photo = photo;
    zone.classList.add('has-photo');
    zone.style.backgroundImage = `linear-gradient(rgba(15,16,18,.34), rgba(15,16,18,.34)), url(${photo})`;
  } catch (error) { showToast('Bitte ein gültiges Produktfoto auswählen.', 'warning'); }
}

async function loadLabelPhoto(file) {
  try {
    const dataUrl = await readImageFile(file);
    labelImageData = dataUrl;
    const preview = await resizeImage(dataUrl, 1000, 0.86);
    const zone = document.getElementById('label-photo-zone');
    zone.classList.add('has-photo');
    zone.style.backgroundImage = `linear-gradient(rgba(15,16,18,.34), rgba(15,16,18,.34)), url(${preview})`;
    document.getElementById('btn-ocr').disabled = false;
    setOcrStatus('Etikett bereit. Jetzt die automatische Erkennung starten.');
  } catch (error) { setOcrStatus('Bitte ein gültiges Foto des Nährwertetiketts auswählen.', 'err'); }
}

function setOcrStatus(message, type = '') {
  const status = document.getElementById('ocr-status');
  status.textContent = message;
  status.className = `ocr-status${message ? ' show' : ''}${type ? ` ${type}` : ''}`;
}

async function preprocessNutritionLabel(dataUrl, variant = 'contrast') {
  const image = new Image();
  image.src = dataUrl;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const luminance = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114;
    const contrast = Math.max(0, Math.min(255, (luminance - 128) * 1.85 + 128));
    const value = variant === 'threshold' ? (contrast > 158 ? 255 : 0) : contrast;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/jpeg', .92);
}

function nutritionExtractionScore(values, confidence = 0) {
  const present = Object.values(values || {}).filter(value => value != null).length;
  if (!values || present < 3) return -1000;
  let score = present * 20 + confidence / 10;
  const validGram = value => value == null || (value >= 0 && value <= 100);
  if (![values.protein, values.carbs, values.fat, values.sugars, values.fiber, values.saturatedFat, values.polyols].every(validGram)) score -= 100;
  if (values.sugars != null && values.carbs != null && values.sugars > values.carbs) score -= 45;
  if (values.saturatedFat != null && values.fat != null && values.saturatedFat > values.fat) score -= 45;
  if (values.kcal != null && values.kcal > 1000) score -= 80;
  if (values.kcal != null && values.protein != null && values.carbs != null && values.fat != null) {
    const energy = scientificMacroCalories(values);
    score += Math.max(-35, 35 - Math.abs(values.kcal - energy));
  }
  return score;
}

async function runOCR() {
  if (!labelImageData) { setOcrStatus('Bitte zuerst ein Foto des Nährwertetiketts auswählen.', 'err'); return; }
  if (!window.Tesseract) { setOcrStatus('OCR-Engine konnte nicht geladen werden.', 'err'); return; }
  try {
    setOcrStatus('Etikett wird für die Erkennung optimiert …');
    const variants = await Promise.all([
      preprocessNutritionLabel(labelImageData, 'contrast'),
      preprocessNutritionLabel(labelImageData, 'threshold'),
    ]);
    const candidates = [];
    for (let index = 0; index < variants.length; index++) {
      setOcrStatus(`Etikett wird gelesen (${index + 1}/${variants.length}) …`);
      const result = await Tesseract.recognize(variants[index], 'deu+eng', {
        tessedit_pageseg_mode: index === 0 ? '6' : '4', // tabular block / single column
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
        logger: state => {
          if (state.status === 'recognizing text') setOcrStatus(`Etikett wird gelesen (${index + 1}/${variants.length}) … ${Math.round(state.progress * 100)} %`);
        },
      });
      const values = extractNutritionFromText(result.data.text);
      candidates.push({ values, confidence: Number(result.data.confidence || 0) });
    }
    const best = candidates.sort((a, b) => nutritionExtractionScore(b.values, b.confidence) - nutritionExtractionScore(a.values, a.confidence))[0];
    const values = best && best.values;
    if (!values) { setOcrStatus('Keine eindeutigen Nährwerte erkannt. Bitte Etikett gerade und scharf fotografieren.', 'err'); return; }
    const fields = { kcal: 'food-kcal', protein: 'food-protein', carbs: 'food-carbs', fat: 'food-fat', sugars: 'food-sugars', fiber: 'food-fiber', saturatedFat: 'food-saturated-fat', sodium: 'food-sodium', polyols: 'food-polyols' };
    Object.entries(fields).forEach(([key, id]) => { if (values[key] != null) document.getElementById(id).value = values[key]; });
    const populated = Object.keys(fields).filter(key => values[key] != null).length;
    const calorieCheck = validateNutritionCalories({ ...values, kcal: values.kcal || 0 });
    const warning = calorieCheck.isSuspicious ? ' Die Kalorien passen nicht gut zu den Makros — Etikett unbedingt prüfen.' : '';
    setOcrStatus(`${populated} Nährwerte erkannt (OCR-Konfidenz ${Math.round(best.confidence)} %) — bitte mit dem Etikett vergleichen.${warning}`, calorieCheck.isSuspicious ? 'err' : 'ok');
  } catch (error) {
    setOcrStatus('Die Texterkennung ist fehlgeschlagen. Bitte ein schärferes, gerade ausgerichtetes Etikett verwenden.', 'err');
  }
}

function extractNutritionFromText(text) {
  const lines = String(text || '').toLowerCase().replace(/\r/g, '').split('\n')
    .map(line => line.replace(/,/g, '.').replace(/[|]/g, '1').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const readLineValue = (patterns, unit = 'g') => {
    for (let index = 0; index < lines.length; index++) {
      const line = `${lines[index]} ${lines[index + 1] || ''}`;
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (!match) continue;
        const tail = line.slice(match.index + match[0].length).replace(/pro\s*100\s*(g|ml)/, '');
        const value = tail.match(new RegExp(`(\\d{1,4}(?:\\.\\d+)?)\\s*${unit}`));
        if (value) return Number(value[1]);
      }
    }
    return null;
  };
  const kcal = readLineValue([/energie|brennwert/, /kcal/], 'kcal') || (() => {
    const match = lines.join(' ').match(/(\d{1,4}(?:\.\d+)?)\s*kcal/); return match ? Number(match[1]) : null;
  })();
  const values = {
    kcal, protein: readLineValue([/eiwe[ií]ß|eiweiss|protein/]), carbs: readLineValue([/kohlenhydrate|carbohydrates?|glucides/]),
    fat: readLineValue([/^(?!.*ges.ttigt).*\bfett\b/, /^(?!.*satur).*\bfat\b/]), sugars: readLineValue([/davon zucker|of which sugars?|zucker/]),
    fiber: readLineValue([/ballaststoffe|fibre|fiber/]), saturatedFat: readLineValue([/ges.ttigte?.{0,20}fetts?äuren|satur(?:ated)?.{0,20}fat/]),
    sodium: readLineValue([/salz|sodium|natrium/]), polyols: readLineValue([/mehrwertige alkohole|polyole|polyols/]),
  };
  const found = Object.values(values).filter(value => value != null).length;
  return found >= 3 ? values : null;
}

function saveFood() {
  const n = document.getElementById('food-name').value.trim();
  const k = parseFloat(document.getElementById('food-kcal').value);
  const p = parseFloat(document.getElementById('food-protein').value);
  const c = parseFloat(document.getElementById('food-carbs').value);
  const f = parseFloat(document.getElementById('food-fat').value);
  const s = parseFloat(document.getElementById('food-serving').value) || 100;
  if (!n || isNaN(k) || isNaN(p) || isNaN(c) || isNaN(f)) { alert('Bitte alle Felder (Name & Makros) ausfüllen.'); return; }

  let unit = null;
  const ul = document.getElementById('food-unit-label').value.trim();
  const ug = parseFloat(document.getElementById('food-unit-g').value);
  if (ul || !isNaN(ug)) {
    if (!ul || isNaN(ug) || ug <= 0) { alert('Bitte gültige Stück-Einheit und Gewicht eingeben.'); return; }
    unit = { label: ul, plural: ul, g: ug };
  }

  const zone = document.getElementById('product-photo-zone');
  const photo = zone && zone.dataset.photo ? zone.dataset.photo : null;
  const per100g = {
    kcal:k, protein:p, carbs:c, fat:f,
    sugars: optionalNutritionField('food-sugars'),
    fiber: optionalNutritionField('food-fiber'),
    saturatedFat: optionalNutritionField('food-saturated-fat'),
    sodium: optionalNutritionField('food-sodium'),
    polyols: optionalNutritionField('food-polyols'),
  };
  const calorieCheck = validateNutritionCalories(per100g);
  if (calorieCheck.isSuspicious && !confirm(`${calorieCheck.message}\n\nTrotzdem speichern?`)) return;
  const item = {
    id: editFoodId || uid(),
    name: n, photo,
    brand: document.getElementById('food-brand').value.trim() || null,
    barcode: document.getElementById('food-barcode').value.trim() || null,
    per100g,
    servingSize: s,
    unit: unit
  };

  if (editFoodId) {
    const idx = db.foods.findIndex(x => x.id === editFoodId);
    if (idx >= 0) db.foods[idx] = item;
  } else {
    db.foods.push(item);
  }
  save(); closeModal('modal-food'); renderLibrary(document.getElementById('lib-search').value);
}

function deleteFood() {
  if (confirm('Wirklich löschen? Bereits geloggte Einträge bleiben erhalten.')) {
    db.foods = db.foods.filter(x => x.id !== editFoodId);
    save(); closeModal('modal-food'); renderLibrary(document.getElementById('lib-search').value);
  }
}
