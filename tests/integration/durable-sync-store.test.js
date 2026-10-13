import { describe, expect, it } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { createClassicContext, evaluate, loadClassic } from '../helpers/classic-scripts.js';

function setupDurableStore(userId, { withIndexedDb = true } = {}) {
  const { context, window } = createClassicContext({ setup(ctx) {
    if (withIndexedDb) {
      ctx.indexedDB = indexedDB;
      ctx.IDBKeyRange = IDBKeyRange;
    }
  }});
  loadClassic(context, 'js/constants.js', 'js/sync-store.js');
  evaluate(context, 'CONFIG.SYNC_V2_ENABLED = true;');
  evaluate(context, `let currentUser = { id: ${JSON.stringify(userId)}, isGuest: false }; let authSessionGeneration = 1; function sessionIsActive(id, generation) { return currentUser && currentUser.id === id && authSessionGeneration === generation; } function cloudSyncSoon() { throw new Error('legacy cloud path must not run'); }`);
  loadClassic(context, 'js/store.js');
  return { context, window };
}

function startWorker(context, userId) {
  return evaluate(context, `SyncWorker.start(${JSON.stringify(userId)}, db)`);
}

describe('durable local projection and outbox', () => {
  it('atomically persists a user-bound projection and durable operation before mirroring LocalStorage', async () => {
    const userId = `qa-user-${Date.now()}-a`;
    const { context, window } = setupDurableStore(userId);
    evaluate(context, "db = { foods: [{ name: 'Oats', per100g: {} }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} }");
    await startWorker(context, userId);
    expect(await evaluate(context, 'save()')).toBe(true);
    const projection = await evaluate(context, `SyncStore.projection(${JSON.stringify(userId)})`);
    const pending = await evaluate(context, `SyncStore.pending(${JSON.stringify(userId)})`);
    expect(projection.userId).toBe(userId);
    expect(projection.localRevision).toBe(2);
    expect(projection.data.foods[0].id).toMatch(/^food-/);
    expect(pending).toHaveLength(2);
    expect(pending[0]).toMatchObject({ userId, kind: 'replace-projection', state: 'queued', attempts: 0 });
    expect(pending[0].opId).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(`mt-data-${userId}`)).foods[0].id).toBe(projection.data.foods[0].id);
  });

  it('serializes repeated local writes without losing an operation or revision', async () => {
    const userId = `qa-user-${Date.now()}-b`;
    const { context } = setupDurableStore(userId);
    evaluate(context, "db = { foods: [{ name: 'Oats' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} }");
    await startWorker(context, userId);
    await Promise.all([evaluate(context, 'save()'), evaluate(context, 'save()')]);
    const projection = await evaluate(context, `SyncStore.projection(${JSON.stringify(userId)})`);
    const pending = await evaluate(context, `SyncStore.pending(${JSON.stringify(userId)})`);
    expect(projection.localRevision).toBe(3);
    expect(pending).toHaveLength(3);
    expect(new Set(pending.map(operation => operation.opId)).size).toBe(3);
    expect(pending[1].payload.foods[0].id).toBe(pending[2].payload.foods[0].id);
  });

  it('keeps outboxes isolated and imports legacy data only once per user', async () => {
    const firstUser = `qa-user-${Date.now()}-c`;
    const secondUser = `qa-user-${Date.now()}-d`;
    const { context } = setupDurableStore(firstUser);
    const first = await evaluate(context, `SyncWorker.start(${JSON.stringify(firstUser)}, { foods: [{ name: 'First' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`);
    const repeat = await evaluate(context, `SyncWorker.start(${JSON.stringify(firstUser)}, { foods: [{ name: 'Replacement' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`);
    await expect(evaluate(context, `SyncWorker.commit(${JSON.stringify(secondUser)}, { foods: [{ name: 'Second' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`)).rejects.toThrow('Refusing to mix sync users');
    await evaluate(context, `SyncWorker.stop(${JSON.stringify(firstUser)})`);
    await evaluate(context, `SyncWorker.start(${JSON.stringify(secondUser)}, { foods: [{ name: 'Second' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`);
    expect(first.migrated).toBe(true);
    expect(repeat.migrated).toBe(false);
    expect((await evaluate(context, `SyncStore.pending(${JSON.stringify(firstUser)})`))).toHaveLength(1);
    expect((await evaluate(context, `SyncStore.pending(${JSON.stringify(secondUser)})`))).toHaveLength(1);
    expect((await evaluate(context, `SyncStore.projection(${JSON.stringify(firstUser)})`)).data.foods[0].name).toBe('First');
  });

  it('does not mirror a real IndexedDB-unavailable failure as a successful local save', async () => {
    const userId = `qa-user-${Date.now()}-e`;
    const { context, window } = setupDurableStore(userId, { withIndexedDb: false });
    evaluate(context, "db = { foods: [{ name: 'Unsaved' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} };");
    expect(await evaluate(context, 'save()')).toBe(false);
    expect(window.localStorage.getItem(`mt-data-${userId}`)).toBeNull();
  });

  it('does not overwrite a durable projection when the legacy cache is missing', async () => {
    const userId = `qa-user-${Date.now()}-f`;
    const { context } = setupDurableStore(userId);
    await evaluate(context, `SyncStore.commit(${JSON.stringify(userId)}, { foods: [{ name: 'Durable' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`);
    evaluate(context, 'db = EMPTY_DB();');
    await evaluate(context, 'save()');
    const boot = await evaluate(context, `SyncWorker.start(${JSON.stringify(userId)}, db)`);
    expect(boot.projection.foods[0].name).toBe('Durable');
  });

  it('reports a safe recovery state instead of importing over incomplete durable records', async () => {
    const userId = `qa-user-${Date.now()}-g`;
    const { context } = setupDurableStore(userId);
    await evaluate(context, `SyncStore.commit(${JSON.stringify(userId)}, { foods: [{ name: 'Durable' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`);
    await evaluate(context, `(async () => { const db = await SyncStore.open(); const tx = db.transaction('outbox', 'readwrite'); tx.objectStore('outbox').clear(); await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; }); })()`);
    const boot = await evaluate(context, `SyncStore.bootstrap(${JSON.stringify(userId)}, { foods: [], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} })`);
    expect(boot.recovery.code).toBe('outbox-missing');
  });

  it('keeps a durable commit successful when only the LocalStorage mirror fails', async () => {
    const userId = `qa-user-${Date.now()}-h`;
    const { context, window } = setupDurableStore(userId);
    evaluate(context, "db = { foods: [{ name: 'Durable' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} };");
    await startWorker(context, userId);
    Object.defineProperty(window.localStorage, 'setItem', { value: () => { throw new Error('quota'); } });
    expect(await evaluate(context, 'save()')).toBe(true);
    expect((await evaluate(context, `SyncStore.projection(${JSON.stringify(userId)})`)).data.foods[0].name).toBe('Durable');
  });

  it('does not invoke a success callback when the durable commit fails', async () => {
    const userId = `qa-user-${Date.now()}-i`;
    const { context } = setupDurableStore(userId, { withIndexedDb: false });
    evaluate(context, "let successWasShown = false; db = { foods: [{ name: 'Unsaved' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} };");
    expect(await evaluate(context, 'save(() => { successWasShown = true; })')).toBe(false);
    expect(evaluate(context, 'successWasShown')).toBe(false);
  });

  it('keeps the feature flag disabled unless source configuration changes', () => {
    const { context } = createClassicContext();
    loadClassic(context, 'js/constants.js', 'js/sync-store.js');
    expect(evaluate(context, 'syncV2Enabled()')).toBe(false);
  });

  it('does not apply a delayed save result or callback after a session change', async () => {
    const userId = `qa-user-${Date.now()}-j`;
    const { context } = setupDurableStore(userId);
    evaluate(context, "db = { foods: [{ name: 'A' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} };");
    await startWorker(context, userId);
    evaluate(context, "let finishSave; let callbackRan = false; const originalCommit = SyncWorker.commit; SyncWorker.commit = () => new Promise(resolve => { finishSave = resolve; });");
    const pending = evaluate(context, 'save(() => { callbackRan = true; })');
    evaluate(context, "currentUser = { id: 'other-user', isGuest: false }; authSessionGeneration += 1; db = { foods: [{ name: 'B' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} }; finishSave({ projection: { foods: [{ name: 'A' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} } });");
    expect(await pending).toBe(false);
    expect(evaluate(context, 'callbackRan')).toBe(false);
    expect(evaluate(context, 'db.foods[0].name')).toBe('B');
  });

  it('keeps a durable commit successful when its UI callback throws', async () => {
    const userId = `qa-user-${Date.now()}-k`;
    const { context } = setupDurableStore(userId);
    evaluate(context, "db = { foods: [{ name: 'Durable' }], log: {}, waterEntries: {}, fastingHistory: [], workouts: {} };");
    await startWorker(context, userId);
    expect(await evaluate(context, "save(() => { throw new Error('render failed'); })")).toBe(true);
    expect((await evaluate(context, `SyncStore.projection(${JSON.stringify(userId)})`)).data.foods[0].name).toBe('Durable');
  });
});
