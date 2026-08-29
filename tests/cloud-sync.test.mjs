import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOUD_META_KEY, createCloudSync, decideInitialSync, isAutomaticSyncDue, stateFingerprint } from '../cloud-sync.js';

const empty = { tasks: [], events: [], rewards: [], punishments: [], settings: {} };
const local = { ...empty, tasks: [{ id: 'local' }] };
const cloud = { ...empty, tasks: [{ id: 'cloud' }] };

test('状态指纹不受对象键顺序影响', () => {
  assert.equal(stateFingerprint({ b: 2, a: { d: 4, c: 3 } }), stateFingerprint({ a: { c: 3, d: 4 }, b: 2 }));
});

test('首次登录时云端为空必须确认上传本机数据', () => {
  assert.equal(decideInitialSync({ localFingerprint: stateFingerprint(local), localHasData: true, remote: null, remoteHasData: false, meta: null }), 'confirm-upload');
});

test('新设备本机为空而云端有数据时必须确认恢复', () => {
  const remote = { state: cloud, revision: 3 };
  assert.equal(decideInitialSync({ localFingerprint: stateFingerprint(empty), localHasData: false, remote, remoteHasData: true, meta: null }), 'confirm-restore');
});

test('首次登录两端均有不同数据时要求明确选择', () => {
  const remote = { state: cloud, revision: 3 };
  assert.equal(decideInitialSync({ localFingerprint: stateFingerprint(local), localHasData: true, remote, remoteHasData: true, meta: null }), 'conflict');
});

test('同一同步基线上的单端修改可安全推进', () => {
  const remote = { state: cloud, revision: 3 };
  const baseMeta = { revision: 3, fingerprint: stateFingerprint(cloud) };
  assert.equal(decideInitialSync({ localFingerprint: stateFingerprint(local), localHasData: true, remote, remoteHasData: true, meta: baseMeta }), 'push-local');
  const localMeta = { revision: 2, fingerprint: stateFingerprint(local) };
  assert.equal(decideInitialSync({ localFingerprint: stateFingerprint(local), localHasData: true, remote, remoteHasData: true, meta: localMeta }), 'use-cloud');
});

test('自动同步额度按用户本地自然日判断', () => {
  const morning = new Date(2026, 7, 29, 10, 0, 0);
  const sameDay = new Date(2026, 7, 29, 23, 59, 0);
  const nextDay = new Date(2026, 7, 30, 0, 1, 0);
  assert.equal(isAutomaticSyncDue(null, morning), true);
  assert.equal(isAutomaticSyncDue(morning.toISOString(), sameDay), false);
  assert.equal(isAutomaticSyncDue(morning.toISOString(), nextDay), true);
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
}

function createFakeClient(initialState, updateDelay = 0, updatedAt = () => new Date().toISOString()) {
  let remote = { state: structuredClone(initialState), schema_version: 1, revision: 1, created_at: '2026-08-28T00:00:00.000Z', updated_at: '2026-08-28T00:00:00.000Z' };
  let updateCount = 0;
  const session = { user: { id: 'user-1', email: 'owner@example.com', email_confirmed_at: '2026-08-29T00:00:00.000Z' } };
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session }, error: null })
    },
    from: () => {
      let action = 'read';
      let payload = null;
      const builder = {
        select: () => builder,
        eq: () => builder,
        update: value => { action = 'update'; payload = value; return builder; },
        maybeSingle: async () => {
          if (action === 'update') {
            if (updateDelay) await new Promise(resolve => setTimeout(resolve, updateDelay));
            updateCount += 1;
            remote = { ...remote, state: structuredClone(payload.state), revision: remote.revision + 1, updated_at: updatedAt() };
            return { data: { revision: remote.revision, updated_at: remote.updated_at }, error: null };
          }
          return { data: structuredClone(remote), error: null };
        }
      };
      return builder;
    },
    remote: () => structuredClone(remote),
    updateCount: () => updateCount
  };
}

test('普通变更每天只自动同步一次，手动同步不受限制', async () => {
  let current = structuredClone(local);
  let clock = new Date(2026, 7, 29, 10, 0, 0);
  const client = createFakeClient(current, 0, () => clock.toISOString());
  const storage = createMemoryStorage();
  const phases = [];
  const sync = createCloudSync({
    client,
    getState: () => current,
    applyState: async incoming => { current = incoming; },
    hasData: value => value.tasks.length > 0,
    onChange: status => phases.push(status.phase),
    metaStorage: storage,
    isOnline: () => true,
    debounceMs: 5,
    now: () => new Date(clock)
  });
  await sync.start();
  assert.ok(storage.getItem(CLOUD_META_KEY));
  current = { ...current, settings: { guiltCopy: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(client.remote().state.settings.guiltCopy, true);
  assert.equal(client.updateCount(), 1);
  assert.deepEqual(phases.slice(-3), ['pending', 'syncing', 'synced']);

  current = { ...current, settings: { guiltCopy: true, reduceMotion: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(client.updateCount(), 1);
  assert.equal(client.remote().state.settings.reduceMotion, undefined);
  assert.equal(sync.getStatus().phase, 'pending');
  assert.equal(sync.getStatus().automaticSyncDue, false);

  await sync.syncNow();
  assert.equal(client.updateCount(), 2);
  assert.equal(client.remote().state.settings.reduceMotion, true);
  sync.destroy();
});

test('跨自然日后待同步数据会恢复一次自动同步额度', async () => {
  let current = structuredClone(local);
  let clock = new Date(2026, 7, 29, 10, 0, 0);
  const client = createFakeClient(current, 0, () => clock.toISOString());
  const sync = createCloudSync({
    client,
    getState: () => current,
    applyState: async incoming => { current = incoming; },
    hasData: value => value.tasks.length > 0,
    metaStorage: createMemoryStorage(),
    isOnline: () => true,
    debounceMs: 5,
    now: () => new Date(clock)
  });
  await sync.start();
  current = { ...current, settings: { guiltCopy: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(client.updateCount(), 1);

  current = { ...current, settings: { guiltCopy: true, reduceMotion: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(client.updateCount(), 1);

  clock = new Date(2026, 7, 30, 0, 1, 0);
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(client.updateCount(), 2);
  assert.equal(client.remote().state.settings.reduceMotion, true);
  sync.destroy();
});

test('同步进行中出现的新变更保留到待同步，不会在同一天连续请求', async () => {
  let current = structuredClone(local);
  const clock = new Date(2026, 7, 29, 10, 0, 0);
  const client = createFakeClient(current, 20, () => clock.toISOString());
  const sync = createCloudSync({
    client,
    getState: () => current,
    applyState: async incoming => { current = incoming; },
    hasData: value => value.tasks.length > 0,
    metaStorage: createMemoryStorage(),
    isOnline: () => true,
    debounceMs: 2,
    now: () => new Date(clock)
  });
  await sync.start();
  current = { ...current, settings: { guiltCopy: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 8));
  current = { ...current, settings: { guiltCopy: true, reduceMotion: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 90));
  assert.equal(client.updateCount(), 1);
  assert.equal(client.remote().state.settings.reduceMotion, undefined);
  assert.equal(sync.getStatus().phase, 'pending');
  await sync.syncNow();
  assert.equal(client.remote().state.settings.reduceMotion, true);
  assert.equal(client.updateCount(), 2);
  sync.destroy();
});

test('联网恢复只在当天自动同步额度可用时补传', async () => {
  let current = structuredClone(local);
  let online = true;
  const clock = new Date(2026, 7, 29, 10, 0, 0);
  const client = createFakeClient(current, 0, () => clock.toISOString());
  const sync = createCloudSync({
    client,
    getState: () => current,
    applyState: async incoming => { current = incoming; },
    hasData: value => value.tasks.length > 0,
    metaStorage: createMemoryStorage(),
    isOnline: () => online,
    debounceMs: 5,
    now: () => new Date(clock)
  });
  await sync.start();
  online = false;
  current = { ...current, settings: { guiltCopy: true } };
  sync.schedule(current);
  assert.equal(client.updateCount(), 0);
  online = true;
  await sync.handleOnline();
  assert.equal(client.updateCount(), 1);

  online = false;
  current = { ...current, settings: { guiltCopy: true, reduceMotion: true } };
  sync.schedule(current);
  online = true;
  await sync.handleOnline();
  assert.equal(client.updateCount(), 1);
  assert.equal(sync.getStatus().phase, 'pending');
  sync.destroy();
});

test('选择云端数据后，后续普通操作不会重复进入冲突选择', async () => {
  let current = structuredClone(local);
  const clock = new Date(2026, 7, 29, 10, 0, 0);
  const client = createFakeClient(cloud, 0, () => clock.toISOString());
  const sync = createCloudSync({
    client,
    getState: () => current,
    applyState: async incoming => { current = incoming; },
    hasData: value => value.tasks.length > 0,
    metaStorage: createMemoryStorage(),
    isOnline: () => true,
    debounceMs: 5,
    now: () => new Date(clock)
  });
  await sync.start();
  assert.equal(sync.getStatus().phase, 'action-required');
  assert.equal(sync.getStatus().decision, 'conflict');
  assert.equal(await sync.resolveDecision('cloud'), true);
  assert.equal(sync.getStatus().phase, 'synced');

  current = { ...current, settings: { guiltCopy: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.notEqual(sync.getStatus().phase, 'action-required');
  assert.equal(sync.getStatus().decision, null);
  assert.equal(client.updateCount(), 1);
  sync.destroy();
});

test('覆盖云端完成后，后续普通操作不会再次要求选择', async () => {
  let current = structuredClone(local);
  const clock = new Date(2026, 7, 29, 10, 0, 0);
  const client = createFakeClient(cloud, 0, () => clock.toISOString());
  const sync = createCloudSync({
    client,
    getState: () => current,
    applyState: async incoming => { current = incoming; },
    hasData: value => value.tasks.length > 0,
    metaStorage: createMemoryStorage(),
    isOnline: () => true,
    debounceMs: 5,
    now: () => new Date(clock)
  });
  await sync.start();
  assert.equal(sync.getStatus().phase, 'action-required');
  assert.equal(await sync.resolveDecision('local'), true);
  assert.equal(sync.getStatus().phase, 'synced');
  assert.equal(client.updateCount(), 1);

  current = { ...current, settings: { reduceMotion: true } };
  sync.schedule(current);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(sync.getStatus().phase, 'pending');
  assert.equal(sync.getStatus().decision, null);
  assert.equal(client.updateCount(), 1);
  sync.destroy();
});
