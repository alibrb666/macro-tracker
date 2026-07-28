// ===== calc.js =====
// TDEE and Macro Calculation

function calcBMR(p) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'm' ? base + 5 : base - 161;
}

function computeNeeds(p) {
  const bmr  = calcBMR(p);
  const tdee = Math.round(bmr * p.activity);

  // Protein: 1.8g/kg | Fat: 0.9g/kg (floor at 40g)
  const proteinG = Math.round(p.weight * 1.8);
  const fatG     = Math.max(Math.round(p.weight * 0.9), 40);
  const carbsG   = Math.max(Math.round((tdee - proteinG * 4 - fatG * 9) / 4), 30);

  const maintenance = { kcal: tdee, protein: proteinG, carbs: carbsG, fat: fatG };

  if (p.goal === 'maintain') return { maintenance, diet: maintenance };

  const sign = p.goal === 'cut' ? -1 : 1;
  const dietKcal = tdee + sign * p.delta;

  // On cut: keep protein, reduce fat slightly (floor 0.7g/kg), carbs take the cut
  // On bulk: small fat increase, rest goes to carbs
  const dietFat     = p.goal === 'cut'
    ? Math.max(Math.round(fatG * 0.88), Math.round(p.weight * 0.7))
    : Math.min(Math.round(fatG * 1.1), Math.round(p.weight * 1.1));
  const dietCarbsG  = Math.max(Math.round((dietKcal - proteinG * 4 - dietFat * 9) / 4), 30);

  // Recalculate actual kcal from macros to avoid floors causing overshoot
  const actualDietKcal = proteinG * 4 + dietCarbsG * 4 + dietFat * 9;
  const diet = { kcal: actualDietKcal, protein: proteinG, carbs: dietCarbsG, fat: dietFat };
  return { maintenance, diet };
}

function goalsForDate(key) {
  if (!db.profile) return db.goals;
  const ws = getWeights();
  if (!ws.length) return db.goals;

  // Latest weigh-in dated on or before `key` (ws is sorted ascending).
  let w = null;
  for (const e of ws) { if (e.date <= key) w = e; else break; }
  if (!w) w = ws[0];                       // before the first weigh-in → earliest known

  // On/after the most recent weigh-in → the live goals already match.
  if (w === ws[ws.length - 1]) return db.goals;

  const needs  = computeNeeds({ ...db.profile, weight: w.kg });
  const target = weightGoalMode() === 'diet' ? needs.diet : needs.maintenance;
  return { kcal: target.kcal, protein: target.protein, carbs: target.carbs, fat: target.fat };
}
