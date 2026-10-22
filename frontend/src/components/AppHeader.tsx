import React from 'react';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agloval.com';

interface AppHeaderProps {
  /** Header controls placed after the link back to the website. */
  actions?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ actions }) => (
  <header className="bg-brand-header text-white">
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="bg-white rounded-md px-3 py-2">
          <img src="/agloval-logo.png" alt="Agloval" className="h-9 w-auto" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold">Gestor de pedidos</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={SITE_URL}
          className="bg-white text-brand-dark font-semibold rounded-full px-4 py-2 text-sm hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-header"
        >
          Volver a Agloval
        </a>
        {actions}
      </div>
    </div>
  </header>
);
