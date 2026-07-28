// ===== constants.js =====
// Global constants and config

const CONFIG = {
  PROTEIN_PER_KG: 1.8,
  FAT_PER_KG: 0.9,
  MIN_FAT_G: 40,
  MIN_CARBS_G: 30,
  CUT_FAT_MULTIPLIER: 0.88,
  CUT_FAT_MIN_PER_KG: 0.7,
  BULK_FAT_MULTIPLIER: 1.1,
  BULK_FAT_MAX_PER_KG: 1.1,
  SYNC_DEBOUNCE_MS: 1500,
  ACTIVITY_FACTORS: {
    1.2: 'Sitzend (wenig/kein Sport)',
    1.375: 'Leicht aktiv (1-3x/Woche)',
    1.55: 'Moderat aktiv (3-5x/Woche)',
    1.725: 'Sehr aktiv (6-7x/Woche)',
    1.9: 'Extrem aktiv (2x/Tag)',
  },
};

const THEMES = {
  violet:  { name: '💜 Royal Violett', accent: '#8b5cf6', accent2: '#6366f1', accent3: '#3b82f6', glow: 'rgba(139,92,246,0.45)' },
  cyan:    { name: '⚡ Electric Cyan',  accent: '#06b6d4', accent2: '#3b82f6', accent3: '#0284c7', glow: 'rgba(6,182,212,0.45)' },
  emerald: { name: '🌿 Smaragd Grün', accent: '#10b981', accent2: '#059669', accent3: '#047857', glow: 'rgba(16,185,129,0.45)' },
  rose:    { name: '🌹 Sunset Rose',   accent: '#f43f5e', accent2: '#e11d48', accent3: '#be123c', glow: 'rgba(244,63,94,0.45)' },
  amber:   { name: '🥇 Premium Gold',  accent: '#f59e0b', accent2: '#d97706', accent3: '#b45309', glow: 'rgba(245,158,11,0.45)' },
};

const FASTING_PLANS = {
  '16:8':  { name: '16:8 (Standard)', fastHours: 16, eatHours: 8,  desc: 'Beliebtester Plan für Fettabbau & Wohlbefinden' },
  '18:6':  { name: '18:6 (Intensiv)', fastHours: 18, eatHours: 6,  desc: 'Erweiterte Autophagie & schnellere Fettverbrennung' },
  '20:4':  { name: '20:4 (Warrior)', fastHours: 20, eatHours: 4,  desc: 'Krieger-Diät mit kurzem Essensfenster' },
  '14:10': { name: '14:10 (Sanft)',   fastHours: 14, eatHours: 10, desc: 'Perfekt für Einsteiger & sanften Start' },
};

const MACRO_STRATEGIES = {
  balanced:     { name: '⚖️ Ausgewogen',     proteinPct: 30, carbsPct: 40, fatPct: 30 },
  high_protein: { name: '💪 Muskelaufbau',    proteinPct: 40, carbsPct: 35, fatPct: 25 },
  low_carb:     { name: '🥑 Low Carb',        proteinPct: 35, carbsPct: 20, fatPct: 45 },
  keto:         { name: '🥩 Ketogen',         proteinPct: 30, carbsPct: 5,  fatPct: 65 },
  endurance:    { name: '🏃 Ausdauer / Carb', proteinPct: 25, carbsPct: 55, fatPct: 20 },
};

const MEALS = [
  { id: 'fruehstueck',  label: 'Frühstück',   emoji: '🌅' },
  { id: 'hauptspeise',  label: 'Hauptspeise',  emoji: '🍽️' },
  { id: 'snack',        label: 'Snack',         emoji: '🍎' },
];

const USERS_KEY  = 'mt-users';      // [{ id, name, emoji, pinHash }]
const LEGACY_KEY = 'macro-tracker'; // alte Single-User-Daten
const PENDING_NAME_KEY = 'mt-pending-profile-name'; // bei Registrierung gemerkter Profilname
const BACKUP_DB = {
  foods: [
    { id: "4ve5r6j0lzimqi69pww", name: "Sandwich Lidl", photo: "data:image/jpeg;base64,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",
      per100g: { kcal: 226, protein: 14.4, carbs: 23.6, fat: 7.9 },
      servingSize: 300,
      unit: null
    },
    {
      id: "01mgzybrfyx8mr20sfuu",
      name: "Caffe Latte Edeka Protein",
      photo: null,
      per100g: { kcal: 54, protein: 8, carbs: 5.3, fat: 0.1 },
      servingSize: 263,
      unit: null
    },
    {
      id: "arft9rfu0ummr2lxle8",
      name: "Egg White Edeka",
      photo: null,
      per100g: { kcal: 45, protein: 10.2, carbs: 1, fat: 0 },
      servingSize: 100,
      unit: null
    },
    {
      id: "mmdln4y0hkmr2m4f92",
      name: "Proteinpuver DM neutraler Geschmack",
      photo: null,
      per100g: { kcal: 375, protein: 87, carbs: 4, fat: 0.9 },
      servingSize: 25,
      unit: null
    },
    {
      id: "0yj125tyu72mr4q0ydx",
      name: "Sandwich Thun Edeka",
      photo: null,
      per100g: { kcal: 216, protein: 11.1, carbs: 19.4, fat: 10.1 },
      servingSize: 185,
      unit: null
    },
    {
      id: "1gonjofu7z3mr4q247g",
      name: "Danone YoPro 23g Protein",
      photo: null,
      per100g: { kcal: 60, protein: 8.35, carbs: 5.5, fat: 0.5 },
      servingSize: 270,
      unit: null
    },
    {
      id: "yrt9egwxy7amr6h3udw",
      name: "ja! Körniger Frischkäse Leicht 200g",
      photo: null,
      per100g: { kcal: 72, protein: 12.7, carbs: 4, fat: 0.4 },
      servingSize: 60,
      unit: null
    },
    {
      id: "pdi7mq2witemr6h6rpn",
      name: "Exquisa Frischkäse Fitline Natur 200g",
      photo: null,
      per100g: { kcal: 62, protein: 10.4, carbs: 3.5, fat: 0.2 },
      servingSize: 60,
      unit: null
    },
    {
      id: "4hz3o0o4idtmrdmchgt",
      name: "Amerikan Sandwich Vollkorn",
      photo: null,
      per100g: { kcal: 256, protein: 8.5, carbs: 42, fat: 4.6 },
      servingSize: 37.5,
      unit: null
    }
  ],
  log: {
    "2026-06-17": [
      { fat: 29, kcal: 481, meal: "fruehstueck", carbs: 31.3, amount: 185, foodId: "4ve5r6j0lzimqi69pww", protein: 21.8 },
      { fat: 12.8, kcal: 455, meal: "hauptspeise", carbs: 72, amount: 150, foodId: "0n301rpirrwmqid8tp0", protein: 11.4 },
      { fat: 0.2, kcal: 22, meal: "hauptspeise", carbs: 4.2, amount: 120, foodId: "m82lwoiy7j9mqidgsyk", protein: 1.1 },
      { fat: 0.1, kcal: 44, meal: "hauptspeise", carbs: 9.9, amount: 110, foodId: "xrv4ykf60rgmqidgq6o", protein: 1.2 },
      { fat: 45, kcal: 585, meal: "hauptspeise", carbs: 0, amount: 250, foodId: "j221mhblehmqid7ull", protein: 45 },
      { fat: 6.5, kcal: 74, meal: "hauptspeise", carbs: 0.2, amount: 30, foodId: "1mhpq99axmvmqid2hvt", protein: 3.9 },
      { fat: 1, kcal: 280, meal: "snack", carbs: 22.5, amount: 500, foodId: "v5dew5mzlkjmqid3yqo", protein: 44.5 },
      { fat: 0.3, kcal: 98, meal: "snack", carbs: 25.3, amount: 110, foodId: "thsyodtyo3mqidgkom", protein: 1.2 },
      { fat: 0.3, kcal: 78, meal: "snack", carbs: 21, amount: 150, foodId: "adv7931koummqidgk18", protein: 0.5 },
      { fat: 2.3, kcal: 92, meal: "hauptspeise", carbs: 9, amount: 150, foodId: "n3twa9r9p3smqid4r85", protein: 7.5 }
    ],
    "2026-06-18": [
      { fat: 45, kcal: 585, meal: "hauptspeise", carbs: 0, amount: 250, foodId: "j221mhblehmqid7ull", protein: 45 },
      { fat: 12.8, kcal: 455, meal: "hauptspeise", carbs: 72, amount: 150, foodId: "0n301rpirrwmqid8tp0", protein: 11.4 },
      { fat: 2.3, kcal: 92, meal: "hauptspeise", carbs: 9, amount: 150, foodId: "n3twa9r9p3smqid4r85", protein: 7.5 },
      { fat: 0.1, kcal: 40, meal: "hauptspeise", carbs: 9, amount: 100, foodId: "xrv4ykf60rgmqidgq6o", protein: 1.1 },
      { fat: 0.2, kcal: 18, meal: "hauptspeise", carbs: 3.5, amount: 100, foodId: "m82lwoiy7j9mqidgsyk", protein: 0.9 },
      { fat: 6.5, kcal: 74, meal: "hauptspeise", carbs: 0.2, amount: 30, foodId: "1mhpq99axmvmqid2hvt", protein: 3.9 },
      { fat: 1, kcal: 280, meal: "snack", carbs: 22.5, amount: 500, foodId: "v5dew5mzlkjmqid3yqo", protein: 44.5 },
      { fat: 0.2, kcal: 71, meal: "snack", carbs: 18.4, amount: 80, foodId: "thsyodtyo3mqidgkom", protein: 0.9 },
      { fat: 0.3, kcal: 78, meal: "snack", carbs: 21, amount: 150, foodId: "adv7931koummqidgk18", protein: 0.5 },
      { fat: 0.8, kcal: 98, meal: "fruehstueck", carbs: 0, amount: 150, foodId: "eu6aqjlnar8mqk1okkc", protein: 22.5 },
      { fat: 0.1, kcal: 17, meal: "fruehstueck", carbs: 0.2, units: 1, amount: 33, foodId: "rlswcd1yi2mqk3g0a1", protein: 3.6, unitLabel: "Eiweiß", unitPlural: "Eiweiß" },
      { fat: 5, kcal: 70, meal: "fruehstueck", carbs: 0.5, amount: 45, foodId: "m5jkircmsrmqideerr", protein: 5.9 },
      { fat: 11, kcal: 268, meal: "fruehstueck", carbs: 15.8, amount: 100, foodId: "nepjnudshfmqk3ihxz", protein: 23 }
    ],
    "2026-06-19": [],
    "2026-06-27": [
      { foodId: "bm4kgq6i1fbmqwvvpnr", amount: 20, meal: "snack", kcal: 75, protein: 14.4, carbs: 1.6, fat: 1.1 },
      { foodId: "aknah8d4cemqwvya9g", amount: 50, meal: "snack", kcal: 24, protein: 1.7, carbs: 2.5, fat: 0.8 },
      { foodId: "avnwb119i68mqwvzrrd", amount: 70, meal: "snack", kcal: 43, protein: 7.7, carbs: 2.8, fat: 0.1 },
      { foodId: "dnk6e2xb38nmqww2dhn", amount: 240, meal: "hauptspeise", kcal: 386, protein: 41.8, carbs: 1.7, fat: 23.5 },
      { foodId: "34dyyvbh875mqww4yz2", amount: 50, meal: "hauptspeise", kcal: 209, protein: 12.5, carbs: 0.2, fat: 11 },
      { foodId: "0n301rpirrwmqid8tp0", amount: 130, meal: "hauptspeise", kcal: 394, protein: 9.9, carbs: 62.4, fat: 11.1 },
      { foodId: "m82lwoiy7j9mqidgsyk", amount: 80, meal: "hauptspeise", kcal: 14, protein: 0.7, carbs: 2.8, fat: 0.2 },
      { foodId: "xrv4ykf60rgmqidgq6o", amount: 50, meal: "hauptspeise", kcal: 20, protein: 0.6, carbs: 4.5, fat: 0.1 },
      { foodId: "n3twa9r9p3smqid4r85", amount: 90, meal: "hauptspeise", kcal: 55, protein: 4.5, carbs: 5.4, fat: 1.4 },
      { foodId: "pea9ke6vl4nmqww9hyc", amount: 800, meal: "fruehstueck", kcal: 400, protein: 4, carbs: 104, fat: 0.8 }
    ],
    "2026-06-28": [
      { foodId: "efvm6qri61umqxy7ike", amount: 280, meal: "fruehstueck", kcal: 123, protein: 2.2, carbs: 25.2, fat: 0.3 },
      { foodId: "q4qdpca9g8cmqxy8ag0", amount: 240, meal: "fruehstueck", kcal: 132, protein: 2.6, carbs: 29.8, fat: 0.7 },
      { foodId: "m5jkircmsrmqideerr", amount: 216, meal: "fruehstueck", kcal: 335, protein: 28.1, carbs: 2.4, fat: 23.8 },
      { foodId: "1mhpq99axmvmqid2hvt", amount: 40, meal: "fruehstueck", kcal: 99, protein: 5.2, carbs: 0.2, fat: 8.6 },
      { foodId: "34dyyvbh875mqww4yz2", amount: 25, meal: "fruehstueck", kcal: 104, protein: 6.3, carbs: 0.1, fat: 5.5 },
      { foodId: "bm4kgq6i1fbmqwvvpnr", amount: 29, meal: "fruehstueck", kcal: 109, protein: 20.9, carbs: 2.4, fat: 1.7 },
      { foodId: "aknah8d4cemqwvya9g", amount: 250, meal: "fruehstueck", kcal: 118, protein: 8.5, carbs: 12.3, fat: 3.8 },
      { foodId: "iqumjwt6u4mqy6duy0", amount: 62, meal: "fruehstueck", kcal: 182, protein: 11.2, carbs: 22.9, fat: 4.3 }
    ],
    "2026-06-29": [
      { foodId: "q4qdpca9g8cmqxy8ag0", amount: 112, meal: "snack", kcal: 62, protein: 1.2, carbs: 13.9, fat: 0.3 },
      { foodId: "avnwb119i68mqwvzrrd", amount: 100, meal: "snack", kcal: 62, protein: 11, carbs: 4, fat: 0.2 },
      { foodId: "efvm6qri61umqxy7ike", amount: 115, meal: "snack", kcal: 51, protein: 0.9, carbs: 10.4, fat: 0.1 },
      { foodId: "m5jkircmsrmqideerr", amount: 216, meal: "fruehstueck", kcal: 335, protein: 28.1, carbs: 2.4, fat: 23.8 },
      { foodId: "bm4kgq6i1fbmqwvvpnr", amount: 29, meal: "fruehstueck", kcal: 109, protein: 20.9, carbs: 2.4, fat: 1.7 },
      { foodId: "aknah8d4cemqwvya9g", amount: 180, meal: "fruehstueck", kcal: 85, protein: 6.1, carbs: 8.8, fat: 2.7 },
      { foodId: "iqumjwt6u4mqy6duy0", amount: 62, meal: "fruehstueck", kcal: 182, protein: 11.2, carbs: 22.9, fat: 4.3 },
      { foodId: "oxgfi3700kmqzbulp7", amount: 6, meal: "fruehstueck", kcal: 43, protein: 0.1, carbs: 0, fat: 4.9 },
      { foodId: "1mhpq99axmvmqid2hvt", amount: 18, meal: "fruehstueck", kcal: 45, protein: 2.3, carbs: 0.1, fat: 3.9 },
      { foodId: "se5tljfr0z9mqzbwdsj", amount: 33, meal: "fruehstueck", kcal: 86, protein: 9.2, carbs: 0, fat: 5.3 },
      { foodId: "87anuuotrscmqww64y5", amount: 64, meal: "fruehstueck", kcal: 106, protein: 13.1, carbs: 1, fat: 5.4 },
      { foodId: "v5dew5mzlkjmqid3yqo", amount: 150, meal: "snack", kcal: 84, protein: 13.4, carbs: 6.8, fat: 0.3 },
      { foodId: "avnwb119i68mqwvzrrd", amount: 150, meal: "snack", kcal: 93, protein: 16.5, carbs: 6, fat: 0.3 },
      { foodId: "q4qdpca9g8cmqxy8ag0", amount: 100, meal: "snack", kcal: 55, protein: 1.1, carbs: 12.4, fat: 0.3 },
      { foodId: "efvm6qri61umqxy7ike", amount: 120, meal: "snack", kcal: 53, protein: 1, carbs: 10.8, fat: 0.1 },
      { foodId: "thsyodtyo3mqidgkom", amount: 80, meal: "snack", kcal: 71, protein: 0.9, carbs: 18.4, fat: 0.2 },
      { foodId: "adv7931koummqidgk18", amount: 112, meal: "snack", kcal: 58, protein: 0.3, carbs: 15.7, fat: 0.2 },
      { foodId: "03v1xlglf0vimqidotay", amount: 80, meal: "hauptspeise", kcal: 280, protein: 6.4, carbs: 62.4, fat: 0.4 }
    ],
    "2026-06-30": [],
    "2026-07-01": [
      { foodId: "1oyqkkoaozmmr20rd6a", amount: 300, meal: "fruehstueck", kcal: 678, protein: 43.2, carbs: 70.8, fat: 23.7 },
      { foodId: "01mgzybrfyx8mr20sfuu", amount: 263, meal: "fruehstueck", kcal: 142, protein: 21, carbs: 13.9, fat: 0.3 },
      { foodId: "m5jkircmsrmqideerr", amount: 60, meal: "hauptspeise", kcal: 93, protein: 7.8, carbs: 0.7, fat: 6.6 },
      { foodId: "arft9rfu0ummr2lxle8", amount: 100, meal: "hauptspeise", kcal: 45, protein: 10.2, carbs: 1, fat: 0 },
      { foodId: "87anuuotrscmqww64y5", amount: 125, meal: "hauptspeise", kcal: 206, protein: 25.6, carbs: 1.9, fat: 10.6 },
      { foodId: "1mhpq99axmvmqid2hvt", amount: 17, meal: "hauptspeise", kcal: 42, protein: 2.2, carbs: 0.1, fat: 3.7 },
      { foodId: "aknah8d4cemqwvya9g", amount: 150, meal: "hauptspeise", kcal: 71, protein: 5.1, carbs: 7.4, fat: 2.3 },
      { foodId: "mmdln4y0hkmr2m4f92", amount: 25, meal: "hauptspeise", kcal: 94, protein: 21.8, carbs: 1, fat: 0.2 }
    ],
    "2026-07-02": [
      { foodId: "v5dew5mzlkjmqid3yqo", amount: 500, meal: "fruehstueck", kcal: 280, protein: 44.5, carbs: 22.5, fat: 1 },
      { foodId: "efvm6qri61umqxy7ike", amount: 70, meal: "fruehstueck", kcal: 31, protein: 0.6, carbs: 6.3, fat: 0.1 },
      { foodId: "m5jkircmsrmqideerr", amount: 113, meal: "fruehstueck", kcal: 175, protein: 14.7, carbs: 1.2, fat: 12.4 },
      { foodId: "arft9rfu0ummr2lxle8", amount: 100, meal: "fruehstueck", kcal: 45, protein: 10.2, carbs: 1, fat: 0 },
      { foodId: "nepjnudshfmqk3ihxz", amount: 100, meal: "fruehstueck", kcal: 268, protein: 23, carbs: 15.8, fat: 11 },
      { foodId: "87anuuotrscmqww64y5", amount: 125, meal: "fruehstueck", kcal: 206, protein: 25.6, carbs: 1.9, fat: 10.6 },
      { foodId: "m82lwoiy7j9mqidgsyk", amount: 120, meal: "fruehstueck", kcal: 22, protein: 1.1, carbs: 4.2, fat: 0.2 },
      { foodId: "se5tljfr0z9mqzbwdsj", amount: 33, meal: "fruehstueck", kcal: 86, protein: 9.2, carbs: 0, fat: 5.3 },
      { foodId: "34dyyvbh875mqww4yz2", amount: 17, meal: "fruehstueck", kcal: 71, protein: 4.3, carbs: 0.1, fat: 3.7 }
    ],
    "2026-07-03": [
      { foodId: "1gonjofu7z3mr4q247g", amount: 270, meal: "fruehstueck", kcal: 162, protein: 22.5, carbs: 14.9, fat: 1.4 },
      { foodId: "0yj125tyu72mr4q0ydx", amount: 185, meal: "fruehstueck", kcal: 400, protein: 20.5, carbs: 35.9, fat: 18.7 }
    ],
    "2026-07-04": [
      { foodId: "nepjnudshfmqk3ihxz", amount: 100, meal: "fruehstueck", kcal: 268, protein: 23, carbs: 15.8, fat: 11 },
      { foodId: "m5jkircmsrmqideerr", amount: 120, meal: "fruehstueck", kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 },
      { foodId: "yrt9egwxy7amr6h3udw", amount: 60, meal: "fruehstueck", kcal: 43, protein: 7.6, carbs: 2.4, fat: 0.2 },
      { foodId: "pdi7mq2witemr6h6rpn", amount: 60, meal: "fruehstueck", kcal: 37, protein: 6.2, carbs: 2.1, fat: 0.1 }
    ],
    "2026-07-09": [
      { foodId: "4hz3o0o4idtmrdmchgt", amount: 75, meal: "fruehstueck", kcal: 192, protein: 6.4, carbs: 31.5, fat: 3.5 }
    ]
  },
  goals: { kcal: 2382, protein: 191, carbs: 216, fat: 84 },
  profile: {
    age: 20,
    diet: { kcal: 2382, protein: 191, carbs: 216, fat: 84 },
    goal: "cut",
    delta: 500,
    gender: "m",
    height: 181,
    weight: 106,
    activity: 1.375,
    maintenance: { kcal: 2882, protein: 191, carbs: 316, fat: 95 }
  },
  weights: [
    { kg: 113, date: "2026-06-19" },
    { date: "2026-06-28", kg: 110 },
    { date: "2026-07-21", kg: 108 },
    { date: "2026-07-27", kg: 106 }
  ]
};

const EMPTY_DB   = () => JSON.parse(JSON.stringify(BACKUP_DB));
const AVATARS    = ['🙂','💪','🏃','🥗','🔥','⭐','🦁','🐻','🦊','🐱','🦄','🌸','🏆','🎯','🚀','🍎','🥑','🧗'];

const TOTAL_STEPS = 6;

const API_BASE = 'https://macro-tracker-production-2915.up.railway.app';
const SUPABASE_URL = 'https://pxeejfowdivavcqbigsc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4ZWVqZm93ZGl2YXZjcWJpZ3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTgzNzUsImV4cCI6MjA5NzM5NDM3NX0.af19l5t-EMvmuw-UyGP0yRNUJ5pRV7uqHe73fbDy1_g';
const REDIRECT_URL = window.location.origin + window.location.pathname;

const PRESET_CATS = [
  { id: 'all',      label: '🍽️ Alle'            },
  { id: 'fleisch',  label: '🥩 Fleisch'          },
  { id: 'fisch',    label: '🐟 Fisch'            },
  { id: 'milch',    label: '🥛 Milch & Ei'       },
  { id: 'getreide', label: '🌾 Getreide & Stärke'},
  { id: 'huelsen',  label: '🫘 Hülsenfrüchte'    },
  { id: 'gemuese',  label: '🥦 Gemüse'           },
  { id: 'obst',     label: '🍎 Obst'             },
  { id: 'fette',    label: '🥑 Fette & Nüsse'    },
  { id: 'sonstiges',label: '🍯 Sonstiges'        },
];

const PRESETS = [
  // ══════ FLEISCH ══════════════════════════════════
  { name:'Hühnerbrust (roh)',        cat:'fleisch', emoji:'🍗', serving:150, per100g:{ kcal:110, protein:23,  carbs:0,    fat:1.2 } },
  { name:'Hähnchenschenkel (roh)',   cat:'fleisch', emoji:'🍗', serving:150, per100g:{ kcal:177, protein:18,  carbs:0,    fat:11  } },
  { name:'Putenbrust (roh)',         cat:'fleisch', emoji:'🦃', serving:150, per100g:{ kcal:99,  protein:22,  carbs:0,    fat:1   } },
  { name:'Rindersteak (roh)',        cat:'fleisch', emoji:'🥩', serving:150, per100g:{ kcal:217, protein:26,  carbs:0,    fat:12  } },
  { name:'Rinderhack (20% Fett)',    cat:'fleisch', emoji:'🥩', serving:120, per100g:{ kcal:254, protein:17,  carbs:0,    fat:20  } },
  { name:'Rinderhack (5% Fett)',     cat:'fleisch', emoji:'🥩', serving:120, per100g:{ kcal:137, protein:22,  carbs:0,    fat:5   } },
  { name:'Schweinefilet (roh)',      cat:'fleisch', emoji:'🥩', serving:150, per100g:{ kcal:143, protein:22,  carbs:0,    fat:6   } },
  { name:'Schweinekotelett (roh)',   cat:'fleisch', emoji:'🥩', serving:150, per100g:{ kcal:215, protein:21,  carbs:0,    fat:14  } },
  { name:'Lammkeule (roh)',          cat:'fleisch', emoji:'🥩', serving:150, per100g:{ kcal:191, protein:22,  carbs:0,    fat:11  } },
  { name:'Ribeye Steak (roh)',       cat:'fleisch', emoji:'🥩', serving:200, per100g:{ kcal:289, protein:24,  carbs:0,    fat:21  } },
  { name:'Kalbsschnitzel (roh)',     cat:'fleisch', emoji:'🥩', serving:150, per100g:{ kcal:109, protein:21,  carbs:0,    fat:2.7 } },
  { name:'Speck (geräuchert)',       cat:'fleisch', emoji:'🥓', serving:30,  per100g:{ kcal:541, protein:37,  carbs:0.7,  fat:42  } },
  { name:'Salami',                   cat:'fleisch', emoji:'🥩', serving:30,  per100g:{ kcal:425, protein:22,  carbs:1,    fat:37  } },
  { name:'Hähnchen-Aufschnitt',      cat:'fleisch', emoji:'🍗', serving:50,  per100g:{ kcal:105, protein:18,  carbs:1,    fat:3.2 } },
  { name:'Tofu (natur)',             cat:'fleisch', emoji:'🧊', serving:150, per100g:{ kcal:76,  protein:8,   carbs:1.9,  fat:4.8 } },
  { name:'Tempeh',                   cat:'fleisch', emoji:'🧊', serving:100, per100g:{ kcal:193, protein:19,  carbs:9,    fat:11  } },

  // ══════ FISCH ════════════════════════════════════
  { name:'Lachs (roh)',              cat:'fisch',   emoji:'🐟', serving:150, per100g:{ kcal:208, protein:20,  carbs:0,    fat:13  } },
  { name:'Lachs (geräuchert)',       cat:'fisch',   emoji:'🐟', serving:80,  per100g:{ kcal:179, protein:25,  carbs:0,    fat:9   } },
  { name:'Thunfisch (Dose, Natur)',  cat:'fisch',   emoji:'🐟', serving:100, per100g:{ kcal:116, protein:26,  carbs:0,    fat:1   } },
  { name:'Thunfisch (Dose, Öl)',     cat:'fisch',   emoji:'🐟', serving:80,  per100g:{ kcal:198, protein:25,  carbs:0,    fat:11  } },
  { name:'Kabeljau / Dorsch (roh)',  cat:'fisch',   emoji:'🐟', serving:150, per100g:{ kcal:82,  protein:18,  carbs:0,    fat:0.7 } },
  { name:'Tilapia (roh)',            cat:'fisch',   emoji:'🐟', serving:150, per100g:{ kcal:96,  protein:20,  carbs:0,    fat:2   } },
  { name:'Forelle (roh)',            cat:'fisch',   emoji:'🐟', serving:150, per100g:{ kcal:141, protein:20,  carbs:0,    fat:6   } },
  { name:'Makrele (roh)',            cat:'fisch',   emoji:'🐟', serving:150, per100g:{ kcal:205, protein:19,  carbs:0,    fat:14  } },
  { name:'Hering (roh)',             cat:'fisch',   emoji:'🐟', serving:100, per100g:{ kcal:158, protein:18,  carbs:0,    fat:9   } },
  { name:'Sardinen (Dose, Öl)',      cat:'fisch',   emoji:'🐟', serving:80,  per100g:{ kcal:208, protein:25,  carbs:0,    fat:11  } },
  { name:'Garnelen (roh)',           cat:'fisch',   emoji:'🦐', serving:120, per100g:{ kcal:85,  protein:20,  carbs:0.9,  fat:0.5 } },
  { name:'Muscheln (gekocht)',       cat:'fisch',   emoji:'🦪', serving:100, per100g:{ kcal:86,  protein:12,  carbs:3.7,  fat:2.2 } },

  // ══════ MILCH & EI ═══════════════════════════════
  { name:'Vollei',                   cat:'milch',   emoji:'🥚', serving:60,  per100g:{ kcal:155, protein:13,  carbs:1.1,  fat:11  }, unit:{label:'Ei',plural:'Eier',g:60} },
  { name:'Eiweiß (nur)',             cat:'milch',   emoji:'🥚', serving:35,  per100g:{ kcal:52,  protein:11,  carbs:0.7,  fat:0.2 }, unit:{label:'Eiweiß',plural:'Eiweiß',g:33} },
  { name:'Eigelb',                   cat:'milch',   emoji:'🥚', serving:18,  per100g:{ kcal:322, protein:16,  carbs:3.6,  fat:27  }, unit:{label:'Eigelb',plural:'Eigelb',g:18} },
  { name:'Vollmilch (3,5%)',         cat:'milch',   emoji:'🥛', serving:250, per100g:{ kcal:61,  protein:3.3, carbs:4.8,  fat:3.3 }, unit:{label:'Glas',plural:'Gläser',g:250} },
  { name:'Halbfettmilch (1,5%)',     cat:'milch',   emoji:'🥛', serving:250, per100g:{ kcal:46,  protein:3.4, carbs:4.8,  fat:1.5 }, unit:{label:'Glas',plural:'Gläser',g:250} },
  { name:'Magerquark (0,2%)',        cat:'milch',   emoji:'🫙', serving:200, per100g:{ kcal:67,  protein:12,  carbs:4,    fat:0.2 } },
  { name:'Griechischer Joghurt',     cat:'milch',   emoji:'🫙', serving:200, per100g:{ kcal:97,  protein:9,   carbs:4,    fat:5   } },
  { name:'Naturjoghurt (3,5%)',      cat:'milch',   emoji:'🫙', serving:150, per100g:{ kcal:62,  protein:3.5, carbs:4.8,  fat:3.5 } },
  { name:'Skyr',                     cat:'milch',   emoji:'🫙', serving:200, per100g:{ kcal:63,  protein:11,  carbs:4,    fat:0.2 } },
  { name:'Hüttenkäse',               cat:'milch',   emoji:'🫙', serving:150, per100g:{ kcal:98,  protein:11,  carbs:3.4,  fat:4.3 } },
  { name:'Frischkäse (Doppelrahm)', cat:'milch',   emoji:'🧀', serving:30,  per100g:{ kcal:342, protein:6.5, carbs:2.5,  fat:34  } },
  { name:'Frischkäse (Light)',       cat:'milch',   emoji:'🧀', serving:30,  per100g:{ kcal:120, protein:7,   carbs:3,    fat:9   } },
  { name:'Ricotta',                  cat:'milch',   emoji:'🧀', serving:100, per100g:{ kcal:174, protein:11,  carbs:3,    fat:13  } },
  { name:'Mozzarella',               cat:'milch',   emoji:'🧀', serving:125, per100g:{ kcal:280, protein:22,  carbs:2,    fat:21  }, unit:{label:'Kugel',plural:'Kugeln',g:125} },
  { name:'Gouda (45%)',              cat:'milch',   emoji:'🧀', serving:30,  per100g:{ kcal:356, protein:25,  carbs:2.2,  fat:27  } },
  { name:'Parmesan',                 cat:'milch',   emoji:'🧀', serving:15,  per100g:{ kcal:431, protein:38,  carbs:3.2,  fat:29  } },
  { name:'Feta',                     cat:'milch',   emoji:'🧀', serving:50,  per100g:{ kcal:264, protein:14,  carbs:4.1,  fat:21  } },
  { name:'Whey Protein (Isolat)',    cat:'milch',   emoji:'💪', serving:30,  per100g:{ kcal:370, protein:80,  carbs:5,    fat:4   } },
  { name:'Casein Protein',           cat:'milch',   emoji:'💪', serving:30,  per100g:{ kcal:380, protein:80,  carbs:5,    fat:3   } },

  // ══════ GETREIDE & STÄRKE ════════════════════════
  { name:'Haferflocken (kernig)',    cat:'getreide',emoji:'🌾', serving:80,  per100g:{ kcal:368, protein:13,  carbs:58,   fat:7   } },
  { name:'Basmati Reis (roh)',       cat:'getreide',emoji:'🍚', serving:80,  per100g:{ kcal:350, protein:8,   carbs:78,   fat:0.5 } },
  { name:'Basmati Reis (gekocht)',   cat:'getreide',emoji:'🍚', serving:200, per100g:{ kcal:130, protein:3,   carbs:28,   fat:0.2 } },
  { name:'Jasminreis (roh)',         cat:'getreide',emoji:'🍚', serving:80,  per100g:{ kcal:360, protein:7,   carbs:80,   fat:0.5 } },
  { name:'Weißer Reis (roh)',        cat:'getreide',emoji:'🍚', serving:80,  per100g:{ kcal:365, protein:7,   carbs:79,   fat:0.7 } },
  { name:'Vollkornreis (roh)',       cat:'getreide',emoji:'🍚', serving:80,  per100g:{ kcal:362, protein:8,   carbs:76,   fat:2.7 } },
  { name:'Quinoa (roh)',             cat:'getreide',emoji:'🌾', serving:80,  per100g:{ kcal:368, protein:14,  carbs:64,   fat:6   } },
  { name:'Quinoa (gekocht)',         cat:'getreide',emoji:'🌾', serving:200, per100g:{ kcal:120, protein:4.4, carbs:22,   fat:2   } },
  { name:'Couscous (roh)',           cat:'getreide',emoji:'🌾', serving:80,  per100g:{ kcal:376, protein:13,  carbs:72,   fat:1.7 } },
  { name:'Couscous (gekocht)',       cat:'getreide',emoji:'🌾', serving:200, per100g:{ kcal:112, protein:3.8, carbs:23,   fat:0.2 } },
  { name:'Hirse (roh)',              cat:'getreide',emoji:'🌾', serving:80,  per100g:{ kcal:378, protein:11,  carbs:72,   fat:4   } },
  { name:'Buchweizen (roh)',         cat:'getreide',emoji:'🌾', serving:80,  per100g:{ kcal:343, protein:13,  carbs:72,   fat:3.4 } },
  { name:'Bulgur (roh)',             cat:'getreide',emoji:'🌾', serving:80,  per100g:{ kcal:342, protein:12,  carbs:68,   fat:1.3 } },
  { name:'Pasta (roh)',              cat:'getreide',emoji:'🍝', serving:80,  per100g:{ kcal:356, protein:12,  carbs:70,   fat:1.5 } },
  { name:'Vollkornpasta (roh)',      cat:'getreide',emoji:'🍝', serving:80,  per100g:{ kcal:342, protein:13,  carbs:65,   fat:2.5 } },
  { name:'Kartoffel',                cat:'getreide',emoji:'🥔', serving:200, per100g:{ kcal:77,  protein:2,   carbs:17,   fat:0.1 }, unit:{label:'Kartoffel',plural:'Kartoffeln',g:120} },
  { name:'Süßkartoffel',             cat:'getreide',emoji:'🍠', serving:200, per100g:{ kcal:86,  protein:1.6, carbs:20,   fat:0.1 }, unit:{label:'Süßkartoffel',plural:'Süßkartoffeln',g:130} },
  { name:'Toastbrot',                cat:'getreide',emoji:'🍞', serving:30,  per100g:{ kcal:265, protein:8,   carbs:50,   fat:3   }, unit:{label:'Scheibe',plural:'Scheiben',g:30} },
  { name:'Vollkornbrot',             cat:'getreide',emoji:'🍞', serving:50,  per100g:{ kcal:247, protein:9,   carbs:43,   fat:3.3 }, unit:{label:'Scheibe',plural:'Scheiben',g:45} },
  { name:'Pumpernickel',             cat:'getreide',emoji:'🍞', serving:50,  per100g:{ kcal:218, protein:6.4, carbs:44,   fat:1.2 }, unit:{label:'Scheibe',plural:'Scheiben',g:50} },
  { name:'Bagel',                    cat:'getreide',emoji:'🥯', serving:100, per100g:{ kcal:250, protein:9.8, carbs:49,   fat:1.6 }, unit:{label:'Bagel',plural:'Bagels',g:100} },
  { name:'Tortilla (Weizen)',        cat:'getreide',emoji:'🫓', serving:50,  per100g:{ kcal:306, protein:8,   carbs:53,   fat:7   }, unit:{label:'Tortilla',plural:'Tortillas',g:50} },
  { name:'Cornflakes (natur)',       cat:'getreide',emoji:'🥣', serving:40,  per100g:{ kcal:357, protein:6.6, carbs:84,   fat:0.9 } },
  { name:'Weizenmehl (Type 405)',    cat:'getreide',emoji:'🌾', serving:50,  per100g:{ kcal:347, protein:10,  carbs:72,   fat:1.2 } },
  { name:'Dinkelmehl',               cat:'getreide',emoji:'🌾', serving:50,  per100g:{ kcal:335, protein:14,  carbs:61,   fat:2.5 } },

  // ══════ HÜLSENFRÜCHTE ════════════════════════════
  { name:'Linsen (roh)',             cat:'huelsen', emoji:'🫘', serving:80,  per100g:{ kcal:353, protein:25,  carbs:60,   fat:1.4 } },
  { name:'Linsen (gekocht)',         cat:'huelsen', emoji:'🫘', serving:150, per100g:{ kcal:116, protein:9,   carbs:20,   fat:0.4 } },
  { name:'Kichererbsen (roh)',       cat:'huelsen', emoji:'🫘', serving:80,  per100g:{ kcal:364, protein:19,  carbs:61,   fat:6   } },
  { name:'Kichererbsen (gekocht)',   cat:'huelsen', emoji:'🫘', serving:150, per100g:{ kcal:164, protein:8.9, carbs:27,   fat:2.6 } },
  { name:'Kidneybohnen (gekocht)',   cat:'huelsen', emoji:'🫘', serving:150, per100g:{ kcal:127, protein:8.7, carbs:23,   fat:0.5 } },
  { name:'Schwarze Bohnen (gekocht)',cat:'huelsen', emoji:'🫘', serving:150, per100g:{ kcal:132, protein:8.9, carbs:24,   fat:0.5 } },
  { name:'Weiße Bohnen (gekocht)',   cat:'huelsen', emoji:'🫘', serving:150, per100g:{ kcal:118, protein:7.7, carbs:22,   fat:0.3 } },
  { name:'Edamame (gegart)',         cat:'huelsen', emoji:'🫘', serving:150, per100g:{ kcal:122, protein:11,  carbs:10,   fat:5   } },
  { name:'Erbsen (TK, gegart)',      cat:'huelsen', emoji:'🫛', serving:150, per100g:{ kcal:72,  protein:5.5, carbs:12,   fat:0.4 } },
  { name:'Hummus',                   cat:'huelsen', emoji:'🫘', serving:80,  per100g:{ kcal:166, protein:7.9, carbs:14,   fat:9.6 } },

  // ══════ GEMÜSE ═══════════════════════════════════
  { name:'Tomate',                   cat:'gemuese', emoji:'🍅', serving:120, per100g:{ kcal:18,  protein:0.9, carbs:3.5,  fat:0.2 }, unit:{label:'Tomate',plural:'Tomaten',g:80} },
  { name:'Cherrytomaten',            cat:'gemuese', emoji:'🍅', serving:100, per100g:{ kcal:18,  protein:0.9, carbs:3.9,  fat:0.2 } },
  { name:'Gurke',                    cat:'gemuese', emoji:'🥒', serving:100, per100g:{ kcal:16,  protein:0.7, carbs:3.6,  fat:0.1 } },
  { name:'Brokkoli',                 cat:'gemuese', emoji:'🥦', serving:200, per100g:{ kcal:34,  protein:2.8, carbs:7,    fat:0.4 } },
  { name:'Blumenkohl',               cat:'gemuese', emoji:'🥦', serving:200, per100g:{ kcal:25,  protein:1.9, carbs:5,    fat:0.3 } },
  { name:'Rosenkohl',                cat:'gemuese', emoji:'🥦', serving:150, per100g:{ kcal:43,  protein:3.4, carbs:9,    fat:0.5 } },
  { name:'Grünkohl',                 cat:'gemuese', emoji:'🥬', serving:100, per100g:{ kcal:49,  protein:4.3, carbs:9,    fat:0.9 } },
  { name:'Spinat (roh)',             cat:'gemuese', emoji:'🌿', serving:100, per100g:{ kcal:23,  protein:2.9, carbs:3.6,  fat:0.4 } },
  { name:'Rucola',                   cat:'gemuese', emoji:'🌿', serving:50,  per100g:{ kcal:25,  protein:2.6, carbs:3.7,  fat:0.7 } },
  { name:'Kopfsalat / Eisberg',      cat:'gemuese', emoji:'🥬', serving:100, per100g:{ kcal:14,  protein:1.4, carbs:2.2,  fat:0.2 } },
  { name:'Paprika (rot)',            cat:'gemuese', emoji:'🫑', serving:150, per100g:{ kcal:31,  protein:1,   carbs:6,    fat:0.3 }, unit:{label:'Paprika',plural:'Paprika',g:150} },
  { name:'Paprika (gelb)',           cat:'gemuese', emoji:'🫑', serving:150, per100g:{ kcal:27,  protein:1,   carbs:6.3,  fat:0.2 }, unit:{label:'Paprika',plural:'Paprika',g:150} },
  { name:'Champignons',              cat:'gemuese', emoji:'🍄', serving:100, per100g:{ kcal:22,  protein:3.1, carbs:3.3,  fat:0.3 } },
  { name:'Austernpilze',             cat:'gemuese', emoji:'🍄', serving:100, per100g:{ kcal:33,  protein:3.3, carbs:6,    fat:0.4 } },
  { name:'Zucchini',                 cat:'gemuese', emoji:'🥒', serving:200, per100g:{ kcal:17,  protein:1.2, carbs:3.1,  fat:0.3 }, unit:{label:'Zucchini',plural:'Zucchini',g:200} },
  { name:'Aubergine',                cat:'gemuese', emoji:'🍆', serving:150, per100g:{ kcal:25,  protein:1,   carbs:6,    fat:0.2 } },
  { name:'Karotte',                  cat:'gemuese', emoji:'🥕', serving:100, per100g:{ kcal:41,  protein:0.9, carbs:10,   fat:0.2 }, unit:{label:'Karotte',plural:'Karotten',g:60} },
  { name:'Rote Bete',                cat:'gemuese', emoji:'🫚', serving:100, per100g:{ kcal:43,  protein:1.6, carbs:10,   fat:0.1 } },
  { name:'Mais (Dose)',              cat:'gemuese', emoji:'🌽', serving:100, per100g:{ kcal:86,  protein:2.9, carbs:18,   fat:1.2 } },
  { name:'Spargel (grün)',           cat:'gemuese', emoji:'🌿', serving:150, per100g:{ kcal:20,  protein:2.2, carbs:3.9,  fat:0.1 } },
  { name:'Lauch',                    cat:'gemuese', emoji:'🌿', serving:100, per100g:{ kcal:26,  protein:1.5, carbs:6,    fat:0.3 } },
  { name:'Staudensellerie',          cat:'gemuese', emoji:'🌿', serving:100, per100g:{ kcal:14,  protein:0.7, carbs:3,    fat:0.2 } },
  { name:'Kürbis (Hokkaido)',        cat:'gemuese', emoji:'🎃', serving:200, per100g:{ kcal:40,  protein:1.5, carbs:9,    fat:0.1 } },
  { name:'Zwiebel',                  cat:'gemuese', emoji:'🧅', serving:80,  per100g:{ kcal:40,  protein:1.1, carbs:9,    fat:0.1 }, unit:{label:'Zwiebel',plural:'Zwiebeln',g:80} },
  { name:'Knoblauch',                cat:'gemuese', emoji:'🧄', serving:5,   per100g:{ kcal:149, protein:6.4, carbs:33,   fat:0.5 }, unit:{label:'Zehe',plural:'Zehen',g:5} },
  { name:'Weißkohl',                 cat:'gemuese', emoji:'🥬', serving:150, per100g:{ kcal:25,  protein:1.3, carbs:5.8,  fat:0.1 } },
  { name:'Rotkohl',                  cat:'gemuese', emoji:'🥬', serving:150, per100g:{ kcal:27,  protein:1.4, carbs:6.1,  fat:0.1 } },
  { name:'Grüne Bohnen',             cat:'gemuese', emoji:'🫛', serving:150, per100g:{ kcal:31,  protein:1.8, carbs:7,    fat:0.1 } },

  // ══════ OBST ═════════════════════════════════════
  { name:'Banane',                   cat:'obst',    emoji:'🍌', serving:120, per100g:{ kcal:89,  protein:1.1, carbs:23,   fat:0.3 }, unit:{label:'Banane',plural:'Bananen',g:120} },
  { name:'Apfel',                    cat:'obst',    emoji:'🍎', serving:150, per100g:{ kcal:52,  protein:0.3, carbs:14,   fat:0.2 }, unit:{label:'Apfel',plural:'Äpfel',g:150} },
  { name:'Birne',                    cat:'obst',    emoji:'🍐', serving:150, per100g:{ kcal:57,  protein:0.4, carbs:15,   fat:0.1 }, unit:{label:'Birne',plural:'Birnen',g:150} },
  { name:'Orange',                   cat:'obst',    emoji:'🍊', serving:150, per100g:{ kcal:47,  protein:0.9, carbs:12,   fat:0.1 }, unit:{label:'Orange',plural:'Orangen',g:150} },
  { name:'Grapefruit',               cat:'obst',    emoji:'🍊', serving:150, per100g:{ kcal:42,  protein:0.8, carbs:11,   fat:0.1 } },
  { name:'Kiwi',                     cat:'obst',    emoji:'🥝', serving:80,  per100g:{ kcal:61,  protein:1.1, carbs:15,   fat:0.5 }, unit:{label:'Kiwi',plural:'Kiwis',g:75} },
  { name:'Mango',                    cat:'obst',    emoji:'🥭', serving:150, per100g:{ kcal:60,  protein:0.8, carbs:15,   fat:0.4 }, unit:{label:'Mango',plural:'Mangos',g:200} },
  { name:'Ananas',                   cat:'obst',    emoji:'🍍', serving:150, per100g:{ kcal:50,  protein:0.5, carbs:13,   fat:0.1 } },
  { name:'Wassermelone',             cat:'obst',    emoji:'🍉', serving:200, per100g:{ kcal:30,  protein:0.6, carbs:7.6,  fat:0.2 } },
  { name:'Erdbeeren',                cat:'obst',    emoji:'🍓', serving:150, per100g:{ kcal:32,  protein:0.7, carbs:8,    fat:0.3 } },
  { name:'Himbeeren',                cat:'obst',    emoji:'🫐', serving:100, per100g:{ kcal:52,  protein:1.2, carbs:12,   fat:0.7 } },
  { name:'Blaubeeren',               cat:'obst',    emoji:'🫐', serving:100, per100g:{ kcal:57,  protein:0.7, carbs:14,   fat:0.3 } },
  { name:'Brombeeren',               cat:'obst',    emoji:'🫐', serving:100, per100g:{ kcal:43,  protein:1.4, carbs:10,   fat:0.5 } },
  { name:'Weintrauben',              cat:'obst',    emoji:'🍇', serving:150, per100g:{ kcal:69,  protein:0.7, carbs:18,   fat:0.2 } },
  { name:'Kirsche',                  cat:'obst',    emoji:'🍒', serving:100, per100g:{ kcal:63,  protein:1.1, carbs:16,   fat:0.2 } },
  { name:'Pfirsich',                 cat:'obst',    emoji:'🍑', serving:150, per100g:{ kcal:39,  protein:0.9, carbs:10,   fat:0.3 }, unit:{label:'Pfirsich',plural:'Pfirsiche',g:150} },
  { name:'Datteln (getrocknet)',     cat:'obst',    emoji:'🫙', serving:30,  per100g:{ kcal:277, protein:1.8, carbs:75,   fat:0.2 }, unit:{label:'Dattel',plural:'Datteln',g:8} },

  // ══════ FETTE & NÜSSE ════════════════════════════
  { name:'Olivenöl',                 cat:'fette',   emoji:'🫒', serving:10,  per100g:{ kcal:884, protein:0,   carbs:0,    fat:100 }, unit:{label:'EL',plural:'EL',g:10} },
  { name:'Kokosöl',                  cat:'fette',   emoji:'🥥', serving:10,  per100g:{ kcal:862, protein:0,   carbs:0,    fat:100 } },
  { name:'Butter',                   cat:'fette',   emoji:'🧈', serving:10,  per100g:{ kcal:717, protein:0.9, carbs:0.1,  fat:81  } },
  { name:'Avocado',                  cat:'fette',   emoji:'🥑', serving:100, per100g:{ kcal:160, protein:2,   carbs:9,    fat:15  }, unit:{label:'Avocado',plural:'Avocados',g:140} },
  { name:'Mandeln',                  cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:579, protein:21,  carbs:22,   fat:50  } },
  { name:'Walnüsse',                 cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:654, protein:15,  carbs:14,   fat:65  } },
  { name:'Cashews',                  cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:553, protein:18,  carbs:30,   fat:44  } },
  { name:'Haselnüsse',               cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:628, protein:15,  carbs:17,   fat:61  } },
  { name:'Pistazien',                cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:562, protein:20,  carbs:28,   fat:45  } },
  { name:'Erdnüsse (geröstet)',      cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:585, protein:26,  carbs:16,   fat:50  } },
  { name:'Erdnussbutter (natur)',    cat:'fette',   emoji:'🥜', serving:30,  per100g:{ kcal:588, protein:25,  carbs:20,   fat:50  }, unit:{label:'EL',plural:'EL',g:16} },
  { name:'Mandelmus',                cat:'fette',   emoji:'🥜', serving:20,  per100g:{ kcal:614, protein:21,  carbs:20,   fat:56  } },
  { name:'Chiasamen',                cat:'fette',   emoji:'🌱', serving:15,  per100g:{ kcal:486, protein:17,  carbs:42,   fat:31  } },
  { name:'Leinsamen',                cat:'fette',   emoji:'🌱', serving:15,  per100g:{ kcal:534, protein:18,  carbs:29,   fat:42  } },
  { name:'Kürbiskerne',              cat:'fette',   emoji:'🌱', serving:30,  per100g:{ kcal:559, protein:30,  carbs:11,   fat:49  } },
  { name:'Sonnenblumenkerne',        cat:'fette',   emoji:'🌱', serving:30,  per100g:{ kcal:584, protein:21,  carbs:20,   fat:51  } },
  { name:'Sesam',                    cat:'fette',   emoji:'🌱', serving:10,  per100g:{ kcal:573, protein:17,  carbs:23,   fat:50  } },
  { name:'Hanfsamen',                cat:'fette',   emoji:'🌱', serving:15,  per100g:{ kcal:553, protein:32,  carbs:9,    fat:49  } },
  { name:'Kokosraspeln',             cat:'fette',   emoji:'🥥', serving:20,  per100g:{ kcal:354, protein:3.3, carbs:15,   fat:33  } },

  // ══════ SONSTIGES ════════════════════════════════
  { name:'Honig',                    cat:'sonstiges',emoji:'🍯', serving:15,  per100g:{ kcal:304, protein:0.3, carbs:82,   fat:0   }, unit:{label:'EL',plural:'EL',g:20} },
  { name:'Tomatenmark (doppelt)',    cat:'sonstiges',emoji:'🍅', serving:20,  per100g:{ kcal:96,  protein:5,   carbs:18,   fat:0.5 } },
  { name:'Passierte Tomaten',        cat:'sonstiges',emoji:'🍅', serving:200, per100g:{ kcal:32,  protein:1.6, carbs:6.4,  fat:0.3 } },
  { name:'Sojasoße',                 cat:'sonstiges',emoji:'🫙', serving:15,  per100g:{ kcal:60,  protein:8,   carbs:5,    fat:0.1 } },
  { name:'Ketchup',                  cat:'sonstiges',emoji:'🍅', serving:20,  per100g:{ kcal:101, protein:1.8, carbs:24,   fat:0.1 } },
  { name:'Mayonnaise',               cat:'sonstiges',emoji:'🫙', serving:15,  per100g:{ kcal:680, protein:1.2, carbs:2,    fat:75  } },
  { name:'Orangensaft (frisch)',     cat:'sonstiges',emoji:'🍊', serving:200, per100g:{ kcal:45,  protein:0.7, carbs:10,   fat:0.2 } },
  { name:'Sahne (30% Fett)',         cat:'sonstiges',emoji:'🫙', serving:50,  per100g:{ kcal:292, protein:2.4, carbs:3.3,  fat:30  } },
  { name:'Hafermilch',               cat:'sonstiges',emoji:'🥛', serving:250, per100g:{ kcal:46,  protein:1,   carbs:9,    fat:1   } },
  { name:'Mandelmilch (ungesüßt)',   cat:'sonstiges',emoji:'🥛', serving:250, per100g:{ kcal:17,  protein:0.6, carbs:1.4,  fat:1.1 } },
  { name:'Sojamilch (natur)',        cat:'sonstiges',emoji:'🥛', serving:250, per100g:{ kcal:40,  protein:3.6, carbs:2.5,  fat:2   } },
  { name:'Dunkle Schokolade (85%)', cat:'sonstiges',emoji:'🍫', serving:20,  per100g:{ kcal:598, protein:8,   carbs:46,   fat:43  }, unit:{label:'Stück',plural:'Stück',g:5} },
];
