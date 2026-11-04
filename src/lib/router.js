import { useEffect, useState, useCallback } from 'react';

// Tiny path-based router. Works with the Vercel SPA rewrite in vercel.json.
export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    if (replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0 });
  }, []);
  return [path, navigate];
}

export function parsePath(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'home' };
  if (parts[0] === 'topic' && parts[1]) {
    return { view: 'topic', topicId: parts[1], slideIndex: parts[2] ? Math.max(0, parseInt(parts[2], 10) - 1 || 0) : 0 };
  }
  if (parts[0] === 'important') {
    if (parts[1]) return { view: 'important', groupId: decodeURIComponent(parts[1]), index: Math.max(0, (parseInt(parts[2], 10) || 1) - 1) };
    return { view: 'important' };
  }
  if (parts[0] === 'bookmarks') return { view: 'bookmarks' };
  if (parts[0] === 'search') return { view: 'search' };
  if (parts[0] === 'settings') return { view: 'settings' };
  return { view: 'home' };
}
