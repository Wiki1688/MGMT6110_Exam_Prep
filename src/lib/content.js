// Loads /content/slides.json plus any extra files listed in /content/index.json
// and merges them into one { topics: [...] } structure.
// Merge rule: a topic with the same id is merged (slides appended, de-duplicated by slide id).
// A new topic id is appended. Topics are finally sorted by id (T01, T02, ...).

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

export function mergeContent(base, extras) {
  const topics = new Map();
  const add = (t) => {
    if (!t || !t.id) return;
    const existing = topics.get(t.id);
    if (!existing) {
      topics.set(t.id, { ...t, slides: [...(t.slides || [])] });
      return;
    }
    const seen = new Set(existing.slides.map((s) => s.id));
    for (const s of t.slides || []) {
      if (!seen.has(s.id)) { existing.slides.push(s); seen.add(s.id); }
      else {
        // same slide id in a later file replaces the old one (lets you fix a slide)
        const i = existing.slides.findIndex((x) => x.id === s.id);
        existing.slides[i] = s;
      }
    }
    // later files may update title/colour/carry
    for (const k of ['title', 'week', 'color', 'carry']) if (t[k]) existing[k] = t[k];
  };
  (base.topics || []).forEach(add);
  extras.forEach((file) => (file.topics || []).forEach(add));
  const list = [...topics.values()].sort((a, b) => a.id.localeCompare(b.id));
  // number slides and give every slide a stable id if missing
  list.forEach((t) => t.slides.forEach((s, i) => { if (!s.id) s.id = `${t.id}-${String(i + 1).padStart(2, '0')}`; }));
  return { ...base, topics: list, loadedFiles: 1 + extras.length };
}

export async function loadContent() {
  const base = await fetchJson('/content/slides.json');
  let names = [];
  try { names = await fetchJson('/content/index.json'); } catch { names = []; }
  if (!Array.isArray(names)) names = [];
  const extras = [];
  const warnings = [];
  for (const name of names) {
    try { extras.push(await fetchJson(`/content/extra/${name}`)); }
    catch (e) { warnings.push(`Could not load extra file ${name}: ${e.message}`); }
  }
  const merged = mergeContent(base, extras);
  merged.warnings = warnings;
  return merged;
}

export function resolveImage(src) {
  if (!src) return '';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('/')) return src;
  return `/content/${src}`;
}
