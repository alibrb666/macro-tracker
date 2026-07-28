// ===== library.js =====
// Food Library, creation, editing and OCR processing

function renderLibrary(query = '') {
  const container = document.getElementById('lib-container');
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
  const title = document.getElementById('food-modal-title');
  if (title) title.textContent = f ? 'Bearbeiten' : 'Neu erstellen';
  
  document.getElementById('f-name').value    = f ? f.name : '';
  document.getElementById('f-kcal').value    = f ? f.per100g.kcal : '';
  document.getElementById('f-protein').value = f ? f.per100g.protein : '';
  document.getElementById('f-carbs').value   = f ? f.per100g.carbs : '';
  document.getElementById('f-fat').value     = f ? f.per100g.fat : '';
  document.getElementById('f-serving').value = f ? f.servingSize : 100;
  
  // Custom unit fields
  const hasUnit = !!(f && f.unit);
  document.getElementById('f-unit-check').checked = hasUnit;
  document.getElementById('f-unit-fields').style.display = hasUnit ? 'grid' : 'none';
  document.getElementById('f-unit-label').value  = hasUnit ? f.unit.label : 'Stück';
  document.getElementById('f-unit-plural').value = hasUnit ? (f.unit.plural || f.unit.label) : 'Stück';
  document.getElementById('f-unit-g').value      = hasUnit ? f.unit.g : '';

  const pb = document.getElementById('food-photo-box');
  const d = document.getElementById('btn-del-food');
  if (pb) {
    pb.dataset.photo = f && f.photo ? f.photo : '';
    pb.innerHTML = f && f.photo
      ? `<img src="${f.photo}"><button class="photo-del" onclick="event.stopPropagation();document.getElementById('food-photo-box').dataset.photo='';document.getElementById('food-photo-box').innerHTML='<span>📸 Foto hinzufügen</span>'">✖</button>`
      : `<span>📸 Foto hinzufügen</span>`;
  }
  if (d) d.style.display = f ? 'block' : 'none';

  // OCR state resets
  document.getElementById('ocr-progress').style.display = 'none';
  document.getElementById('ocr-progress-bar').style.width = '0%';
  document.getElementById('ocr-status').textContent = '';

  openModal('modal-food');
}

document.getElementById('f-unit-check').addEventListener('change', e => {
  document.getElementById('f-unit-fields').style.display = e.target.checked ? 'grid' : 'none';
});

async function addPhoto(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const reader = new FileReader();
    reader.onload = async e => {
      const b64 = await resizeImage(e.target.result, 400); // 400px is enough for thumbnails
      if (!b64) return;
      const pb = document.getElementById('food-photo-box');
      pb.dataset.photo = b64;
      pb.innerHTML = `<img src="${b64}"><button class="photo-del" onclick="event.stopPropagation();document.getElementById('food-photo-box').dataset.photo='';document.getElementById('food-photo-box').innerHTML='<span>📸 Foto hinzufügen</span>'">✖</button>`;
    };
    reader.readAsDataURL(file);
  } catch (err) {}
}

async function handleOcrFiles(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const progressEl = document.getElementById('ocr-progress');
  const barEl = document.getElementById('ocr-progress-bar');
  const statusEl = document.getElementById('ocr-status');

  progressEl.style.display = 'block';
  barEl.style.width = '0%';
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
            barEl.style.width = `${p}%`;
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
      if (values.kcal)    document.getElementById('f-kcal').value    = values.kcal;
      if (values.protein) document.getElementById('f-protein').value = values.protein;
      if (values.carbs)   document.getElementById('f-carbs').value   = values.carbs;
      if (values.fat)     document.getElementById('f-fat').value     = values.fat;
      statusEl.textContent = 'Nährwerte erfolgreich extrahiert!';
      setTimeout(() => { progressEl.style.display = 'none'; }, 2000);
    } else {
       statusEl.textContent = 'Konnte keine Nährwerte im Text finden. Bitte manuell eingeben.';
       setTimeout(() => { progressEl.style.display = 'none'; }, 4000);
    }
  } catch (error) {
    console.error("OCR Error:", error);
    statusEl.textContent = 'Fehler bei der Texterkennung.';
    setTimeout(() => { progressEl.style.display = 'none'; }, 4000);
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
  const n = document.getElementById('f-name').value.trim();
  const k = parseFloat(document.getElementById('f-kcal').value);
  const p = parseFloat(document.getElementById('f-protein').value);
  const c = parseFloat(document.getElementById('f-carbs').value);
  const f = parseFloat(document.getElementById('f-fat').value);
  const s = parseFloat(document.getElementById('f-serving').value) || 100;
  if (!n || isNaN(k) || isNaN(p) || isNaN(c) || isNaN(f)) { alert('Bitte alle Felder (Name & Makros) ausfüllen.'); return; }

  let unit = null;
  if (document.getElementById('f-unit-check').checked) {
    const ul = document.getElementById('f-unit-label').value.trim();
    const up = document.getElementById('f-unit-plural').value.trim();
    const ug = parseFloat(document.getElementById('f-unit-g').value);
    if (!ul || isNaN(ug) || ug <= 0) { alert('Bitte gültige Einheit (Bezeichnung und Gewicht) eingeben.'); return; }
    unit = { label: ul, plural: up || ul, g: ug };
  }

  const pb = document.getElementById('food-photo-box');
  const photo = pb && pb.dataset.photo ? pb.dataset.photo : null;
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
