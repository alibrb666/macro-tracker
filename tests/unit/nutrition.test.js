import { describe, expect, it } from 'vitest';
import { createClassicContext, evaluate, loadClassic } from '../helpers/classic-scripts.js';

describe('nutrition helpers', () => {
  it('normalizes invalid values and never returns negative net carbs', () => {
    const { context } = createClassicContext(); loadClassic(context, 'js/nutrition.js');
    expect(evaluate(context, "nutritionNumber('-4')")).toBe(0);
    expect(evaluate(context, "nutritionNumber('oops')")).toBe(0);
    expect(evaluate(context, "netCarbs({ carbs: 4, fiber: 5, polyols: 2 })")).toBe(0);
  });

  it('calculates label energy with fibre and detects implausible declarations', () => {
    const { context } = createClassicContext(); loadClassic(context, 'js/nutrition.js');
    expect(evaluate(context, "scientificMacroCalories({ protein: 10, carbs: 20, fat: 5, fiber: 10 })")).toBe(145);
    const result = evaluate(context, "validateNutritionCalories({ kcal: 400, protein: 10, carbs: 20, fat: 5 })");
    expect(result.isSuspicious).toBe(true);
    expect(result.message).toContain('Etikett prüfen');
  });
});
