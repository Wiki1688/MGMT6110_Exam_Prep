import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ZoomImage from '../components/ZoomImage.jsx';
import { resolveImage } from '../lib/content.js';
import { isOn } from '../lib/store.js';
import { Star, Check, ChevronLeft, ChevronRight, Close } from '../components/Icons.jsx';

/** Gallery of "Important slides" (from /content/important.json). */
export function ImportantGallery({ content, store, navigate }) {
  const { groups, total } = content.important || { groups: [], total: 0 };
  const [onlyMarked, setOnlyMarked] = useState(false);
  const topicColor = useMemo(() => new Map(content.topics.map((t) => [t.id, t.color])), [content]);
  const seen = groups.reduce((n, g) => n + g.slides.filter((s) => store.seen[s.key]).length, 0);
  const marked = groups.reduce((n, g) => n + g.slides.filter((s) => isOn(store.bookmarks, s.key)).length, 0);
  const last = store.lastImportant && groups.find((g) => g.id === store.lastImportant.groupId) ? store.lastImportant : null;

  return (
    <div className="page important">
      <h1 className="page-title">Important slides <span className="count">{total}</span></h1>
      {total === 0 ? (
        <div className="empty">
          <p>No important slides yet. They appear here when <code>public/content/important.json</code> is added.</p>
        </div>
      ) : (
        <>
          <p className="muted">The slides to know cold before 12 Nov. Tap one to open it full screen: pinch or double-tap to zoom, swipe for the next one. {seen}/{total} seen · {marked} starred.</p>
          <div className="imp-tools">
            {last && <button className="btn primary" onClick={() => navigate(`/important/${encodeURIComponent(last.groupId)}/${last.index + 1}`)}>Continue where I stopped</button>}
            <div className="seg small">
              <button className={!onlyMarked ? 'on' : ''} onClick={() => setOnlyMarked(false)}>All</button>
              <button className={onlyMarked ? 'on' : ''} onClick={() => setOnlyMarked(true)}>Starred only</button>
            </div>
          </div>
          {groups.map((g) => {
            const list = g.slides.map((s, i) => ({ s, i })).filter(({ s }) => !onlyMarked || isOn(store.bookmarks, s.key));
            if (!list.length) return null;
            return (
              <section key={g.id} className="imp-group">
                <h2>{g.title} {g.week && <span className="muted">· {g.week}</span>}</h2>
                <ul className="imp-grid">
                  {list.map(({ s, i }) => (
                    <li key={s.id}>
                      <button className="imp-card" style={{ '--topic': topicColor.get(s.topic) || 'var(--accent)' }} onClick={() => navigate(`/important/${encodeURIComponent(g.id)}/${i + 1}`)} data-testid="imp-card">
                        <span className="imp-thumb"><img src={resolveImage(s.image)} alt="" loading="lazy" /></span>
                        <span className="imp-meta">
                          {s.topic && <span className="topic-id">{s.topic}</span>}
                          <span className="imp-title">{s.title || `Slide ${i + 1}`}</span>
                        </span>
                        <span className="imp-flags">
                          {isOn(store.bookmarks, s.key) && <Star filled width={18} height={18} />}
                          {store.seen[s.key] ? <Check width={18} height={18} className="seen" /> : <i className="new">new</i>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

/** Full-screen viewer: zoomable image, "remember" notes, star, seen tracking, swipe/arrow to move. */
export function ImportantViewer({ content, groupId, index, store, actions, navigate }) {
  const groups = content.important?.groups || [];
  const flat = useMemo(() => groups.flatMap((g) => g.slides.map((s, i) => ({ g, s, i }))), [groups]);
  const pos = flat.findIndex((x) => x.g.id === groupId && x.i === index);
  const cur = pos >= 0 ? flat[pos] : flat.find((x) => x.g.id === groupId) || flat[0];
  const at = cur ? flat.indexOf(cur) : -1;

  const go = useCallback((k) => {
    const n = flat[k];
    if (n) navigate(`/important/${encodeURIComponent(n.g.id)}/${n.i + 1}`, { replace: true });
  }, [flat, navigate]);
  const next = useCallback(() => go(at + 1), [go, at]);
  const prev = useCallback(() => go(at - 1), [go, at]);
  const close = useCallback(() => navigate('/important'), [navigate]);

  useEffect(() => {
    if (!cur) return;
    actions.markSeen(cur.s.key);
    actions.setLastImportant(cur.g.id, cur.i);
  }, [cur?.s.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
      else if ((e.key === 'b' || e.key === 's') && cur) actions.toggleBookmark(cur.s.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, close, cur, actions]);

  if (!cur) {
    return <div className="page"><p>Slide not found.</p><button className="btn" onClick={close}>Back to Important slides</button></div>;
  }
  const { g, s } = cur;
  const starred = isOn(store.bookmarks, s.key);
  const topic = content.topics.find((t) => t.id === s.topic);

  return (
    <div className="viewer" role="dialog" aria-label={s.title || 'Important slide'} style={{ '--topic': topic?.color || 'var(--accent)' }}>
      <header className="viewer-bar">
        <button className="icon-btn" onClick={close} aria-label="Close"><Close /></button>
        <div className="viewer-title">
          <div className="topic-bar-id">{g.title}{s.topic ? ` · ${s.topic}` : ''}</div>
          <div className="topic-bar-title">{s.title}</div>
        </div>
        <span className="viewer-count">{at + 1}/{flat.length}</span>
        <button className={`icon-btn star-toggle${starred ? ' on' : ''}`} onClick={() => actions.toggleBookmark(s.key)} aria-pressed={starred} aria-label={starred ? 'Remove star' : 'Star this slide'} data-testid="imp-star">
          <Star filled={starred} />
        </button>
      </header>
      <div className="viewer-body">
        <div className="viewer-stage">
          <ZoomImage key={s.key} src={resolveImage(s.image)} alt={s.title || ''} resetKey={s.key} onSwipe={(d) => (d === 'next' ? next() : prev())} />
          <button className="viewer-nav left" onClick={prev} disabled={at <= 0} aria-label="Previous"><ChevronLeft /></button>
          <button className="viewer-nav right" onClick={next} disabled={at >= flat.length - 1} aria-label="Next"><ChevronRight /></button>
        </div>
        {s.remember.length > 0 && (
          <div className="remember">
            <h3>Remember</h3>
            <ul>{s.remember.map((r, k) => <li key={k}>{r}</li>)}</ul>
            {topic && <button className="link-btn" onClick={() => navigate(`/topic/${topic.id}/1`)}>Open {topic.id} · {topic.title} →</button>}
          </div>
        )}
      </div>
    </div>
  );
}
