import React, { useMemo, useState, useEffect, useRef } from 'react';

function textOf(s) {
  const parts = [s.title, ...(s.body || []), s.memorise, s.tip, s.trap, s.explanation, ...(s.options || [])];
  if (s.table) parts.push(...(s.table.headers || []), ...(s.table.rows || []).flat());
  return parts.filter(Boolean).join(' \n ');
}

function snippet(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 50);
  const end = Math.min(text.length, i + q.length + 70);
  const before = text.slice(start, i), hit = text.slice(i, i + q.length), after = text.slice(i + q.length, end);
  return <>{start > 0 && '…'}{before}<mark>{hit}</mark>{after}{end < text.length && '…'}</>;
}

export default function Search({ content, navigate }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const index = useMemo(() => content.topics.flatMap((t) => t.slides.map((s, i) => ({ t, s, i, text: textOf(s) }))), [content]);
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const words = term.split(/\s+/);
    return index
      .map((r) => {
        const low = r.text.toLowerCase();
        if (!words.every((w) => low.includes(w))) return null;
        let score = 0;
        if (r.s.title.toLowerCase().includes(term)) score += 10;
        if ((r.s.memorise || '').toLowerCase().includes(term)) score += 5;
        score += words.length;
        return { ...r, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 60);
  }, [q, index]);

  return (
    <div className="page">
      <h1 className="page-title">Search</h1>
      <input ref={ref} className="search-box" type="search" placeholder="Search titles, bullets, memorise lines…" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && <p className="muted">{results.length} result{results.length === 1 ? '' : 's'}</p>}
      <ul className="bm-list">
        {results.map(({ t, s, i, text }) => (
          <li key={s.id} style={{ '--topic': t.color }}>
            <button className="bm-row" onClick={() => navigate(`/topic/${t.id}/${i + 1}`)}>
              <span className="n">{t.id}</span>
              <span className="t">
                <span className="bm-title">{s.title}</span>
                <span className="bm-mem">{snippet(text, q.trim())}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
