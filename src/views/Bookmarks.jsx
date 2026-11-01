import React from 'react';
import { Star } from '../components/Icons.jsx';

export default function Bookmarks({ content, store, actions, navigate }) {
  const groups = content.topics
    .map((t) => ({ topic: t, slides: t.slides.map((s, i) => ({ s, i })).filter(({ s }) => store.bookmarks[s.id]) }))
    .filter((g) => g.slides.length);
  const count = groups.reduce((n, g) => n + g.slides.length, 0);

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
                    {store.mastered[s.id] && <span className="tag">mastered</span>}
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
