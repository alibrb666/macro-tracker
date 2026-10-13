// ===== sync-store.js =====
// SYNC-01B local durability layer. It deliberately has no cloud transport;
// SYNC-01C will attach a revision-protected sender to this durable outbox.

const SYNC_DB_NAME = 'macro-tracker-sync-v1';
const SYNC_DB_VERSION = 1;

function syncV2Enabled() {
  // Deliberately source-controlled: a browser-local switch must not activate
  // an unfinished transport on a production account.
  return Boolean(CONFIG.SYNC_V2_ENABLED);
}

function syncOperationId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `mt-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function syncClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureSyncEntityIds(data) {
  const projection = syncClone(data);
  const idFor = (prefix, item, property = 'id') => {
    if (!item[property]) item[property] = `${prefix}-${syncOperationId()}`;
  };
  (projection.foods || []).forEach(item => idFor('food', item));
  Object.values(projection.log || {}).forEach(entries => entries.forEach(item => idFor('log', item, '_id')));
  Object.values(projection.waterEntries || {}).forEach(entries => entries.forEach(item => idFor('water', item)));
  (projection.fastingHistory || []).forEach(item => idFor('fast', item));
  Object.values(projection.workouts || {}).forEach(entries => entries.forEach(item => idFor('workout', item)));
  return projection;
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

const SyncStore = {
  _dbPromise: null,

  open() {
    if (this._dbPromise) return this._dbPromise;
    if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable'));
    this._dbPromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('documents')) database.createObjectStore('documents', { keyPath: ['userId', 'key'] });
        if (!database.objectStoreNames.contains('outbox')) database.createObjectStore('outbox', { keyPath: ['userId', 'opId'] });
        if (!database.objectStoreNames.contains('meta')) database.createObjectStore('meta', { keyPath: 'userId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    });
    return this._dbPromise;
  },

  async commit(userId, data, reason = 'local-change', expectedLocalRevision = null) {
    if (!userId) throw new Error('A user-bound sync operation requires userId');
    const database = await this.open();
    const projection = ensureSyncEntityIds(data);
    const operation = {
      userId, opId: syncOperationId(), kind: 'replace-projection', reason,
      schemaVersion: 1, createdAt: new Date().toISOString(), attempts: 0,
      nextAttemptAt: null, state: 'queued', payload: projection,
    };
    await new Promise((resolve, reject) => {
      let failure = null;
      const tx = database.transaction(['documents', 'outbox', 'meta'], 'readwrite');
      const documents = tx.objectStore('documents');
      const outbox = tx.objectStore('outbox');
      const meta = tx.objectStore('meta');
      const existing = documents.get([userId, 'projection']);
      existing.onsuccess = () => {
        const localRevision = Number(existing.result?.localRevision || 0) + 1;
        if (expectedLocalRevision !== null && localRevision - 1 !== expectedLocalRevision) {
          failure = new Error('Local projection changed in another tab; reload required');
          tx.abort();
          return;
        }
        operation.localRevision = localRevision;
        documents.put({ userId, key: 'projection', schemaVersion: 1, localRevision, updatedAt: operation.createdAt, data: projection });
        outbox.put(operation);
        meta.put({ userId, schemaVersion: 1, localRevision, status: 'queued', lastLocalCommitAt: operation.createdAt, lastError: null });
      };
      existing.onerror = () => tx.abort();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(failure || tx.error || new Error('IndexedDB transaction aborted'));
    });
    return { projection, operation };
  },

  async bootstrap(userId, legacyProjection) {
    if (!userId) throw new Error('A user-bound sync bootstrap requires userId');
    const inventory = await this.inventory(userId);
    const { projection, outbox, meta } = inventory;
    if (projection || outbox.length || meta) {
      const recovery = this.recoveryState(inventory);
      if (recovery) return { projection: projection?.data || null, operation: null, localRevision: projection?.localRevision || 0, migrated: false, recovery };
      return { projection: projection.data, operation: null, localRevision: projection.localRevision, migrated: false, recovery: null };
    }
    const committed = await this.commit(userId, legacyProjection, 'legacy-import');
    return { ...committed, localRevision: committed.operation.localRevision, migrated: true, recovery: null };
  },

  recoveryState({ projection, outbox, meta }) {
    if (!projection && outbox.length) return { code: 'projection-missing', message: 'Lokale Sync-Projektion fehlt; ausstehende Änderungen werden nicht überschrieben.' };
    if (projection && !meta) return { code: 'metadata-missing', message: 'Lokale Sync-Metadaten fehlen; Änderungen bleiben geschützt.' };
    if (projection && !outbox.length) return { code: 'outbox-missing', message: 'Lokale Sync-Operationen fehlen; Projektion wird nicht automatisch ersetzt.' };
    if (projection && (projection.schemaVersion !== 1 || !Number.isInteger(projection.localRevision) || projection.localRevision < 1)) return { code: 'projection-invalid', message: 'Lokale Sync-Projektion ist nicht kompatibel.' };
    if (projection && (!projection.data || typeof projection.data !== 'object' || Array.isArray(projection.data) || !Array.isArray(projection.data.foods) || !projection.data.log || typeof projection.data.log !== 'object')) return { code: 'projection-invalid', message: 'Lokale Sync-Projektion ist unvollständig.' };
    if (meta && (meta.schemaVersion !== 1 || meta.localRevision !== projection?.localRevision)) return { code: 'metadata-invalid', message: 'Lokale Sync-Metadaten passen nicht zur Projektion.' };
    if (new Set(outbox.map(operation => operation.opId)).size !== outbox.length || outbox.some(operation => operation.userId !== projection?.userId || operation.schemaVersion !== 1 || !operation.opId || !Number.isInteger(operation.localRevision) || operation.localRevision < 1 || operation.localRevision > projection.localRevision || !operation.payload || typeof operation.payload !== 'object')) return { code: 'outbox-invalid', message: 'Lokale Sync-Operationen sind nicht kompatibel.' };
    return null;
  },

  async inventory(userId) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(['documents', 'outbox', 'meta'], 'readonly');
      const documents = tx.objectStore('documents').get([userId, 'projection']);
      const outbox = tx.objectStore('outbox').getAll();
      const meta = tx.objectStore('meta').get(userId);
      tx.oncomplete = () => resolve({ projection: documents.result || null, outbox: (outbox.result || []).filter(operation => operation.userId === userId), meta: meta.result || null });
      tx.onerror = () => reject(tx.error || new Error('IndexedDB integrity check failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB integrity check aborted'));
    });
  },

  async projection(userId) {
    const database = await this.open();
    const tx = database.transaction('documents', 'readonly');
    return idbRequest(tx.objectStore('documents').get([userId, 'projection']));
  },

  async pending(userId) {
    const database = await this.open();
    const tx = database.transaction('outbox', 'readonly');
    const all = await idbRequest(tx.objectStore('outbox').getAll());
    return all.filter(operation => operation.userId === userId && operation.state === 'queued')
      .sort((a, b) => a.localRevision - b.localRevision || a.opId.localeCompare(b.opId));
  },

  async status(userId) {
    const database = await this.open();
    const tx = database.transaction('meta', 'readonly');
    return idbRequest(tx.objectStore('meta').get(userId));
  },
};

const SyncWorker = {
  _chain: Promise.resolve(),
  _activeUserId: null,
  _stoppingUserId: null,
  _states: new Map(),

  _serial(task) {
    const next = this._chain.then(task, task);
    this._chain = next.catch(() => undefined);
    return next;
  },

  start(userId, projection) {
    if (!syncV2Enabled()) return Promise.resolve(null);
    if (!userId) return Promise.reject(new Error('A user-bound sync worker requires userId'));
    if (this._stoppingUserId) return Promise.reject(new Error('Sync worker is stopping'));
    if (this._activeUserId && this._activeUserId !== userId) return Promise.reject(new Error('Refusing to mix sync users'));
    this._activeUserId = userId;
    return this._serial(() => SyncStore.bootstrap(userId, projection)).then(result => {
      this._states.set(userId, { writable: !result.recovery, projection: result.projection, localRevision: result.localRevision });
      return result;
    });
  },

  commit(userId, projection) {
    if (!syncV2Enabled()) return Promise.resolve(null);
    if (!userId) return Promise.reject(new Error('A user-bound sync worker requires userId'));
    if (this._stoppingUserId) return Promise.reject(new Error('Sync worker is stopping'));
    if (this._activeUserId && this._activeUserId !== userId) return Promise.reject(new Error('Refusing to mix sync users'));
    if (this._activeUserId !== userId) return Promise.reject(new Error('Sync worker is not initialized for this user'));
    return this._serial(async () => {
      const state = this._states.get(userId);
      if (!state) throw new Error('Sync worker bootstrap is incomplete');
      if (!state.writable) throw new Error('Sync recovery is required before writing');
      const result = await SyncStore.commit(userId, projection, 'local-change', state.localRevision);
      this._states.set(userId, { writable: true, projection: result.projection, localRevision: result.operation.localRevision });
      return result;
    });
  },

  stop(userId) {
    if (this._activeUserId !== userId) return this._chain;
    this._stoppingUserId = userId;
    return this._chain.finally(() => {
      if (this._activeUserId === userId) this._activeUserId = null;
      this._stoppingUserId = null;
      this._states.delete(userId);
    });
  },

  projection(userId) {
    return this._states.get(userId)?.projection || null;
  },

  refresh(userId) {
    if (this._activeUserId !== userId) return Promise.reject(new Error('Sync worker is not initialized for this user'));
    return this._serial(async () => {
      const inventory = await SyncStore.inventory(userId);
      const recovery = SyncStore.recoveryState(inventory);
      const projection = inventory.projection?.data || null;
      this._states.set(userId, { writable: !recovery, projection, localRevision: inventory.projection?.localRevision || 0 });
      return { projection, recovery };
    });
  },
};
