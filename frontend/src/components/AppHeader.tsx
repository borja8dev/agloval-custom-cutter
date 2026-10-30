import React from 'react';
import { NavLink } from 'react-router-dom';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agloval.com';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-header';

const headerPillClass = `bg-white text-brand-dark font-semibold rounded-full px-4 py-2 text-sm hover:bg-brand-light ${focusRing}`;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-semibold ${focusRing} ${
    isActive
      ? 'bg-brand-dark text-white'
      : 'border border-white/70 text-white hover:bg-white hover:text-brand-dark'
  }`;

interface AppHeaderProps {
  /** Header controls placed after the navigation links. */
  actions?: React.ReactNode;
}

// The histories open in their own tab so the order being built stays untouched.
const HISTORY_LINKS = [
  { to: '/presupuestos', label: 'Presupuestos' },
  { to: '/pedidos', label: 'Pedidos' },
];

export const AppHeader: React.FC<AppHeaderProps> = ({ actions }) => (
  <header className="bg-brand-header text-white">
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
      <NavLink to="/" end className={`flex flex-wrap items-center gap-4 rounded-md ${focusRing}`}>
        <span className="bg-white rounded-md px-3 py-2">
          <img src="/agloval-logo.png" alt="Agloval" className="h-9 w-auto" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold">Gestor de pedidos</h1>
      </NavLink>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Historiales">
          <ul className="flex flex-wrap items-center gap-2">
            {HISTORY_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink to={to} target="_blank" rel="noopener" className={navLinkClass}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <a href={SITE_URL} className={headerPillClass}>
          Volver a Agloval
        </a>
        {actions}
      </div>
    </div>
  </header>
);
