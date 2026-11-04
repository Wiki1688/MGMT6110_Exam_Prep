import React from 'react';
import { Star } from '../components/Icons.jsx';
import { isOn } from '../lib/store.js';

export default function Bookmarks({ content, store, actions, navigate }) {
  const groups = content.topics
    .map((t) => ({ topic: t, slides: t.slides.map((s, i) => ({ s, i })).filter(({ s }) => isOn(store.bookmarks, s.id)) }))
    .filter((g) => g.slides.length);
  const impMarked = (content.important?.groups || []).flatMap((g) => g.slides.map((s, i) => ({ g, s, i }))).filter(({ s }) => isOn(store.bookmarks, s.key));
  const count = groups.reduce((n, g) => n + g.slides.length, 0) + impMarked.length;

  return (
    <div className="page">
      <h1 className="page-title">Marked slides <span className="count">{count}</span></h1>
      {count === 0 && (
        <div className="empty">
          <Star width={40} height={40} />
          <p>Nothing marked yet. Tap the star on any slide to keep it here for a final sweep before the exam.</p>
          <button className="btn primary" onClick={() => navigate('/')}>Go to topics</button>
        </div>
      )}
      {impMarked.length > 0 && (
        <section className="bm-group" style={{ '--topic': 'var(--accent)' }}>
          <h2><span className="topic-id">★</span> Important slides</h2>
          <ul className="bm-list">
            {impMarked.map(({ g, s, i }) => (
              <li key={s.key}>
                <button className="bm-row" onClick={() => navigate(`/important/${encodeURIComponent(g.id)}/${i + 1}`)}>
                  <span className="n">{s.topic || '★'}</span>
                  <span className="t"><span className="bm-title">{s.title}</span>{s.remember[0] && <span className="bm-mem">{s.remember[0]}</span>}</span>
                </button>
                <button className="icon-btn star-btn on" onClick={() => actions.toggleBookmark(s.key)} aria-label="Remove star"><Star filled /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map(({ topic, slides }) => (
        <section key={topic.id} className="bm-group" style={{ '--topic': topic.color }}>
          <h2><span className="topic-id">{topic.id}</span> {topic.title}</h2>
          <ul className="bm-list">
            {slides.map(({ s, i }) => (
              <li key={s.id}>
                <button className="bm-row" onClick={() => navigate(`/topic/${topic.id}/${i + 1}`)}>
                  <span className="n">{i + 1}</span>
                  <span className="t">
                    <span className="bm-title">{s.title}</span>
                    {s.memorise && <span className="bm-mem">{s.memorise}</span>}
                    {isOn(store.mastered, s.id) && <span className="tag">mastered</span>}
                  </span>
                </button>
                <button className="icon-btn star-btn on" onClick={() => actions.toggleBookmark(s.id)} aria-label="Remove bookmark"><Star filled /></button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
