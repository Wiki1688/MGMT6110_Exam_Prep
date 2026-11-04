import React from 'react';
import ProgressRing from '../components/ProgressRing.jsx';
import { topicStats, countOn, exportText } from '../lib/store.js';
import { FINAL, daysUntil, examMessage, formatVisited } from '../lib/dates.js';
import { Star, Play, Check, Images } from '../components/Icons.jsx';
import { downloadBackup } from './Settings.jsx';

const BACKUP_EVERY_MS = 3 * 86400000;

export default function Home({ content, store, actions, navigate }) {
  const [later, setLater] = React.useState(() => { try { return sessionStorage.getItem('mgmt6110:backupLater') === '1'; } catch { return false; } });
  const imp = content.important || { groups: [], total: 0 };
  const impSeen = imp.groups.reduce((n, g) => n + g.slides.filter((s) => store.seen[s.key]).length, 0);
  const impStarred = countOn(store.bookmarks, 'imp:');
  const n = daysUntil(FINAL.date);
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
        <span className={`chip final${n === 0 ? ' exam-day' : ''}`} data-testid="countdown">
          <span className="chip-main"><b>{FINAL.label}</b> · {FINAL.when}</span>
          <em>{examMessage(n)}</em>
        </span>
      </div>

      {totals.seen > 20 && Date.now() - (store.backupAt || 0) > BACKUP_EVERY_MS && !later && (
        <div className="notice backup" role="status" data-testid="backup-banner">
          <b>Back up your progress.</b> {store.backupAt ? `Last backup ${formatVisited(store.backupAt)}.` : 'No backup yet.'} One tap saves a small file you can import on any device.
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={() => { downloadBackup(exportText()); actions.markBackedUp(); }}>Back up now</button>
            <button className="btn" onClick={() => { try { sessionStorage.setItem('mgmt6110:backupLater', '1'); } catch { /* ignore */ } setLater(true); }}>Later</button>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat"><Check /><span><b>{totals.mastered}</b> mastered</span></div>
        <div className="stat"><Star filled /><span><b data-stat="marked">{totals.bookmarks}</b> marked</span></div>
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

      <button className="imp-home" onClick={() => navigate('/important')} data-testid="imp-home">
        <Images />
        <div>
          <div className="resume-label">Important slides</div>
          <div className="resume-title">{imp.total ? `${imp.total} slides to know cold` : 'Coming soon'}</div>
          <div className="resume-sub">{imp.total ? `${impSeen}/${imp.total} seen · ${impStarred} starred · pinch to zoom` : 'Added when important.json is published'}</div>
        </div>
      </button>

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
