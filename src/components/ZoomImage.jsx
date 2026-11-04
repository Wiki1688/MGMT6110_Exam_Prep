import React, { useCallback, useEffect, useRef, useState } from 'react';

const MAX = 5;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Image with pinch-zoom, double-tap zoom and pan, built on pointer events + a CSS transform
 * (works on Android Chrome; `touch-action: none` stops the browser from zooming the page instead).
 * When not zoomed, a horizontal swipe calls onSwipe('next' | 'prev').
 * Ctrl/⌘ + mouse wheel zooms on a laptop.
 */
export default function ZoomImage({ src, alt, onSwipe, resetKey }) {
  const box = useRef(null);
  const img = useRef(null);
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const tRef = useRef(t);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  const apply = useCallback((next) => { tRef.current = next; setT(next); }, []);

  // keep the image inside the box (or centred when it is smaller than the box)
  const clamp = useCallback((n) => {
    const b = box.current, i = img.current;
    if (!b || !i) return n;
    const cw = b.clientWidth, ch = b.clientHeight;
    const ox = i.offsetLeft, oy = i.offsetTop, w = i.offsetWidth, h = i.offsetHeight;
    const s = Math.min(MAX, Math.max(1, n.s));
    const fit = (size, csize, o, v) => {
      const scaled = size * s;
      if (scaled <= csize) return (csize - scaled) / 2 - o;
      return Math.min(-o, Math.max(csize - o - scaled, v));
    };
    if (s === 1) return { s: 1, x: 0, y: 0 };
    return { s, x: fit(w, cw, ox, n.x), y: fit(h, ch, oy, n.y) };
  }, []);

  // zoom so that the point (cx, cy) in box coordinates stays under the finger
  const zoomAt = useCallback((cur, s1, cx, cy) => {
    const i = img.current;
    const ox = i ? i.offsetLeft : 0, oy = i ? i.offsetTop : 0;
    const px = cx - ox, py = cy - oy;
    const k = s1 / cur.s;
    return clamp({ s: s1, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k });
  }, [clamp]);

  useEffect(() => { apply({ s: 1, x: 0, y: 0 }); }, [resetKey, src, apply]);
  useEffect(() => {
    const on = () => apply(clamp(tRef.current));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [apply, clamp]);

  const local = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, start: { ...tRef.current }, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else if (pts.length === 1) {
      gesture.current = { type: 'pan', p0: p, start: { ...tRef.current }, t0: Date.now(), moved: 0 };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s1 = Math.min(MAX, Math.max(1, g.start.s * (d / g.d0)));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = zoomAt(g.start, s1, g.mid.x, g.mid.y);
      apply(clamp({ ...z, x: z.x + (mid.x - g.mid.x), y: z.y + (mid.y - g.mid.y) }));
    } else if (g.type === 'pan') {
      const dx = p.x - g.p0.x, dy = p.y - g.p0.y;
      g.moved = Math.max(g.moved, Math.hypot(dx, dy));
      g.dx = dx; g.dy = dy;
      if (g.start.s > 1) apply(clamp({ s: g.start.s, x: g.start.x + dx, y: g.start.y + dy }));
    }
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    const p = pointers.current.get(e.pointerId) || local(e);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1 && g && g.type === 'pinch') {
      // one finger left after a pinch: continue as a pan from here
      const [rest] = [...pointers.current.values()];
      gesture.current = { type: 'pan', p0: rest, start: { ...tRef.current }, t0: Date.now(), moved: 99 };
      return;
    }
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (!g || g.type !== 'pan') return;
    const now = Date.now();
    if (g.moved < 10 && now - g.t0 < 350) {
      const lt = lastTap.current;
      if (now - lt.t < 320 && Math.hypot(p.x - lt.x, p.y - lt.y) < 40) {
        lastTap.current = { t: 0, x: 0, y: 0 };
        const cur = tRef.current;
        apply(cur.s > 1.05 ? { s: 1, x: 0, y: 0 } : zoomAt(cur, DOUBLE_TAP_SCALE, p.x, p.y));
      } else {
        lastTap.current = { t: now, x: p.x, y: p.y };
      }
      return;
    }
    if (g.start.s <= 1.01 && onSwipe && Math.abs(g.dx || 0) > 60 && Math.abs(g.dx) > Math.abs(g.dy || 0) * 1.4) {
      onSwipe(g.dx < 0 ? 'next' : 'prev');
    }
  };

  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const p = local(e);
    const cur = tRef.current;
    apply(zoomAt(cur, Math.min(MAX, Math.max(1, cur.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15))), p.x, p.y));
  };
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const zoomBy = (f) => {
    const b = box.current;
    const cur = tRef.current;
    const s1 = Math.min(MAX, Math.max(1, cur.s * f));
    apply(s1 === 1 ? { s: 1, x: 0, y: 0 } : zoomAt(cur, s1, b.clientWidth / 2, b.clientHeight / 2));
  };

  return (
    <div className="zoom-box" ref={box} data-scale={t.s.toFixed(2)}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <img ref={img} src={src} alt={alt} draggable={false}
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }} />
      <div className="zoom-ctrls" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoomBy(1 / 1.5)} disabled={t.s <= 1} aria-label="Zoom out">−</button>
        <span>{Math.round(t.s * 100)}%</span>
        <button type="button" onClick={() => zoomBy(1.5)} disabled={t.s >= MAX} aria-label="Zoom in">+</button>
      </div>
    </div>
  );
}
