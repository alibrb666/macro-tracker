import { describe, expect, it } from 'vitest';
import { createClassicContext, evaluate, loadClassic } from '../helpers/classic-scripts.js';

describe('energy, macro and date calculations', () => {
  it('calculates Mifflin-St Jeor BMR for each gender branch', () => {
    const { context } = createClassicContext(); loadClassic(context, 'js/calc.js');
    expect(evaluate(context, "calcBMR({ weight: 80, height: 180, age: 30, gender: 'm' })")).toBe(1780);
    expect(evaluate(context, "calcBMR({ weight: 80, height: 180, age: 30, gender: 'f' })")).toBe(1614);
  });

  it('keeps macro floors and reconciles diet calories from macros', () => {
    const { context } = createClassicContext(); loadClassic(context, 'js/calc.js');
    const needs = evaluate(context, "computeNeeds({ weight: 50, height: 155, age: 28, gender: 'f', activity: 1.2, goal: 'cut', delta: 900 })");
    expect(needs.maintenance.fat).toBeGreaterThanOrEqual(40);
    expect(needs.diet.carbs).toBeGreaterThanOrEqual(30);
    expect(needs.diet.kcal).toBe(needs.diet.protein * 4 + needs.diet.carbs * 4 + needs.diet.fat * 9);
  });

  it('uses local calendar dates rather than UTC date serialization', () => {
    const { context } = createClassicContext(); loadClassic(context, 'js/store.js');
    expect(evaluate(context, "dateKeyOf(new Date(2026, 0, 2, 0, 5))")).toBe('2026-01-02');
    expect(evaluate(context, "dateKeyOf(new Date(2026, 11, 31, 23, 59))")).toBe('2026-12-31');
  });
});
