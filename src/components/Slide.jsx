import React, { useState, useEffect } from 'react';
import { resolveImage } from '../lib/content.js';
import { Bulb, Alert, Brain, Check } from './Icons.jsx';

const KIND_LABEL = {
  concept: 'Concept', list: 'Key points', compare: 'Compare', diagram: 'Diagram', example: 'Example',
  exam: 'Exam practice', recap: 'Recap', memorise: 'Memorise',
};

function Bullets({ items, className = '' }) {
  if (!items || !items.length) return null;
  return (
    <ul className={`bullets ${className}`}>
      {items.map((b, i) => <li key={i}>{b}</li>)}
    </ul>
  );
}

function Table({ table }) {
  if (!table || !table.headers) return null;
  return (
    <div className="table-wrap">
      <table className="cmp">
        <thead><tr>{table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {(table.rows || []).map((r, i) => (
            <tr key={i}>{r.map((c, j) => j === 0 ? <th scope="row" key={j}>{c}</th> : <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Diagram({ src, alt }) {
  const [zoom, setZoom] = useState(false);
  const url = resolveImage(src);
  if (!url) return null;
  return (
    <>
      <figure className="diagram" onClick={() => setZoom(true)}>
        <img src={url} alt={alt} loading="lazy" />
        <figcaption>Tap to enlarge · pinch to zoom</figcaption>
      </figure>
      {zoom && (
        <div className="zoom-layer" role="dialog" aria-label="Enlarged diagram">
          <div className="zoom-scroll">
            <img src={url} alt={alt} />
          </div>
          <button className="zoom-close" onClick={() => setZoom(false)}>Close</button>
        </div>
      )}
    </>
  );
}

function Mcq({ slide }) {
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setPicked(null); setRevealed(false); }, [slide.id]);
  const opts = slide.options || [];
  const ans = typeof slide.answer === 'number' ? slide.answer : -1;
  return (
    <div className="mcq">
      {opts.map((o, i) => {
        let cls = 'opt';
        if (revealed && i === ans) cls += ' correct';
        else if (revealed && picked === i) cls += ' wrong';
        else if (picked === i) cls += ' picked';
        return (
          <button key={i} className={cls} onClick={() => setPicked(i)} disabled={revealed}>
            <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
            <span>{o}</span>
            {revealed && i === ans && <Check className="opt-check" />}
          </button>
        );
      })}
      {!revealed ? (
        <button className="btn primary" onClick={() => setRevealed(true)}>Reveal answer</button>
      ) : (
        <div className="explain">
          <strong>{picked === ans ? 'Correct.' : picked === null ? 'Answer:' : 'Not quite.'}</strong>{' '}
          {ans >= 0 && <span>The answer is <b>{String.fromCharCode(65 + ans)}</b>.</span>}
          {slide.explanation && <p>{slide.explanation}</p>}
        </div>
      )}
    </div>
  );
}

/** The notes that move to the side panel on the unfolded (two-pane) layout. */
export function SlideNotes({ slide }) {
  const kind = slide.kind || 'concept';
  return (
    <>
      {kind !== 'memorise' && slide.memorise && <div className="memorise"><Brain /><div>{slide.memorise}</div></div>}
      {slide.tip && <div className="callout tip"><Bulb /><div><b>Exam tip</b> {slide.tip}</div></div>}
      {slide.trap && <div className="callout trap"><Alert /><div><b>Trap</b> {slide.trap}</div></div>}
    </>
  );
}

export default function Slide({ slide, topic, notesAside = false }) {
  const kind = slide.kind || 'concept';
  return (
    <article className={`slide kind-${kind}`} style={{ '--topic': topic.color }}>
      <div className="slide-kind" style={{ color: topic.color }}>{KIND_LABEL[kind] || kind}</div>
      <h2 className="slide-title">{slide.title}</h2>

      {kind === 'memorise' ? (
        <>
          <div className="memorise big"><Brain /><div>{slide.memorise}</div></div>
          <Bullets items={slide.body} />
        </>
      ) : (
        <>
          {kind === 'compare' && <Table table={slide.table} />}
          {kind === 'diagram' && <Diagram src={slide.image} alt={slide.title} />}
          {kind === 'example' ? (
            <div className="example-box"><Bullets items={slide.body} /></div>
          ) : kind === 'exam' ? (
            <div className="question"><Bullets items={slide.body} className="plain" /></div>
          ) : kind === 'recap' ? (
            <Bullets items={slide.body} className="recap" />
          ) : (
            <Bullets items={slide.body} />
          )}
          {kind !== 'compare' && slide.table && <Table table={slide.table} />}
          {kind !== 'diagram' && slide.image && <Diagram src={slide.image} alt={slide.title} />}
          {kind === 'exam' && <Mcq slide={slide} />}
          {!notesAside && slide.memorise && <div className="memorise"><Brain /><div>{slide.memorise}</div></div>}
        </>
      )}

      {!notesAside && slide.tip && <div className="callout tip"><Bulb /><div><b>Exam tip</b> {slide.tip}</div></div>}
      {!notesAside && slide.trap && <div className="callout trap"><Alert /><div><b>Trap</b> {slide.trap}</div></div>}
      {slide.source && <p className="slide-source">{slide.source}</p>}
    </article>
  );
}
