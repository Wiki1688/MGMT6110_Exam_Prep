import React, { useEffect, useState } from 'react';
import { usePath, parsePath } from './lib/router.js';
import { loadContent } from './lib/content.js';
import { useStore, requestPersistentStorage } from './lib/store.js';
import Nav from './components/Nav.jsx';
import UpdateToast from './components/UpdateToast.jsx';
import Home from './views/Home.jsx';
import Topic from './views/Topic.jsx';
import Bookmarks from './views/Bookmarks.jsx';
import Search from './views/Search.jsx';
import Settings from './views/Settings.jsx';
import { ImportantGallery, ImportantViewer } from './views/Important.jsx';

export default function App() {
  const [path, navigate] = usePath();
  const [store, actions] = useStore();
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent().then(setContent).catch((e) => setError(e.message));
    requestPersistentStorage(); // ask once per start; shown in Settings
  }, []);

  // apply theme + font size to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontSize = store.settings.fontSize;
    const theme = store.settings.theme;
    if (theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = theme;
    const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0B1220' : '#111827';
  }, [store.settings]);

  const route = parsePath(path);
  const inReader = route.view === 'topic';
  const inViewer = route.view === 'important' && !!route.groupId;

  // Leaving the reader on purpose (Home, Search...) means "do not reopen it on next launch".
  useEffect(() => {
    if (content && !inReader) actions.closeReader();
  }, [content, inReader, actions]);

  let body;
  if (error) body = <div className="page"><h1 className="page-title">Could not load content</h1><p className="muted">{error}</p><p className="muted">Check that <code>public/content/slides.json</code> exists and is valid JSON.</p></div>;
  else if (!content) body = <div className="page loading"><div className="spinner" /><p className="muted">Loading slides…</p></div>;
  else if (route.view === 'topic') body = <Topic content={content} topicId={route.topicId} slideIndex={route.slideIndex} store={store} actions={actions} navigate={navigate} />;
  else if (inViewer) body = <ImportantViewer content={content} groupId={route.groupId} index={route.index} store={store} actions={actions} navigate={navigate} />;
  else if (route.view === 'important') body = <ImportantGallery content={content} store={store} navigate={navigate} />;
  else if (route.view === 'bookmarks') body = <Bookmarks content={content} store={store} actions={actions} navigate={navigate} />;
  else if (route.view === 'search') body = <Search content={content} navigate={navigate} />;
  else if (route.view === 'settings') body = <Settings content={content} store={store} actions={actions} />;
  else body = <Home content={content} store={store} actions={actions} navigate={navigate} />;

  return (
    <div className={`app${inReader ? ' in-reader' : ''}${inViewer ? ' in-viewer' : ''}`}>
      <main>{body}</main>
      {!inReader && !inViewer && <Nav path={path} navigate={navigate} />}
      <UpdateToast />
    </div>
  );
}
