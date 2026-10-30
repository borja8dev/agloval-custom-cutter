import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderHistory } from '../OrderHistory';
import { makeQuote } from '../../test/fixtures';
import type { HistoryEntry } from '../../types';

const entry = (number: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  kind: 'order',
  number,
  createdAt: `2026-10-0${number}T10:30:00.000Z`,
  total: 4.2,
  currency: 'EUR',
  lines: [{ productId: 'p_ud', name: 'Tornillo', sku: 'FER-0012', unit: 'UD', quantity: 12 }],
  groups: makeQuote().groups,
  ...overrides,
});

function setup(props: Partial<React.ComponentProps<typeof OrderHistory>> = {}) {
  const handlers = { onReorder: vi.fn(), onRemove: vi.fn(), onClear: vi.fn() };
  const history = [entry(3, { total: 317.04 }), entry(2), entry(1)];
  render(<OrderHistory history={history} {...handlers} {...props} />);
  return { ...handlers, history };
}

describe('OrderHistory', () => {
  test('shows an empty state without the clear button', () => {
    setup({ history: [] });
    expect(screen.getByText('Todavía no hay pedidos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vaciar historial' })).toBeNull();
  });

  test('lists entries in the given order inside a scroll container', () => {
    setup();
    const list = screen.getByTestId('order-history');
    expect(list).toHaveClass('max-h-96', 'overflow-y-auto');
    const rows = within(list).getAllByTestId('history-entry');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Pedido #3');
    expect(rows[1]).toHaveTextContent('Pedido #2');
    expect(rows[2]).toHaveTextContent('Pedido #1');
  });

  test('shows the formatted date and total per entry', () => {
    setup();
    const [first] = screen.getAllByTestId('history-entry');
    expect(first).toHaveTextContent('317,04 EUR');
    expect(first).toHaveTextContent(/2026/);
  });

  test('toggles the breakdown with aria-expanded and aria-controls', async () => {
    setup();
    const toggle = screen.getAllByRole('button', { name: /Pedido #3/ })[0];
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quote-group')).toBeNull();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panelId = toggle.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId as string) as HTMLElement;
    expect(within(panel).getByTestId('quote-group')).toHaveTextContent('12 x 0,35 EUR = 4,20 EUR');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quote-group')).toBeNull();
  });

  test('does not offer editing controls inside the breakdown', async () => {
    setup();
    await userEvent.click(screen.getAllByRole('button', { name: /Pedido #3/ })[0]);
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  test('reorders with the exact entry', async () => {
    const { onReorder, history } = setup();
    const [first] = screen.getAllByTestId('history-entry');
    await userEvent.click(within(first).getByRole('button', { name: 'Volver a pedir' }));
    expect(onReorder).toHaveBeenCalledWith(history[0]);
  });

  test('disables reorder while reordering', () => {
    setup({ isReordering: true });
    for (const button of screen.getAllByRole('button', { name: 'Volver a pedir' })) {
      expect(button).toBeDisabled();
    }
  });

  test('removes an entry by number', async () => {
    const { onRemove } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar pedido #2' }));
    expect(onRemove).toHaveBeenCalledWith(2);
  });

  test('clears the history only after a second confirming click', async () => {
    const { onClear } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Vaciar historial' }));
    expect(onClear).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar vaciado' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Vaciar historial' })).toBeInTheDocument();
  });

  test('allows cancelling the clear confirmation', async () => {
    const { onClear } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Vaciar historial' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Confirmar vaciado' })).toBeNull();
    expect(onClear).not.toHaveBeenCalled();
  });

  test('shows the status message in a polite live region', () => {
    setup({ status: { kind: 'warning', message: 'Algunos productos ya no existen: Tornillo' } });
    const message = screen.getByText('Algunos productos ya no existen: Tornillo');
    expect(message.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  test('keeps the live region mounted without a status', () => {
    setup();
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  test('shows its own title by default', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Historial de pedidos' })).toBeInTheDocument();
  });

  test('hides its own title when the container already provides one', () => {
    setup({ hideTitle: true });
    expect(screen.queryByRole('heading', { name: 'Historial de pedidos' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Vaciar historial' })).toBeInTheDocument();
    expect(screen.getAllByTestId('history-entry')).toHaveLength(3);
  });

  test('never shows waste information', async () => {
    setup();
    await userEvent.click(screen.getAllByRole('button', { name: /Pedido #3/ })[0]);
    expect(screen.queryByText(/desperdicio|aprovechamiento|utilizaci/i)).toBeNull();
  });
});
