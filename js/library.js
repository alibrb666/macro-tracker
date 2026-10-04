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

function setLibraryFilter(filter) {
  libraryFilter = filter;
  renderLibrary(document.getElementById('lib-search').value);
}

function openPhotoForFood(id) {
  openFoodModal(id);
  document.getElementById('file-input').click();
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
  document.getElementById('ocr-status').textContent = '';
  setBarcodeStatus('');
  closeBarcodeScanner();
  const zone = document.getElementById('ocr-zone');
  zone.dataset.photo = f && f.photo ? f.photo : '';
  zone.style.backgroundImage = f && f.photo
    ? `linear-gradient(rgba(15,16,18,.46), rgba(15,16,18,.46)), url(${f.photo})`
    : '';
  document.getElementById('btn-ocr').disabled = !f?.photo;

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

function handlePhoto(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const reader = new FileReader();
    reader.onload = async e => {
      const b64 = await resizeImage(e.target.result, 400); // 400px is enough for thumbnails
      if (!b64) return;
      const zone = document.getElementById('ocr-zone');
      zone.dataset.photo = b64;
      zone.style.backgroundImage = `linear-gradient(rgba(15,16,18,.46), rgba(15,16,18,.46)), url(${b64})`;
      document.getElementById('btn-ocr').disabled = false;
    };
    reader.readAsDataURL(file);
  } catch (err) {}
}

async function runOCR() {
  const input = document.getElementById('file-input');
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const statusEl = document.getElementById('ocr-status');
  statusEl.textContent = 'Bild wird geladen...';

  try {
    const reader = new FileReader();
    const dataUrl = await new Promise((res, rej) => {
      reader.onload = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    // Optional: Pre-process image here (resize, contrast) if needed for Tesseract
    const processedImgUrl = await resizeImage(dataUrl, 1000); // Resize for OCR
    
    if (!window.Tesseract) {
      statusEl.textContent = 'Tesseract (OCR Engine) nicht geladen.';
      return;
    }

    statusEl.textContent = 'Analysiere Text...';
    
    const result = await Tesseract.recognize(
      processedImgUrl,
      'deu+eng', // German + English language models
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            const p = Math.round(m.progress * 100);
            statusEl.textContent = `Analysiere Text... ${p}%`;
          } else {
             statusEl.textContent = m.status;
          }
        }
      }
    );

    statusEl.textContent = 'Extrahiere Nährwerte...';
    
    const text = result.data.text;
    console.log("OCR Extracted Text:\n", text);

    const values = extractNutritionFromText(text);
    
    if (values) {
      if (values.kcal)    document.getElementById('food-kcal').value    = values.kcal;
      if (values.protein) document.getElementById('food-protein').value = values.protein;
      if (values.carbs)   document.getElementById('food-carbs').value   = values.carbs;
      if (values.fat)     document.getElementById('food-fat').value     = values.fat;
      statusEl.textContent = 'Nährwerte erfolgreich extrahiert!';
    } else {
       statusEl.textContent = 'Konnte keine Nährwerte im Text finden. Bitte manuell eingeben.';
    }
  } catch (error) {
    console.error("OCR Error:", error);
    statusEl.textContent = 'Fehler bei der Texterkennung.';
  } finally {
     input.value = ''; // Reset input
  }
}

function extractNutritionFromText(text) {
    // Normalisieren: Kleinbuchstaben, unnötige Leerzeichen entfernen, Kommas zu Punkten
    let t = text.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/,/g, '.')
        .replace(/\|/g, 'I'); // "|" wird oft als "I" oder "1" erkannt

    // Helfer für Regex: Sucht nach einem Keyword, evtl. Füllwörtern und dann einer Zahl
    const findVal = (keywords, blockRegex = null) => {
        for (const kw of keywords) {
             // Regex: keyword -> evtl (pro 100g/ml) -> evtl Trennzeichen -> Zahl
             const re = new RegExp(`${kw}.*?(\\d+(?:\\.\\d+)?)`, 'i');
             const m = t.match(re);
             if (m && parseFloat(m[1]) < 10000) return parseFloat(m[1]); // Sanity check (<10000)
        }
        return null;
    };

    // Energiewert (kcal) - oft "Energie", "Brennwert", "kcal"
    // Suche spezifisch nach dem Wert vor/nach "kcal"
    let kcal = null;
    let kcalMatch = t.match(/(\d+(?:\.\d+)?)\s*kcal/);
    if (kcalMatch) {
       kcal = parseFloat(kcalMatch[1]);
    } else {
       kcalMatch = t.match(/(?:energie|brennwert).*?(\d+(?:\.\d+)?)\s*kcal/);
       if (kcalMatch) kcal = parseFloat(kcalMatch[1]);
    }

    if (!kcal) kcal = findVal(['kcal', 'brennwert', 'energie']);

    // Makros
    const protein = findVal(['eiweiß', 'eiweiss', 'protein', 'protéines']);
    const carbs   = findVal(['kohlenhydrate', 'carbohydrate', 'glucides']);
    const fat     = findVal(['fett', 'fat', 'matières grasses', 'matieres grasses']);

    if (kcal || protein || carbs || fat) {
        return {
            kcal: kcal || 0,
            protein: protein || 0,
            carbs: carbs || 0,
            fat: fat || 0
        };
    }
    return null;
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

  const zone = document.getElementById('ocr-zone');
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
