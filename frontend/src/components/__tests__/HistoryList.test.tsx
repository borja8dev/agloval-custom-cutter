import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryList } from '../HistoryList';
import { makeQuote } from '../../test/fixtures';
import type { HistoryEntry, HistoryKind } from '../../types';

const entry = (
  number: number,
  overrides: Partial<HistoryEntry> = {},
  kind: HistoryKind = 'order'
): HistoryEntry => ({
  kind,
  number,
  createdAt: `2026-10-0${number}T10:30:00.000Z`,
  total: 4.2,
  currency: 'EUR',
  lines: [{ productId: 'p_ud', name: 'Tornillo', sku: 'FER-0012', unit: 'UD', quantity: 12 }],
  groups: makeQuote().groups,
  ...overrides,
});

const lucia = { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' };

function setup(kind: HistoryKind = 'order', entries?: HistoryEntry[]) {
  const handlers = { onRepeat: vi.fn(), onRemove: vi.fn() };
  const list = entries ?? [
    entry(3, { total: 317.04, customer: lucia, reference: 'Cocina Ruzafa' }, kind),
    entry(2, {}, kind),
    entry(1, {}, kind),
  ];
  render(<HistoryList kind={kind} entries={list} {...handlers} />);
  return { ...handlers, entries: list };
}

describe('HistoryList', () => {
  test('lists the entries in the given order with their number', () => {
    setup();
    const rows = within(screen.getByTestId('history-list')).getAllByTestId('history-entry');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Pedido nº 3');
    expect(rows[1]).toHaveTextContent('Pedido nº 2');
    expect(rows[2]).toHaveTextContent('Pedido nº 1');
  });

  test('names quotes as "Presupuesto nº N"', () => {
    setup('quote');
    expect(screen.getAllByTestId('history-entry')[0]).toHaveTextContent('Presupuesto nº 3');
  });

  test('shows the date, customer, reference and total of an entry', () => {
    setup();
    const [first, second] = screen.getAllByTestId('history-entry');
    expect(first).toHaveTextContent('317,04 EUR');
    expect(first).toHaveTextContent(/2026/);
    expect(first).toHaveTextContent('Lucía Ferrer');
    expect(first).toHaveTextContent('Ref. Cocina Ruzafa');
    expect(second).not.toHaveTextContent('Ref.');
  });

  test('marks a quote that became an order', () => {
    setup('quote', [entry(4, { convertedToOrder: 7 }, 'quote'), entry(3, {}, 'quote')]);
    const [converted, plain] = screen.getAllByTestId('history-entry');
    expect(within(converted).getByText('Convertido en pedido nº 7')).toBeInTheDocument();
    expect(plain).not.toHaveTextContent('Convertido');
  });

  test('marks an order that came from a quote', () => {
    setup('order', [entry(2, { fromQuoteNumber: 5 }), entry(1)]);
    const [fromQuote, plain] = screen.getAllByTestId('history-entry');
    expect(within(fromQuote).getByText('Desde presupuesto nº 5')).toBeInTheDocument();
    expect(plain).not.toHaveTextContent('Desde presupuesto');
  });

  test('toggles the breakdown with aria-expanded and aria-controls', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: /Pedido nº 3/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quote-group')).toBeNull();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls') as string);
    expect(within(panel as HTMLElement).getByTestId('quote-group')).toHaveTextContent(
      '12 x 0,35 EUR = 4,20 EUR'
    );
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByText(/desperdicio|aprovechamiento|utilizaci/i)).toBeNull();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quote-group')).toBeNull();
  });

  test('repeats the exact entry', async () => {
    const { onRepeat, entries } = setup();
    const [first] = screen.getAllByTestId('history-entry');
    await userEvent.click(within(first).getByRole('button', { name: 'Repetir' }));
    expect(onRepeat).toHaveBeenCalledWith(entries[0]);
  });

  test('removes an entry by number', async () => {
    const { onRemove } = setup('quote');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar presupuesto nº 2' }));
    expect(onRemove).toHaveBeenCalledWith(2);
  });
});
