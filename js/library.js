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

function setLibraryFilter(filter) {
  libraryFilter = filter;
  renderLibrary(document.getElementById('lib-search').value);
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
  document.getElementById('food-serving').value = f ? f.servingSize : 100;
  document.getElementById('food-unit-label').value = f && f.unit ? f.unit.label : '';
  document.getElementById('food-unit-g').value = f && f.unit ? f.unit.g : '';
  document.getElementById('ocr-status').textContent = '';
  const zone = document.getElementById('ocr-zone');
  zone.dataset.photo = f && f.photo ? f.photo : '';
  zone.style.backgroundImage = f && f.photo
    ? `linear-gradient(rgba(15,16,18,.46), rgba(15,16,18,.46)), url(${f.photo})`
    : '';
  document.getElementById('btn-ocr').disabled = !f?.photo;

  openModal('modal-food');
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
  const item = {
    id: editFoodId || uid(),
    name: n, photo,
    per100g: { kcal:k, protein:p, carbs:c, fat:f },
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
