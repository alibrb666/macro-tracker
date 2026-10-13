import { describe, expect, it } from 'vitest';
import { createClassicContext, evaluate, loadClassic } from '../helpers/classic-scripts.js';

describe('local data serialization', () => {
  it('creates and persists an empty per-user database deterministically', () => {
    const { context, window } = createClassicContext();
    loadClassic(context, 'js/constants.js');
    evaluate(context, 'let currentUser = { id: "qa-user" }; function cloudSyncSoon() {}');
    loadClassic(context, 'js/store.js');
    evaluate(context, 'loadUserDB("qa-user")');
    const parsed = JSON.parse(window.localStorage.getItem('mt-data-qa-user'));
    expect(parsed.goals.sugars).toBe(50);
    expect(parsed.foods).toEqual([]);
  });

  it('recovers safely from invalid serialized local data', () => {
    const { context, window } = createClassicContext();
    loadClassic(context, 'js/constants.js');
    evaluate(context, 'let currentUser = { id: "qa-user" }; function cloudSyncSoon() {}');
    loadClassic(context, 'js/store.js');
    window.localStorage.setItem('mt-data-qa-user', '{broken');
    evaluate(context, 'loadUserDB("qa-user")');
    expect(JSON.parse(window.localStorage.getItem('mt-data-qa-user')).goals.kcal).toBe(2000);
  });
});
