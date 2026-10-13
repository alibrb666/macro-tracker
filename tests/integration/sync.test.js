import { describe, expect, it } from 'vitest';
import { createClassicContext, evaluate, loadClassic } from '../helpers/classic-scripts.js';

function setupSync({ session = { user: { id: 'user-1' } }, upsertError = null, row = null } = {}) {
  const calls = { upserts: [], signOut: 0 };
  const { context, window } = createClassicContext({ html: '<!doctype html><body><div id="cloud-box"></div><div id="cloud-status"></div></body>', setup(ctx) {
    ctx.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session } }), signOut: async () => { calls.signOut++; }, onAuthStateChange: () => ({}) },
      from: () => ({ upsert: async value => { calls.upserts.push(value); return { error: upsertError }; }, select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
    }) };
  }});
  evaluate(context, "const SUPABASE_URL = 'http://invalid.test'; const SUPABASE_ANON_KEY = 'test-key'; let db = { foods: [], log: {}, goals: {} }; let currentUser = { id: 'user-1' }; function dataKey(id) { return 'mt-data-' + id; } function loadUserDB() {} function refreshAll() {} function showLogin() {} function showPasswordRecovery() {} function esc(v) { return v; }");
  loadClassic(context, 'js/sync.js');
  evaluate(context, "cloudToken = 'test-token'");
  return { context, window, calls };
}

describe('isolated Supabase sync contract', () => {
  it('upserts only the authenticated users snapshot', async () => {
    const { context, calls } = setupSync();
    await evaluate(context, 'cloudPush()');
    expect(calls.upserts).toHaveLength(1);
    expect(calls.upserts[0].user_id).toBe('user-1');
    expect(calls.upserts[0].data.v).toBe(2);
  });

  it('does not write when a session has expired', async () => {
    const { context, calls } = setupSync({ session: null });
    await evaluate(context, 'cloudPush()');
    expect(calls.upserts).toHaveLength(0);
    expect(calls.signOut).toBe(1);
  });

  it('surfaces failed cloud writes without throwing into the UI', async () => {
    const { context, window } = setupSync({ upsertError: { message: 'network unavailable' } });
    await expect(evaluate(context, 'cloudPush()')).resolves.toBeUndefined();
    expect(window.document.getElementById('cloud-status').textContent).toContain('Sync-Fehler');
  });

  it('applies a remote snapshot idempotently', async () => {
    const snapshot = { data: { foods: [{ id: 'food-1' }], log: {}, goals: {} }, savedAt: '2026-10-13T00:00:00.000Z' };
    const { context, window } = setupSync({ row: { data: snapshot, updated_at: snapshot.savedAt } });
    await evaluate(context, 'cloudPull()');
    await evaluate(context, 'cloudPull({ silent: true })');
    expect(JSON.parse(window.localStorage.getItem('mt-data-user-1')).foods).toHaveLength(1);
    expect(window.localStorage.getItem('mt-cloud-synced-at')).toBe(snapshot.savedAt);
  });
});
