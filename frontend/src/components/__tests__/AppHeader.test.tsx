import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AppHeader } from '../AppHeader';

describe('AppHeader', () => {
  test('renders a banner with the logo, the page title and the link back to Agloval', () => {
    render(<AppHeader />);

    const banner = screen.getByRole('banner');
    expect(
      within(banner).getByRole('heading', { level: 1, name: 'Gestor de pedidos' })
    ).toBeInTheDocument();
    expect(within(banner).getByRole('img', { name: 'Agloval' })).toHaveAttribute(
      'src',
      '/agloval-logo.png'
    );
    expect(within(banner).getByRole('link', { name: 'Volver a Agloval' })).toHaveAttribute(
      'href',
      'https://www.agloval.com'
    );
  });

  test('renders the actions slot content when given', () => {
    render(<AppHeader actions={<button type="button">Historial</button>} />);

    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Historial' })
    ).toBeInTheDocument();
  });
});
