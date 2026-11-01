import React, { useRef, useState } from 'react';

const SIZES = ['S', 'M', 'L', 'XL'];
const THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];

export default function Settings({ store, actions, content }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [importMode, setImportMode] = useState('merge');

  const doExport = () => {
    const text = actions.exportJson();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    a.href = url; a.download = `mgmt6110-progress-${stamp}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg('Progress file downloaded. Send it to your other device (AirDrop, WhatsApp, email) and import it there.');
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      actions.importJson(text, importMode);
      setMsg(`Imported ${file.name} (${importMode}).`);
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

  const seen = Object.keys(store.seen).length, mastered = Object.keys(store.mastered).length, marks = Object.keys(store.bookmarks).length;

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
        <h2>Sync progress between phone and laptop</h2>
        <p className="muted">Progress is saved on this device only. Export here, then import on the other device. "Merge" keeps both sides; "Replace" overwrites this device.</p>
        <p className="muted">On this device: {seen} seen · {mastered} mastered · {marks} marked.</p>
        <div className="row">
          <button className="btn primary" onClick={doExport}>Export progress</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import progress</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
        </div>
        <div className="seg small">
          <button className={importMode === 'merge' ? 'on' : ''} onClick={() => setImportMode('merge')}>Merge</button>
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
