// ===== nutrition.js =====
// Additive nutrition-label helpers. All extra food properties are optional so
// existing library items and synced data keep working unchanged.

/**
 * @typedef {Object} FoodNutritionPer100g
 * @property {number} kcal
 * @property {number} protein
 * @property {number} carbs
 * @property {number} fat
 * @property {number=} sugars
 * @property {number=} fiber
 * @property {number=} saturatedFat
 * @property {number=} sodium
 * @property {number=} polyols
 */

/** @typedef {{id:string, name:string, brand?:string|null, barcode?:string|null, per100g:FoodNutritionPer100g}} Food */

const FIBER_KCAL_PER_GRAM = 2; // EU-style practical midpoint of 1.5–2 kcal/g

function nutritionNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function netCarbs(nutrition) {
  return Math.max(0, nutritionNumber(nutrition.carbs) - nutritionNumber(nutrition.fiber) - nutritionNumber(nutrition.polyols));
}

// Polyols are treated as non-glycaemic (for example erythritol) when the
// label supplies only one aggregate polyols value. This avoids adding them to
// net carbs or calculated calories; declared label kcal remains the log value.
function scientificMacroCalories(nutrition, fiberKcalPerGram = FIBER_KCAL_PER_GRAM) {
  return nutritionNumber(nutrition.protein) * 4
    + netCarbs(nutrition) * 4
    + nutritionNumber(nutrition.fat) * 9
    + nutritionNumber(nutrition.fiber) * fiberKcalPerGram;
}

function validateNutritionCalories(nutrition, toleranceKcal = 25) {
  const declaredKcal = nutritionNumber(nutrition.kcal);
  const calculatedKcal = scientificMacroCalories(nutrition);
  const differenceKcal = Math.round((declaredKcal - calculatedKcal) * 10) / 10;
  return {
    declaredKcal,
    calculatedKcal: Math.round(calculatedKcal * 10) / 10,
    differenceKcal,
    isSuspicious: declaredKcal > 0 && Math.abs(differenceKcal) > toleranceKcal,
    message: declaredKcal > 0 && Math.abs(differenceKcal) > toleranceKcal
      ? `Etikett prüfen: Makros ergeben ca. ${Math.round(calculatedKcal)} kcal statt ${Math.round(declaredKcal)} kcal.`
      : null,
  };
}

function optionalNutritionField(inputId) {
  const value = document.getElementById(inputId).value.trim();
  return value === '' ? null : Number(value);
}
