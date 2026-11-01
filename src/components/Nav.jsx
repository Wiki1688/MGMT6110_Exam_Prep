import React from 'react';
import { Home, Star, SearchIcon, Gear } from './Icons.jsx';

const items = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/bookmarks', label: 'Marked', Icon: Star },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/settings', label: 'Settings', Icon: Gear },
];

export default function Nav({ path, navigate }) {
  return (
    <nav className="nav" aria-label="Main">
      {items.map(({ to, label, Icon }) => {
        const active = to === '/' ? path === '/' : path.startsWith(to);
        return (
          <button key={to} className={`nav-btn${active ? ' active' : ''}`} onClick={() => navigate(to)} aria-current={active ? 'page' : undefined}>
            <Icon />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
