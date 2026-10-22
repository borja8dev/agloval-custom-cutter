import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('../pages/CuttingCalculator', () => ({
  CuttingCalculator: () => <main>page</main>,
}));

import { App } from '../App';

describe('App', () => {
  test('renders the company footer with the current year and no portfolio text', () => {
    render(<App />);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/Aglomerados Valencia S\.L\./)).toBeInTheDocument();
    expect(within(footer).getByText(`© ${new Date().getFullYear()} Agloval`)).toBeInTheDocument();
    expect(screen.queryByText(/Portfolio/i)).not.toBeInTheDocument();
  });
});
