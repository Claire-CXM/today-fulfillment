export const CLOUD_META_KEY = 'today-fulfillment-cloud-meta-v1';
export const CLOUD_SCHEMA_VERSION = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

export function stateFingerprint(state) {
  return JSON.stringify(stableValue(state));
}

function localDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isAutomaticSyncDue(lastSyncedAt, currentTime = new Date()) {
  if (!lastSyncedAt) return true;
  const lastDay = localDay(lastSyncedAt);
  const currentDay = localDay(currentTime);
  return !lastDay || !currentDay || lastDay !== currentDay;
}

export function decideInitialSync({ localFingerprint, localHasData, remote, remoteHasData, meta }) {
  if (!remote) return localHasData ? 'confirm-upload' : 'create-empty';
  const remoteFingerprint = stateFingerprint(remote.state);
  if (localFingerprint === remoteFingerprint) return 'in-sync';

  const sameBase = meta && meta.revision === remote.revision;
  if (sameBase && meta.fingerprint === localFingerprint) return 'use-cloud';
  if (sameBase && meta.fingerprint === remoteFingerprint) return 'push-local';
  if (meta && remote.revision > meta.revision && meta.fingerprint === localFingerprint) return 'use-cloud';

  if (!localHasData && remoteHasData) return 'confirm-restore';
  if (localHasData && !remoteHasData) return 'confirm-upload';
  if (!localHasData && !remoteHasData) return 'use-cloud';
  return 'conflict';
}

function browserMetaStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function browserOnline() {
  try { return globalThis.navigator?.onLine !== false; } catch { return true; }
}

export function createCloudSync({
  client,
  getState,
  applyState,
  hasData,
  onChange = () => {},
  onPasswordRecovery = () => {},
  metaStorage = browserMetaStorage(),
  isOnline = browserOnline,
  debounceMs = 1800,
  now = () => new Date()
}) {
  let session = null;
  let status = { phase: client ? 'local' : 'unavailable', user: null, lastSyncedAt: null, error: null, decision: null, remoteSummary: null };
  let remoteSnapshot = null;
  let timer = null;
  let pendingState = null;
  let pendingVersion = 0;
  let syncPromise = null;
  let authSubscription = null;
  let handlingUserId = null;

  function emit(patch = {}) {
    status = { ...status, ...patch };
    onChange({ ...status });
  }

  function readMeta(userId) {
    try {
      const all = JSON.parse(metaStorage?.getItem(CLOUD_META_KEY) || '{}');
      return all?.[userId] || null;
    } catch { return null; }
  }

  function writeMeta(userId, value) {
    try {
      const all = JSON.parse(metaStorage?.getItem(CLOUD_META_KEY) || '{}');
      all[userId] = value;
      metaStorage?.setItem(CLOUD_META_KEY, JSON.stringify(all));
    } catch { /* Synchronization can continue without local metadata. */ }
  }

  function automaticSyncDue() {
    if (!session?.user) return false;
    return isAutomaticSyncDue(readMeta(session.user.id)?.syncedAt, now());
  }

  function userSummary() {
    return session?.user ? { id: session.user.id, email: session.user.email || '', verified: Boolean(session.user.email_confirmed_at) } : null;
  }

  function summarizeRemote(snapshot) {
    return snapshot ? {
      taskCount: Array.isArray(snapshot.state?.tasks) ? snapshot.state.tasks.length : 0,
      eventCount: Array.isArray(snapshot.state?.events) ? snapshot.state.events.length : 0,
      updatedAt: snapshot.updated_at || null,
      revision: Number(snapshot.revision) || 0
    } : null;
  }

  async function fetchRemote() {
    const { data, error } = await client
      .from('user_snapshots')
      .select('state,schema_version,revision,created_at,updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...data, state: clone(data.state) } : null;
  }

  function remember(snapshot, stateValue) {
    const syncedAt = snapshot?.updated_at || now().toISOString();
    writeMeta(session.user.id, {
      revision: Number(snapshot?.revision) || 0,
      fingerprint: stateFingerprint(stateValue),
      syncedAt
    });
    emit({ phase: 'synced', user: userSummary(), lastSyncedAt: syncedAt, error: null, decision: null, remoteSummary: null, automaticSyncDue: false });
  }

  async function insertSnapshot(stateValue) {
    const payload = { user_id: session.user.id, state: clone(stateValue), schema_version: CLOUD_SCHEMA_VERSION, revision: 0 };
    const { data, error } = await client.from('user_snapshots').insert(payload).select('revision,updated_at').single();
    if (error) {
      if (String(error.code) === '23505') return null;
      throw error;
    }
    return data;
  }

  async function updateSnapshot(stateValue, expectedRevision) {
    const { data, error } = await client
      .from('user_snapshots')
      .update({ state: clone(stateValue), schema_version: CLOUD_SCHEMA_VERSION })
      .eq('user_id', session.user.id)
      .eq('revision', expectedRevision)
      .select('revision,updated_at')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function push(stateValue, expectedRevision = null) {
    if (!session?.user) return false;
    if (!isOnline()) { pendingState = clone(stateValue); emit({ phase: 'pending', user: userSummary(), error: null }); return false; }
    emit({ phase: 'syncing', user: userSummary(), error: null, decision: null });
    try {
      let saved;
      if (expectedRevision === null) saved = await insertSnapshot(stateValue);
      else saved = await updateSnapshot(stateValue, expectedRevision);
      if (!saved) {
        remoteSnapshot = await fetchRemote();
        emit({ phase: 'action-required', user: userSummary(), decision: 'conflict', error: null, remoteSummary: summarizeRemote(remoteSnapshot) });
        return false;
      }
      remoteSnapshot = { ...(remoteSnapshot || {}), state: clone(stateValue), revision: saved.revision, updated_at: saved.updated_at };
      remember(remoteSnapshot, stateValue);
      return true;
    } catch (error) {
      pendingState ||= clone(stateValue);
      emit({ phase: isOnline() ? 'error' : 'pending', user: userSummary(), error: error?.message || String(error) });
      return false;
    }
  }

  async function reconcile() {
    if (!session?.user) return;
    if (!isOnline()) { emit({ phase: 'pending', user: userSummary(), error: null }); return; }
    emit({ phase: 'checking', user: userSummary(), error: null, decision: null });
    try {
      remoteSnapshot = await fetchRemote();
      const localState = clone(getState());
      const localFingerprint = stateFingerprint(localState);
      const meta = readMeta(session.user.id);
      const action = decideInitialSync({
        localFingerprint,
        localHasData: hasData(localState),
        remote: remoteSnapshot,
        remoteHasData: remoteSnapshot ? hasData(remoteSnapshot.state) : false,
        meta
      });
      if (action === 'in-sync') { remember(remoteSnapshot, localState); return; }
      if (action === 'push-local') {
        pendingState = localState;
        pendingVersion += 1;
        if (automaticSyncDue()) await push(localState, remoteSnapshot?.revision ?? null);
        else emit({ phase: 'pending', user: userSummary(), error: null, automaticSyncDue: false });
        return;
      }
      if (action === 'use-cloud') {
        await applyState(clone(remoteSnapshot.state));
        remember(remoteSnapshot, remoteSnapshot.state);
        return;
      }
      if (action === 'create-empty') { await push(localState, null); return; }
      emit({ phase: 'action-required', user: userSummary(), decision: action.replace('confirm-', ''), error: null, remoteSummary: summarizeRemote(remoteSnapshot) });
    } catch (error) {
      emit({ phase: isOnline() ? 'error' : 'pending', user: userSummary(), error: error?.message || String(error) });
    }
  }

  async function setSession(nextSession) {
    const nextUserId = nextSession?.user?.id || null;
    session = nextSession || null;
    if (!nextUserId) {
      handlingUserId = null;
      remoteSnapshot = null;
      pendingState = null;
      clearTimeout(timer);
      emit({ phase: client ? 'local' : 'unavailable', user: null, lastSyncedAt: null, error: null, decision: null, remoteSummary: null });
      return;
    }
    if (handlingUserId === nextUserId && status.phase !== 'error') return;
    handlingUserId = nextUserId;
    await reconcile();
  }

  async function start() {
    if (!client) { emit(); return; }
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') onPasswordRecovery();
      queueMicrotask(() => setSession(nextSession));
    });
    authSubscription = listener?.subscription || null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await setSession(data.session);
    } catch (error) {
      emit({ phase: 'error', error: error?.message || String(error) });
    }
  }

  function schedule(stateValue = getState()) {
    if (!session?.user || status.phase === 'action-required') return;
    pendingState = clone(stateValue);
    pendingVersion += 1;
    const due = automaticSyncDue();
    emit({ phase: 'pending', user: userSummary(), error: null, automaticSyncDue: due });
    if (!isOnline() || !due) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void syncNow({ force: false }); }, debounceMs);
  }

  async function syncNow({ force = true } = {}) {
    if (!session?.user) return false;
    if (syncPromise) return syncPromise;
    clearTimeout(timer);
    timer = null;
    if (!force && !automaticSyncDue()) {
      emit({ phase: 'pending', user: userSummary(), error: null, automaticSyncDue: false });
      return false;
    }
    const version = pendingVersion;
    const nextState = clone(pendingState || getState());
    const operation = (async () => {
      const meta = readMeta(session.user.id);
      if (!isOnline()) { pendingState = nextState; emit({ phase: 'pending', user: userSummary() }); return false; }
      let synced;
      if (!meta) { await reconcile(); synced = status.phase === 'synced'; }
      else synced = await push(nextState, meta.revision);
      if (synced && pendingVersion === version) pendingState = null;
      if (synced && pendingVersion !== version && status.phase !== 'action-required') {
        const due = automaticSyncDue();
        emit({ phase: 'pending', user: userSummary(), error: null, automaticSyncDue: due });
        if (due) {
          clearTimeout(timer);
          timer = setTimeout(() => { timer = null; void syncNow({ force: false }); }, debounceMs);
        }
      }
      return synced;
    })();
    syncPromise = operation;
    try { return await operation; }
    finally { if (syncPromise === operation) syncPromise = null; }
  }

  async function resolveDecision(choice) {
    if (!session?.user || status.phase !== 'action-required') return false;
    if (choice === 'cloud' && remoteSnapshot) {
      await applyState(clone(remoteSnapshot.state));
      remember(remoteSnapshot, remoteSnapshot.state);
      return true;
    }
    if (choice === 'local') return push(clone(getState()), remoteSnapshot?.revision ?? null);
    return false;
  }

  async function signUp(email, password) {
    return client.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/?auth=confirmed` } });
  }
  async function resendConfirmation(email) {
    return client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/?auth=confirmed` } });
  }
  async function signIn(email, password) { return client.auth.signInWithPassword({ email, password }); }
  async function sendPasswordReset(email) { return client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/?auth=recovery` }); }
  async function updatePassword(password) { return client.auth.updateUser({ password }); }
  async function signOut() { return client.auth.signOut(); }
  function retry() { return reconcile(); }
  function handleOnline() { if (session?.user) return status.phase === 'action-required' ? undefined : syncNow({ force: false }); }
  function destroy() { clearTimeout(timer); authSubscription?.unsubscribe?.(); }

  return { start, schedule, syncNow, resolveDecision, signUp, resendConfirmation, signIn, sendPasswordReset, updatePassword, signOut, retry, handleOnline, destroy, getStatus: () => ({ ...status }) };
}
