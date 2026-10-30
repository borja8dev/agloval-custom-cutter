import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../pages/CuttingCalculator', () => ({
  CuttingCalculator: () => <div>calculator page</div>,
}));

import { App } from '../App';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
  });

  test('renders the company footer with the current year and no portfolio text', () => {
    renderAt('/');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/Aglomerados Valencia S\.L\./)).toBeInTheDocument();
    expect(within(footer).getByText(`© ${new Date().getFullYear()} Agloval`)).toBeInTheDocument();
    expect(screen.queryByText(/Portfolio/i)).not.toBeInTheDocument();
  });

  test('renders the order manager on "/"', () => {
    renderAt('/');

    expect(within(screen.getByRole('main')).getByText('calculator page')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  test('renders the quote history on "/presupuestos" with its title', () => {
    renderAt('/presupuestos');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Historial de presupuestos' })
    ).toBeInTheDocument();
    expect(document.title).toBe('Historial de presupuestos · Agloval');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  test('renders the order history on "/pedidos" with its title', () => {
    renderAt('/pedidos');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Historial de pedidos' })
    ).toBeInTheDocument();
    expect(document.title).toBe('Historial de pedidos · Agloval');
  });

  test('shows a not-found section with a link back on unknown routes', () => {
    renderAt('/no-existe');

    const main = within(screen.getByRole('main'));
    expect(
      main.getByRole('heading', { level: 2, name: 'Esta página no existe' })
    ).toBeInTheDocument();
    expect(main.getByRole('link', { name: 'Volver al gestor' })).toHaveAttribute('href', '/');
  });

  test('shows the customer greeting and "Cerrar sesión" on every page', async () => {
    localStorage.setItem(
      'agloval_customer_v1',
      JSON.stringify({ name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' })
    );
    renderAt('/pedidos');

    const banner = within(screen.getByRole('banner'));
    expect(await banner.findByText('Hola, Lucía')).toBeInTheDocument();
    await userEvent.click(banner.getByRole('button', { name: 'Cerrar sesión' }));
    expect(banner.queryByText('Hola, Lucía')).not.toBeInTheDocument();
  });
});
