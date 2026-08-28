import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createPersistence, createPortableBackup, parsePortableBackup, parseSnapshot } from '../storage.js';

function memoryPrimary(initial = null) {
  const values = new Map(initial === null ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    read: key => values.get(key) ?? null
  };
}

function memoryBackup(initial = null) {
  let value = initial;
  return {
    read: async () => value,
    write: async snapshot => { value = structuredClone(snapshot); },
    value: () => value
  };
}

test('兼容读取升级前的 Local Storage 数据', async () => {
  const legacy = { tasks: [{ id: 'legacy-task' }], events: [] };
  const persistence = createPersistence({ primaryStorage: memoryPrimary(JSON.stringify(legacy)), backupStore: memoryBackup() });
  const restored = await persistence.load();
  assert.equal(restored.found, true);
  assert.equal(restored.recovered, false);
  assert.equal(restored.state.tasks[0].id, 'legacy-task');
});

test('主存储缺失时自动从 IndexedDB 备份恢复并回写', async () => {
  const snapshot = { schemaVersion: 1, revision: 7, savedAt: 700, data: { tasks: [{ id: 'backup-task' }] } };
  const primary = memoryPrimary();
  const persistence = createPersistence({ primaryStorage: primary, backupStore: memoryBackup(snapshot) });
  const restored = await persistence.load();
  assert.equal(restored.recovered, true);
  assert.equal(restored.state.tasks[0].id, 'backup-task');
  assert.equal(parseSnapshot(primary.read(STORAGE_KEY)).revision, 7);
});

test('主存储损坏时自动使用有效备份', async () => {
  const snapshot = { schemaVersion: 1, revision: 3, savedAt: 300, data: { tasks: [{ id: 'safe-copy' }] } };
  const persistence = createPersistence({ primaryStorage: memoryPrimary('{broken-json'), backupStore: memoryBackup(snapshot) });
  const restored = await persistence.load();
  assert.equal(restored.primaryCorrupted, true);
  assert.equal(restored.recovered, true);
  assert.equal(restored.state.tasks[0].id, 'safe-copy');
});

test('每次保存同步写主存储并排队写入独立备份', async () => {
  const primary = memoryPrimary();
  const backup = memoryBackup();
  const persistence = createPersistence({ primaryStorage: primary, backupStore: backup, now: () => 1234 });
  const state = { tasks: [{ id: 'saved-task' }], events: [] };
  assert.equal(persistence.save(state), true);
  state.tasks[0].id = 'later-mutation';
  await persistence.flush();
  assert.equal(parseSnapshot(primary.read(STORAGE_KEY)).data.tasks[0].id, 'saved-task');
  assert.equal(backup.value().data.tasks[0].id, 'saved-task');
});

test('双份数据不一致时选择修订号更新的一份', async () => {
  const primarySnapshot = { schemaVersion: 1, revision: 2, savedAt: 200, data: { tasks: [{ id: 'older' }] } };
  const backupSnapshot = { schemaVersion: 1, revision: 4, savedAt: 400, data: { tasks: [{ id: 'newer' }] } };
  const persistence = createPersistence({ primaryStorage: memoryPrimary(JSON.stringify(primarySnapshot)), backupStore: memoryBackup(backupSnapshot) });
  const restored = await persistence.load();
  assert.equal(restored.recovered, true);
  assert.equal(restored.state.tasks[0].id, 'newer');
});

test('便携备份可无损导出并重新导入', () => {
  const state = { tasks: [{ id: 'portable-task', title: '完成一次兑现' }], events: [] };
  const backup = createPortableBackup(state, () => 0);
  state.tasks[0].title = 'later-change';
  assert.equal(backup.product, 'today-fulfillment');
  assert.equal(backup.exportedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(parsePortableBackup(JSON.stringify(backup)).tasks[0].title, '完成一次兑现');
});

test('便携备份拒绝其他产品与损坏文件', () => {
  assert.equal(parsePortableBackup('{broken'), null);
  assert.equal(parsePortableBackup(JSON.stringify({ product: 'another-product', data: { tasks: [] } })), null);
  assert.equal(parsePortableBackup(JSON.stringify({ product: 'today-fulfillment', data: { events: [] } })), null);
});
