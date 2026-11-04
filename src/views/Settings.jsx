import React, { useRef, useState } from 'react';
import { usePersistState, countOn, parseImport } from '../lib/store.js';
import { formatVisited } from '../lib/dates.js';

export function downloadBackup(text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  a.href = url; a.download = `mgmt6110-exam-prep-backup-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const SIZES = ['S', 'M', 'L', 'XL'];
const THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];

export default function Settings({ store, actions, content }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [importMode, setImportMode] = useState('merge');
  const persist = usePersistState();

  const doExport = () => {
    downloadBackup(actions.exportJson());
    actions.markBackedUp();
    setMsg('Backup downloaded. Send it to yourself (WhatsApp, email) and import it on your other device.');
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { format } = parseImport(text);
      if (importMode === 'replace' && !window.confirm('Replace ALL progress on this device with the file?')) { e.target.value = ''; return; }
      actions.importJson(text, importMode);
      setMsg(`Imported ${file.name} (format ${format}, ${importMode === 'merge' ? 'merged: the latest mark for each slide wins' : 'replaced this device'}).`);
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    }
    e.target.value = '';
  };

  const doReset = () => {
    if (window.confirm('Reset all progress, mastered marks and bookmarks on this device?')) {
      actions.resetProgress();
      setMsg('Progress reset.');
    }
  };

  const seen = Object.keys(store.seen).filter((k) => !k.startsWith('imp:')).length, mastered = countOn(store.mastered), marks = countOn(store.bookmarks), impMarks = countOn(store.bookmarks, 'imp:');

  return (
    <div className="page settings">
      <h1 className="page-title">Settings</h1>

      <section className="card">
        <h2>Text size</h2>
        <div className="seg">
          {SIZES.map((s) => (
            <button key={s} className={store.settings.fontSize === s ? 'on' : ''} onClick={() => actions.setSetting('fontSize', s)}>{s}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Theme</h2>
        <div className="seg">
          {THEMES.map(([v, l]) => (
            <button key={v} className={store.settings.theme === v ? 'on' : ''} onClick={() => actions.setSetting('theme', v)}>{l}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Back up, restore and sync</h2>
        <p><span className={`status ${persist === 'protected' ? 'ok' : 'warn'}`} data-testid="persist-status">{persist === 'protected' ? 'Storage: protected' : persist === 'unknown' ? 'Storage: checking…' : 'Storage: may be cleared by the phone'}</span></p>
        <p className="muted">Progress is saved on this device the moment you tap (and copied to a second store in the browser). {persist === 'protected' ? 'The browser has agreed not to clear it.' : 'The phone may still clear it when storage runs low, so back up now and then.'} Import on another device to carry it over. "Merge" keeps both sides (the latest mark for each slide wins); "Replace" overwrites this device.</p>
        <p className="muted">On this device: {seen} seen · {mastered} mastered · {marks} marked · {impMarks} important starred · last backup {store.backupAt ? formatVisited(store.backupAt) : 'never'}.</p>
        <div className="row">
          <button className="btn primary" onClick={doExport}>Back up now</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import a backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} data-testid="import-input" />
        </div>
        <div className="seg small" aria-label="Import mode">
          <button className={importMode === 'merge' ? 'on' : ''} onClick={() => setImportMode('merge')}>Merge (default)</button>
          <button className={importMode === 'replace' ? 'on' : ''} onClick={() => setImportMode('replace')}>Replace</button>
        </div>
        {msg && <p className="notice">{msg}</p>}
      </section>

      <section className="card">
        <h2>Reset</h2>
        <button className="btn danger" onClick={doReset}>Reset all progress</button>
      </section>

      <section className="card">
        <h2>About</h2>
        <p className="muted">MGMT6110 Exam Prep · content v{content.version} · {content.topics.length} topics · {content.topics.reduce((n, t) => n + t.slides.length, 0)} slides.</p>
        <p className="muted">Keyboard: ← → to move, B to mark, M to master, Esc for home.</p>
      </section>
    </div>
  );
}
