import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { idbSet, idbAll } from './idb.js';

// All per-device state lives in one localStorage key so export/import is one JSON file.
//
// v2 (Nov 2026) storage rules:
//  * Saved synchronously at the moment of every change.
//  * Merge-safe: before writing we read the stored copy (another tab/window may have written it)
//    and merge per slide using timestamps. Two open windows never wipe each other's marks.
//  * mastered / bookmarks are { slideId: { on: true|false, at } } (old files: true / timestamp).
//  * seen is { slideId: firstSeenTimestamp } (union when merging).
//  * Mirrored to IndexedDB; restored from there if localStorage is empty or corrupt.
//  * Important slides use the same maps with ids prefixed "imp:".
export const KEY = 'mgmt6110-exam-prep';
export const APP_ID = 'MGMT6110 Exam Prep';
export const EXPORT_FORMAT = 2;

const DEFAULTS = {
  version: 2,
  epoch: null, // changes on Reset / Replace; the newer epoch wins whole when merging
  epochAt: 0,
  seen: {}, // slideId -> timestamp
  mastered: {}, // slideId -> { on, at }
  bookmarks: {}, // slideId -> { on, at }
  last: null, // { topicId, slideIndex, ts, open }  (open = the reader was on screen)
  lastImportant: null, // { groupId, index, ts }
  backupAt: 0,
  settings: { fontSize: 'M', theme: 'auto' },
  settingsAt: 0,
};
const clone = (o) => JSON.parse(JSON.stringify(o));

function normFlagMap(m, legacyValue) {
  const out = {};
  for (const [k, v] of Object.entries(m || {})) {
    if (v === true) out[k] = { on: true, at: 0 };
    else if (typeof v === 'number') out[k] = { on: true, at: legacyValue === 'ts' ? v : 0 };
    else if (v && typeof v === 'object') out[k] = { on: !!v.on, at: Number(v.at) || 0 };
  }
  return out;
}

export function normalise(p) {
  const d = clone(DEFAULTS);
  if (!p || typeof p !== 'object') return d;
  const seen = {};
  for (const [k, v] of Object.entries(p.seen || {})) seen[k] = Number(v) || 1;
  return {
    ...d,
    epoch: p.epoch || null,
    epochAt: Number(p.epochAt) || 0,
    seen,
    mastered: normFlagMap(p.mastered),
    bookmarks: normFlagMap(p.bookmarks, 'ts'),
    last: p.last && p.last.topicId ? { ...p.last } : null,
    lastImportant: p.lastImportant || null,
    backupAt: Number(p.backupAt) || 0,
    settings: { ...d.settings, ...(p.settings || {}) },
    settingsAt: Number(p.settingsAt) || 0,
  };
}

function mergeFlagMaps(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    if (!cur || v.at > cur.at || (v.at === cur.at && v.on && !cur.on)) out[k] = v;
  }
  return out;
}

/** Idempotent per-slide merge. Different epochs (Reset/Replace on one side): newer epoch wins whole. */
export function mergeState(a, b, { ignoreEpoch = false } = {}) {
  a = normalise(a);
  b = normalise(b);
  if (!ignoreEpoch && (a.epoch || null) !== (b.epoch || null)) return (b.epochAt || 0) >= (a.epochAt || 0) ? b : a;
  const seen = { ...a.seen };
  for (const [k, v] of Object.entries(b.seen)) seen[k] = seen[k] ? Math.min(seen[k], v) : v;
  const newer = (x, y) => [x, y].filter(Boolean).sort((p, q) => (q.ts || 0) - (p.ts || 0))[0] || null;
  const settingsB = (b.settingsAt || 0) > (a.settingsAt || 0);
  return {
    ...a,
    seen,
    mastered: mergeFlagMaps(a.mastered, b.mastered),
    bookmarks: mergeFlagMaps(a.bookmarks, b.bookmarks),
    last: newer(a.last, b.last),
    lastImportant: newer(a.lastImportant, b.lastImportant),
    backupAt: Math.max(a.backupAt || 0, b.backupAt || 0),
    settings: settingsB ? b.settings : a.settings,
    settingsAt: Math.max(a.settingsAt || 0, b.settingsAt || 0),
  };
}

export const isOn = (map, id) => {
  const v = map?.[id];
  return v === true || typeof v === 'number' || !!(v && v.on);
};
export const countOn = (map, prefix) => Object.keys(map || {}).filter((k) => isOn(map, k) && (prefix ? k.startsWith(prefix) : !k.startsWith('imp:'))).length;

// ---------- raw storage ----------
function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeRaw(obj) {
  let text;
  try { text = JSON.stringify(obj); } catch { return; }
  try { localStorage.setItem(KEY, text); } catch { /* storage full or blocked: IndexedDB still gets it */ }
  idbSet(KEY, text);
}

/** On start-up: if localStorage is empty/corrupt but the IndexedDB mirror has data, copy it back. */
export async function restoreFromMirror(timeoutMs = 1500) {
  const work = (async () => {
    if (readRaw()) return false;
    const pairs = await idbAll();
    const hit = pairs.find((p) => p.key === KEY && typeof p.value === 'string');
    if (!hit) return false;
    try {
      JSON.parse(hit.value);
      localStorage.setItem(KEY, hit.value);
      state = mergeState(normalise(JSON.parse(hit.value)), state);
      listeners.forEach((l) => l());
      return true;
    } catch {
      return false;
    }
  })();
  try {
    return await Promise.race([work, new Promise((r) => setTimeout(() => r(false), timeoutMs))]);
  } catch {
    return false;
  }
}

// ---------- persistent storage ----------
let persistState = 'unknown';
const persistListeners = new Set();
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) persistState = 'unsupported';
    else {
      let ok = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (!ok) ok = await navigator.storage.persist();
      persistState = ok ? 'protected' : 'not-protected';
    }
  } catch {
    persistState = 'unsupported';
  }
  persistListeners.forEach((l) => l());
  return persistState;
}
export function usePersistState() {
  return useSyncExternalStore((l) => { persistListeners.add(l); return () => persistListeners.delete(l); }, () => persistState);
}

// ---------- the store ----------
let state = normalise(readRaw());
const listeners = new Set();

function commit(next) {
  const stored = readRaw();
  state = stored ? mergeState(normalise(stored), next) : normalise(next);
  writeRaw(state);
  listeners.forEach((l) => l());
}
function set(updater) {
  commit(updater(state));
}
function overwrite(next) {
  state = normalise(next);
  writeRaw(state);
  listeners.forEach((l) => l());
}
/** Pick up what another tab/window wrote (no write, so tabs never ping-pong). */
export function reloadFromStorage() {
  const stored = readRaw();
  if (!stored) return;
  const merged = mergeState(normalise(stored), state);
  if (JSON.stringify(merged) !== JSON.stringify(state)) {
    state = merged;
    listeners.forEach((l) => l());
  }
}
export function flush() {
  try { commit(state); } catch { /* ignore */ }
}
export function getState() { return state; }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) reloadFromStorage(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else reloadFromStorage(); });
  window.addEventListener('pagehide', flush);
  window.addEventListener('mgmt6110:flush', flush);
}

function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return state; }

const toggleIn = (map, id) => ({ ...map, [id]: { on: !isOn(map, id), at: Date.now() } });

export function exportText() {
  return JSON.stringify({ app: APP_ID, format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

/** Accepts format 1 files (raw state with seen/mastered/bookmarks) and format 2 files. */
export function parseImport(text) {
  const incoming = JSON.parse(text);
  if (!incoming || typeof incoming !== 'object' || !incoming.seen) throw new Error('Not a valid progress file');
  const format = Number(incoming.format) || 1;
  if (format > EXPORT_FORMAT) throw new Error(`This file is from a newer app version (format ${format}).`);
  return { format, data: normalise(incoming) };
}

export function useStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  const markSeen = useCallback((id) => set((st) => (st.seen[id] ? st : { ...st, seen: { ...st.seen, [id]: Date.now() } })), []);
  const toggleMastered = useCallback((id) => set((st) => ({ ...st, mastered: toggleIn(st.mastered, id) })), []);
  const toggleBookmark = useCallback((id) => set((st) => ({ ...st, bookmarks: toggleIn(st.bookmarks, id) })), []);
  const setLast = useCallback((topicId, slideIndex) => set((st) => ({ ...st, last: { topicId, slideIndex, ts: Date.now(), open: true } })), []);
  const closeReader = useCallback(() => set((st) => (st.last && st.last.open ? { ...st, last: { ...st.last, open: false, ts: Date.now() } } : st)), []);
  const setLastImportant = useCallback((groupId, index) => set((st) => ({ ...st, lastImportant: { groupId, index, ts: Date.now() } })), []);
  const setSetting = useCallback((k, v) => set((st) => ({ ...st, settings: { ...st.settings, [k]: v }, settingsAt: Date.now() })), []);
  const resetProgress = useCallback(() => overwrite({ ...clone(DEFAULTS), settings: state.settings, settingsAt: state.settingsAt, epoch: Math.random().toString(36).slice(2), epochAt: Date.now() }), []);
  const markBackedUp = useCallback(() => set((st) => ({ ...st, backupAt: Date.now() })), []);
  const exportJson = useCallback(() => exportText(), []);
  /** mode 'merge' (default): per-slide latest wins, seen = union. 'replace': this device takes the file. */
  const importJson = useCallback((text, mode = 'merge') => {
    const { data } = parseImport(text);
    if (mode === 'replace') {
      overwrite({ ...data, settings: state.settings, settingsAt: state.settingsAt, epoch: Math.random().toString(36).slice(2), epochAt: Date.now() });
      return;
    }
    set((st) => mergeState(st, data, { ignoreEpoch: true }));
  }, []);
  const actions = useMemo(() => ({ markSeen, toggleMastered, toggleBookmark, setLast, closeReader, setLastImportant, setSetting, resetProgress, markBackedUp, exportJson, importJson }),
    [markSeen, toggleMastered, toggleBookmark, setLast, closeReader, setLastImportant, setSetting, resetProgress, markBackedUp, exportJson, importJson]);
  return [s, actions];
}

export function topicStats(topic, st) {
  const total = topic.slides.length;
  let seen = 0, mastered = 0, bookmarks = 0;
  for (const s of topic.slides) {
    if (st.seen[s.id]) seen++;
    if (isOn(st.mastered, s.id)) mastered++;
    if (isOn(st.bookmarks, s.id)) bookmarks++;
  }
  return { total, seen, mastered, bookmarks, pct: total ? Math.round((seen / total) * 100) : 0, masteredPct: total ? Math.round((mastered / total) * 100) : 0 };
}
