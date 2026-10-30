import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from '../AppHeader';

function renderHeader(path = '/', actions?: React.ReactNode) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppHeader actions={actions} />
    </MemoryRouter>
  );
  return within(screen.getByRole('banner'));
}

describe('AppHeader', () => {
  test('renders a banner with the logo, the page title and the link back to Agloval', () => {
    const banner = renderHeader();

    expect(
      banner.getByRole('heading', { level: 1, name: 'Gestor de pedidos' })
    ).toBeInTheDocument();
    expect(banner.getByRole('img', { name: 'Agloval' })).toHaveAttribute(
      'src',
      '/agloval-logo.png'
    );
    expect(banner.getByRole('link', { name: 'Volver a Agloval' })).toHaveAttribute(
      'href',
      'https://www.agloval.com'
    );
  });

  test('links the logo and the title to the order manager', () => {
    const banner = renderHeader('/pedidos');

    const home = banner.getByRole('link', { name: /Gestor de pedidos/ });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toContainElement(banner.getByRole('img', { name: 'Agloval' }));
    expect(home).not.toHaveAttribute('aria-current');
  });

  test('opens the quote and order histories in a new tab', () => {
    const banner = renderHeader();
    const nav = within(banner.getByRole('navigation', { name: 'Historiales' }));

    const quotes = nav.getByRole('link', { name: 'Presupuestos' });
    expect(quotes).toHaveAttribute('href', '/presupuestos');
    expect(quotes).toHaveAttribute('target', '_blank');
    expect(quotes).toHaveAttribute('rel', 'noopener');

    const orders = nav.getByRole('link', { name: 'Pedidos' });
    expect(orders).toHaveAttribute('href', '/pedidos');
    expect(orders).toHaveAttribute('target', '_blank');
    expect(orders).toHaveAttribute('rel', 'noopener');
  });

  test.each([
    ['/', /Gestor de pedidos/],
    ['/presupuestos', 'Presupuestos'],
    ['/pedidos', 'Pedidos'],
  ])('marks the current page on %s', (path, name) => {
    const banner = renderHeader(path);

    const current = banner
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toBe(banner.getByRole('link', { name }));
  });

  test('renders the actions slot content when given', () => {
    const banner = renderHeader('/', <button type="button">Cerrar sesión</button>);

    expect(banner.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });
});
