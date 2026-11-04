import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { restoreFromMirror, getState } from './lib/store.js';
import './styles.css';

const READER_REOPEN_MS = 12 * 3600 * 1000;

restoreFromMirror().finally(() => {
  // Re-open the reader at the same topic + slide when the app is relaunched at "/" (e.g. the
  // home-screen icon after Android closed the app), if the reader was open in the last 12 hours.
  try {
    const last = getState().last;
    if (window.location.pathname === '/' && last && last.open && Date.now() - (last.ts || 0) < READER_REOPEN_MS) {
      window.history.replaceState({}, '', `/topic/${last.topicId}/${(last.slideIndex || 0) + 1}`);
    }
  } catch { /* ignore */ }
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// Service worker: skipWaiting + clients.claim mean a new deploy takes over at once;
// if this page was already controlled by an older worker, show the refresh toast.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      window.__mgmt6110UpdateReady = true;
      window.dispatchEvent(new Event('mgmt6110:update'));
    });
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
