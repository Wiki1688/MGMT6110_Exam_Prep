import { useSyncExternalStore, useCallback } from 'react';

// All per-device state lives in one localStorage key so export/import is one JSON file.
const KEY = 'mgmt6110-exam-prep';
const DEFAULTS = {
  version: 1,
  seen: {},        // slideId -> timestamp
  mastered: {},    // slideId -> true
  bookmarks: {},   // slideId -> timestamp
  last: null,      // { topicId, slideIndex, ts }
  settings: { fontSize: 'M', theme: 'auto' },
};

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...parsed, settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

function set(updater) {
  state = updater(state);
  save();
  listeners.forEach((l) => l());
}

function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return state; }

export function useStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  const actions = {
    markSeen: useCallback((id) => set((st) => (st.seen[id] ? st : { ...st, seen: { ...st.seen, [id]: Date.now() } })), []),
    toggleMastered: useCallback((id) => set((st) => {
      const m = { ...st.mastered };
      if (m[id]) delete m[id]; else m[id] = true;
      return { ...st, mastered: m };
    }), []),
    toggleBookmark: useCallback((id) => set((st) => {
      const b = { ...st.bookmarks };
      if (b[id]) delete b[id]; else b[id] = Date.now();
      return { ...st, bookmarks: b };
    }), []),
    setLast: useCallback((topicId, slideIndex) => set((st) => ({ ...st, last: { topicId, slideIndex, ts: Date.now() } })), []),
    setSetting: useCallback((k, v) => set((st) => ({ ...st, settings: { ...st.settings, [k]: v } })), []),
    resetProgress: useCallback(() => set((st) => ({ ...structuredClone(DEFAULTS), settings: st.settings })), []),
    exportJson: useCallback(() => JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2), []),
    importJson: useCallback((text, mode = 'merge') => {
      const incoming = JSON.parse(text);
      if (!incoming || typeof incoming !== 'object' || !incoming.seen) throw new Error('Not a valid progress file');
      set((st) => {
        if (mode === 'replace') return { ...structuredClone(DEFAULTS), ...incoming, settings: { ...st.settings, ...(incoming.settings || {}) } };
        // merge: union of seen / mastered / bookmarks, keep the newer "last"
        const last = [st.last, incoming.last].filter(Boolean).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0] || null;
        return {
          ...st,
          seen: { ...incoming.seen, ...st.seen },
          mastered: { ...(incoming.mastered || {}), ...st.mastered },
          bookmarks: { ...(incoming.bookmarks || {}), ...st.bookmarks },
          last,
        };
      });
    }, []),
  };
  return [s, actions];
}

export function topicStats(topic, st) {
  const total = topic.slides.length;
  let seen = 0, mastered = 0, bookmarks = 0;
  for (const s of topic.slides) {
    if (st.seen[s.id]) seen++;
    if (st.mastered[s.id]) mastered++;
    if (st.bookmarks[s.id]) bookmarks++;
  }
  return { total, seen, mastered, bookmarks, pct: total ? Math.round((seen / total) * 100) : 0, masteredPct: total ? Math.round((mastered / total) * 100) : 0 };
}
