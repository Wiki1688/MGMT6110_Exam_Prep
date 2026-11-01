import React from 'react';
import ProgressRing from '../components/ProgressRing.jsx';
import { topicStats } from '../lib/store.js';
import { EXAMS, daysUntil, daysLabel, formatVisited } from '../lib/dates.js';
import { Star, Play, Check } from '../components/Icons.jsx';

export default function Home({ content, store, navigate }) {
  const topics = content.topics;
  const totals = topics.reduce((acc, t) => {
    const s = topicStats(t, store);
    acc.total += s.total; acc.seen += s.seen; acc.mastered += s.mastered; acc.bookmarks += s.bookmarks;
    return acc;
  }, { total: 0, seen: 0, mastered: 0, bookmarks: 0 });
  const pct = totals.total ? Math.round((totals.seen / totals.total) * 100) : 0;
  const last = store.last && topics.find((t) => t.id === store.last.topicId) ? store.last : null;
  const lastTopic = last && topics.find((t) => t.id === last.topicId);

  return (
    <div className="page home">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">{content.course || 'MGMT6110'}</p>
          <h1>Exam Prep</h1>
        </div>
        <ProgressRing pct={pct} size={104} sub={`${totals.seen}/${totals.total} seen`} />
      </header>
      <div className="chips">
        {EXAMS.map((e) => {
          const n = daysUntil(e.date);
          return (
            <span key={e.key} className={`chip ${e.key}`}>
              <span className="chip-main"><b>{e.label}</b> · {e.when}</span>
              <em>{daysLabel(n)}</em>
            </span>
          );
        })}
      </div>

      <div className="stats-row">
        <div className="stat"><Check /><span><b>{totals.mastered}</b> mastered</span></div>
        <div className="stat"><Star filled /><span><b>{totals.bookmarks}</b> marked</span></div>
        <div className="stat"><span><b>{topics.length}</b> topics</span></div>
      </div>

      {lastTopic ? (
        <button className="resume" style={{ '--topic': lastTopic.color }} onClick={() => navigate(`/topic/${lastTopic.id}/${last.slideIndex + 1}`)}>
          <Play />
          <div>
            <div className="resume-label">Resume where I left off</div>
            <div className="resume-title">{lastTopic.id} · {lastTopic.title}</div>
            <div className="resume-sub">Slide {last.slideIndex + 1} of {lastTopic.slides.length} · {formatVisited(last.ts)}</div>
          </div>
        </button>
      ) : (
        <button className="resume" style={{ '--topic': topics[0]?.color || '#2563EB' }} onClick={() => topics[0] && navigate(`/topic/${topics[0].id}/1`)}>
          <Play />
          <div>
            <div className="resume-label">Start revising</div>
            <div className="resume-title">Begin with {topics[0]?.id} · {topics[0]?.title}</div>
          </div>
        </button>
      )}

      <h2 className="section-title">The course, in order</h2>
      <ol className="topic-grid">
        {topics.map((t) => {
          const s = topicStats(t, store);
          const done = s.total > 0 && s.seen === s.total;
          return (
            <li key={t.id}>
              <button className={`topic-card${done ? ' done' : ''}`} style={{ '--topic': t.color }} onClick={() => navigate(`/topic/${t.id}/1`)}>
                <div className="topic-head">
                  <span className="topic-id">{t.id}</span>
                  <span className="topic-week">{t.week}</span>
                  {s.bookmarks > 0 && <span className="topic-marks"><Star filled width={16} height={16} /> {s.bookmarks}</span>}
                </div>
                <div className="topic-title">{t.title}</div>
                {t.carry && <div className="topic-carry">{t.carry}</div>}
                <div className="topic-foot">
                  <div className="bar"><span style={{ width: `${s.pct}%` }} /></div>
                  <span className="topic-pct">{s.pct}% · {s.total} slides{s.mastered ? ` · ${s.mastered} mastered` : ''}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      {content.warnings?.length > 0 && (
        <div className="callout trap"><div>{content.warnings.join(' ')}</div></div>
      )}
      <p className="footnote">Content v{content.version} · {content.loadedFiles} file{content.loadedFiles === 1 ? '' : 's'} loaded</p>
    </div>
  );
}
