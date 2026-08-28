const SCRIPT_ID = 'LA_COLLECT';
const SCRIPT_URL = 'https://sdk.51.la/js-sdk-pro.min.js';
const SITE_ID = '3R1YnScJ5hL6WsjW';
const PRODUCTION_HOST = 'today-fulfillment.netlify.app';

let consentEnabled = false;
let sdkLoadPromise = null;
let sdkInitialized = false;
let readinessTimer = null;
const pendingEvents = [];

export function isAnalyticsHost(hostname = globalThis.location?.hostname || '') {
  return hostname === PRODUCTION_HOST;
}

export function durationBucket(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  if (value <= 30) return '0_30_min';
  if (value <= 60) return '31_60_min';
  if (value <= 120) return '61_120_min';
  return '121_plus_min';
}

export function shouldTrackDailyFulfillment(lastTrackedDate, completionDate) {
  return Boolean(completionDate && lastTrackedDate !== completionDate);
}

function flushPendingEvents() {
  if (!consentEnabled || typeof globalThis.LA?.track !== 'function') return false;
  while (pendingEvents.length) {
    const event = pendingEvents.shift();
    try {
      globalThis.LA.track(event.name, event.properties);
      event.resolve(true);
    } catch {
      event.resolve(false);
    }
  }
  return true;
}

function settlePendingEvents(result) {
  while (pendingEvents.length) pendingEvents.shift().resolve(result);
}

function waitForEventSdk() {
  if (readinessTimer || typeof globalThis.LA?.track === 'function') {
    flushPendingEvents();
    return;
  }
  let attempts = 0;
  readinessTimer = globalThis.setInterval?.(() => {
    attempts += 1;
    if (flushPendingEvents() || attempts >= 100 || !consentEnabled) {
      globalThis.clearInterval?.(readinessTimer);
      readinessTimer = null;
      if (attempts >= 100 || !consentEnabled) settlePendingEvents(false);
    }
  }, 100);
}

function initializeSdk() {
  if (sdkInitialized || typeof globalThis.LA?.init !== 'function') return false;
  globalThis.LA.init({ id: SITE_ID, ck: SITE_ID, autoTrack: true });
  sdkInitialized = true;
  waitForEventSdk();
  return true;
}

function loadSdk() {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise(resolve => {
    if (initializeSdk()) { resolve(true); return; }
    const existing = globalThis.document?.getElementById(SCRIPT_ID);
    const script = existing || globalThis.document?.createElement('script');
    if (!script) { resolve(false); return; }
    const finish = () => resolve(initializeSdk());
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => { settlePendingEvents(false); resolve(false); }, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.charset = 'UTF-8';
      script.src = SCRIPT_URL;
      script.async = false;
      globalThis.document.head.appendChild(script);
    }
  });
  return sdkLoadPromise;
}

export function configureAnalytics(enabled, hostname = globalThis.location?.hostname || '') {
  consentEnabled = Boolean(enabled);
  if (!consentEnabled) {
    settlePendingEvents(false);
    if (readinessTimer) {
      globalThis.clearInterval?.(readinessTimer);
      readinessTimer = null;
    }
    return Promise.resolve(false);
  }
  if (!isAnalyticsHost(hostname)) return Promise.resolve(false);
  return loadSdk();
}

export function trackAnalyticsEvent(name, properties = {}, hostname = globalThis.location?.hostname || '') {
  if (!consentEnabled || !isAnalyticsHost(hostname)) return Promise.resolve(false);
  return new Promise(resolve => {
    pendingEvents.push({ name, properties, resolve });
    if (!flushPendingEvents()) waitForEventSdk();
  });
}
