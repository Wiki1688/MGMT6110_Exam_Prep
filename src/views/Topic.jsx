import React, { useEffect, useRef, useState, useCallback } from 'react';
import Slide, { SlideNotes } from '../components/Slide.jsx';
import { useMedia, Q_SPLIT } from '../lib/useMedia.js';
import { Star, Check, ChevronLeft, ChevronRight, Grid } from '../components/Icons.jsx';
import { topicStats, isOn } from '../lib/store.js';

export default function Topic({ content, topicId, slideIndex, store, actions, navigate }) {
  const topics = content.topics;
  const ti = topics.findIndex((t) => t.id === topicId);
  const topic = topics[ti];
  const [showGrid, setShowGrid] = useState(false);
  const split = useMedia(Q_SPLIT); // unfolded inner screen: slide left, notes right
  const [anim, setAnim] = useState('');
  const touch = useRef(null);

  const total = topic ? topic.slides.length : 0;
  const idx = Math.min(Math.max(0, slideIndex), Math.max(0, total - 1));
  const slide = topic && topic.slides[idx];

  const goTo = useCallback((i, dir) => {
    if (!topic) return;
    if (i < 0 || i >= total) return;
    setAnim(dir === 'next' ? 'slide-in-right' : dir === 'prev' ? 'slide-in-left' : '');
    navigate(`/topic/${topic.id}/${i + 1}`, { replace: true });
  }, [topic, total, navigate]);

  const next = useCallback(() => {
    if (idx < total - 1) goTo(idx + 1, 'next');
    else if (ti < topics.length - 1) navigate(`/topic/${topics[ti + 1].id}/1`);
  }, [idx, total, goTo, ti, topics, navigate]);
  const prev = useCallback(() => {
    if (idx > 0) goTo(idx - 1, 'prev');
    else if (ti > 0) navigate(`/topic/${topics[ti - 1].id}/${topics[ti - 1].slides.length}`);
  }, [idx, goTo, ti, topics, navigate]);

  // record "seen" + "last visited"
  useEffect(() => {
    if (!slide) return;
    actions.markSeen(slide.id);
    actions.setLast(topic.id, idx);
  }, [slide?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'b' || e.key === 'B') slide && actions.toggleBookmark(slide.id);
      else if (e.key === 'm' || e.key === 'M') slide && actions.toggleMastered(slide.id);
      else if (e.key === 'Escape') { if (showGrid) setShowGrid(false); else navigate('/'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, slide, actions, navigate, showGrid]);

  // scroll to top on slide change
  useEffect(() => { window.scrollTo({ top: 0 }); }, [slide?.id]);

  if (!topic) {
    return <div className="page"><p>Topic not found.</p><button className="btn" onClick={() => navigate('/')}>Back home</button></div>;
  }

  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    const dt = Date.now() - touch.current.t;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 800) { dx < 0 ? next() : prev(); }
  };

  const stats = topicStats(topic, store);
  const isMarked = !!isOn(store.bookmarks, slide.id);
  const isMastered = !!isOn(store.mastered, slide.id);

  return (
    <div className="page topic" style={{ '--topic': topic.color }}>
      <header className="topic-bar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back to home"><ChevronLeft /></button>
        <div className="topic-bar-text">
          <div className="topic-bar-id">{topic.id} · {topic.week}</div>
          <div className="topic-bar-title">{topic.title}</div>
        </div>
        <button className="icon-btn" onClick={() => setShowGrid((v) => !v)} aria-label="All slides"><Grid /></button>
      </header>
      <div className="progress"><span style={{ width: `${((idx + 1) / total) * 100}%` }} /></div>

      {showGrid ? (
        <div className="grid-view">
          <h3>Slides in this topic · {stats.seen}/{total} seen</h3>
          <ol className="slide-list">
            {topic.slides.map((s, i) => (
              <li key={s.id}>
                <button className={`slide-row${i === idx ? ' current' : ''}`} onClick={() => { setShowGrid(false); goTo(i); }}>
                  <span className="n">{i + 1}</span>
                  <span className="t">{s.title}</span>
                  <span className="flags">
                    {isOn(store.mastered, s.id) && <Check width={18} height={18} />}
                    {isOn(store.bookmarks, s.id) && <Star filled width={18} height={18} />}
                    {store.seen[s.id] && !isOn(store.mastered, s.id) && <i className="dot" />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className={`reader-layout${split ? ' split' : ''}`}>
          <div className="reader" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-slide={slide.id} data-index={idx}>
            <div className="tap-zone left" onClick={prev} aria-hidden />
            <div className="tap-zone right" onClick={next} aria-hidden />
            <div key={slide.id} className={`slide-wrap ${anim}`}>
              <Slide slide={slide} topic={topic} notesAside={split} />
            </div>
          </div>
          {split && (
            <aside className="reader-aside" aria-label="Notes">
              <SlideNotes slide={slide} />
              {!slide.memorise && !slide.tip && !slide.trap && <p className="muted aside-empty">No tip or trap on this slide.</p>}
              <div className="aside-card">
                <h3><Star filled width={18} height={18} /> Marked in {topic.id} <span className="muted">({stats.bookmarks})</span></h3>
                {stats.bookmarks === 0 ? <p className="muted">Tap “Mark” to keep a slide here.</p> : (
                  <ol className="aside-list">
                    {topic.slides.map((s, i) => isOn(store.bookmarks, s.id) && (
                      <li key={s.id}><button className={i === idx ? 'current' : ''} onClick={() => goTo(i)}><span className="n">{i + 1}</span> {s.title}</button></li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="aside-card">
                <h3>All slides · {stats.seen}/{total} seen</h3>
                <ol className="aside-list">
                  {topic.slides.map((s, i) => (
                    <li key={s.id}><button className={i === idx ? 'current' : ''} onClick={() => goTo(i, i > idx ? 'next' : 'prev')}><span className="n">{i + 1}</span> {s.title}{isOn(store.mastered, s.id) ? ' ✓' : ''}</button></li>
                  ))}
                </ol>
              </div>
            </aside>
          )}
        </div>
      )}

      <footer className="reader-foot">
        <button className="icon-btn big" onClick={prev} disabled={idx === 0 && ti === 0} aria-label="Previous slide"><ChevronLeft /></button>
        <div className="foot-mid">
          <div className="counter">{idx + 1} / {total}</div>
          <div className="foot-actions">
            <button className={`pill${isMastered ? ' on' : ''}`} onClick={() => actions.toggleMastered(slide.id)} aria-pressed={isMastered}>
              <Check width={18} height={18} /> {isMastered ? 'Mastered' : 'Master'}
            </button>
            <button className={`pill star${isMarked ? ' on' : ''}`} onClick={() => actions.toggleBookmark(slide.id)} aria-pressed={isMarked}>
              <Star filled={isMarked} width={18} height={18} /> {isMarked ? 'Marked' : 'Mark'}
            </button>
          </div>
        </div>
        <button className="icon-btn big" onClick={next} disabled={idx === total - 1 && ti === topics.length - 1} aria-label="Next slide"><ChevronRight /></button>
      </footer>
    </div>
  );
}
