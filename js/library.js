// ===== library.js =====
// Food Library, creation, editing and OCR processing

function renderLibrary(query = '') {
  const container = document.getElementById('lib-grid');
  if (!container) return;
  const items = db.foods.filter(f => matchQuery(f.name, query));
  if (!items.length) {
    container.innerHTML = `<div class="empty" style="grid-column: 1/-1;"><div class="icon">🔍</div><p>Keine Lebensmittel gefunden.</p></div>`;
    return;
  }
  container.innerHTML = items.map(f => {
    const thumb = f.photo
      ? `<div class="lib-card-thumb"><img src="${f.photo}" loading="lazy" decoding="async"></div>`
      : `<div class="lib-card-thumb">🍽️</div>`;
    return `
      <div class="lib-card" onclick="openFoodModal('${f.id}')">
        ${thumb}
        <div class="lib-card-name">${esc(f.name)}</div>
        <div class="lib-card-meta">
          <span style="color:var(--kcal);font-weight:700">${f.per100g.kcal} kcal</span>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <span>P ${f.per100g.protein}</span>
            <span>C ${f.per100g.carbs}</span>
            <span>F ${f.per100g.fat}</span>
          </div>
          ${f.unit ? `<div style="opacity:.6;margin-top:2px;color:var(--text);font-weight:500;font-size:10px">1 ${esc(f.unit.label)} = ${f.unit.g}g</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

let editFoodId = null;

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
