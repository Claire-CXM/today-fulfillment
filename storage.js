export const STORAGE_KEY = 'today-fulfillment-state-v1';
export const DATA_SCHEMA_VERSION = 1;

const DB_NAME = 'today-fulfillment-backup';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const LATEST_KEY = 'latest';

function isValidState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.tasks));
}

export function createPortableBackup(data, now = Date.now) {
  if (!isValidState(data)) return null;
  return {
    product: 'today-fulfillment',
    formatVersion: 1,
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date(now()).toISOString(),
    data: JSON.parse(JSON.stringify(data))
  };
}

export function parsePortableBackup(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.product && parsed.product !== 'today-fulfillment') return null;
    const data = parsed?.data ?? parsed;
    return isValidState(data) ? JSON.parse(JSON.stringify(data)) : null;
  } catch {
    return null;
  }
}

export function parseSnapshot(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const data = parsed?.data ?? parsed;
    if (!isValidState(data)) return null;
    return {
      schemaVersion: Number(parsed?.schemaVersion) || DATA_SCHEMA_VERSION,
      revision: Number(parsed?.revision) || 0,
      savedAt: Number(parsed?.savedAt) || 0,
      data
    };
  } catch {
    return null;
  }
}

export function chooseNewestSnapshot(primary, backup) {
  if (!primary) return backup;
  if (!backup) return primary;
  if (backup.revision !== primary.revision) return backup.revision > primary.revision ? backup : primary;
  return backup.savedAt > primary.savedAt ? backup : primary;
}

export function createPersistence({ primaryStorage, backupStore, now = Date.now }) {
  let revision = 0;
  let backupQueue = Promise.resolve();

  async function load() {
    let primaryRaw = null;
    try { primaryRaw = primaryStorage?.getItem(STORAGE_KEY) ?? null; } catch { /* IndexedDB may still recover the data. */ }
    const primary = parseSnapshot(primaryRaw);
    let backup = null;
    try { backup = parseSnapshot(await backupStore?.read()); } catch { /* Local Storage may still contain the data. */ }
    const selected = chooseNewestSnapshot(primary, backup);
    revision = selected?.revision || 0;
    const recovered = Boolean(selected && backup && selected === backup && (!primary || primary.revision !== backup.revision || primary.savedAt !== backup.savedAt));

    if (recovered) {
      try { primaryStorage?.setItem(STORAGE_KEY, JSON.stringify(selected)); } catch { /* Keep running from the recovered in-memory copy. */ }
    }

    return {
      state: selected?.data ?? null,
      found: Boolean(selected),
      recovered,
      primaryCorrupted: Boolean(primaryRaw && !primary)
    };
  }

  function save(data) {
    if (!isValidState(data)) return false;
    const dataCopy = JSON.parse(JSON.stringify(data));
    const snapshot = { schemaVersion: DATA_SCHEMA_VERSION, revision: ++revision, savedAt: now(), data: dataCopy };
    const serialized = JSON.stringify(snapshot);
    let primarySaved = false;
    try { primaryStorage?.setItem(STORAGE_KEY, serialized); primarySaved = true; } catch { /* Backup remains available. */ }
    backupQueue = backupQueue.then(() => backupStore?.write(snapshot)).catch(() => undefined);
    return primarySaved;
  }

  async function flush() {
    await backupQueue;
  }

  return { load, save, flush };
}

function openBackupDatabase(indexedDBInstance) {
  if (!indexedDBInstance) return Promise.resolve(null);
  return new Promise(resolve => {
    let request;
    try { request = indexedDBInstance.open(DB_NAME, DB_VERSION); } catch { resolve(null); return; }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export function createIndexedDbBackupStore(indexedDBInstance) {
  const databasePromise = openBackupDatabase(indexedDBInstance);
  return {
    async read() {
      const database = await databasePromise;
      if (!database) return null;
      return new Promise(resolve => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(LATEST_KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => resolve(null);
        transaction.onabort = () => resolve(null);
      });
    },
    async write(snapshot) {
      const database = await databasePromise;
      if (!database) return;
      await new Promise(resolve => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(snapshot, LATEST_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
      });
    }
  };
}

let browserLocalStorage;
let browserIndexedDB;
try { browserLocalStorage = globalThis.localStorage; } catch { browserLocalStorage = null; }
try { browserIndexedDB = globalThis.indexedDB; } catch { browserIndexedDB = null; }

const browserPersistence = createPersistence({
  primaryStorage: browserLocalStorage,
  backupStore: createIndexedDbBackupStore(browserIndexedDB)
});

export const loadPersistedState = () => browserPersistence.load();
export const savePersistedState = state => browserPersistence.save(state);
export const flushPersistedState = () => browserPersistence.flush();

export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
