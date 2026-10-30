import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../services/api', () => ({
  getProduct: vi.fn(),
  quoteOrder: vi.fn(),
  submitOrder: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback),
  getFieldError: () => undefined,
}));

import { getProduct, quoteOrder, submitOrder } from '../../services/api';
import { HistoryPage } from '../HistoryPage';
import { HISTORY_KEYS } from '../../services/history';
import { CUSTOMER_SESSION_KEY } from '../../hooks/useCustomerSession';
import { makeQuote, udProduct } from '../../test/fixtures';
import type { HistoryEntry, HistoryKind } from '../../types';

const entry = (
  kind: HistoryKind,
  number: number,
  overrides: Partial<HistoryEntry> = {}
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

const customer = (name: string) => ({ name, email: 'x@example.com', phone: '600 000 000' });

function seed(kind: HistoryKind, entries: HistoryEntry[], counter = entries.length) {
  localStorage.setItem(HISTORY_KEYS[kind], JSON.stringify({ counter, entries }));
}

const sampleQuotes = () => [
  entry('quote', 3, { customer: customer('José Martínez'), reference: 'Cocina Ruzafa' }),
  entry('quote', 2, { customer: customer('Lucía Ferrer'), convertedToOrder: 4 }),
  entry('quote', 1, { customer: customer('Ana Pérez'), reference: 'Baño' }),
];

const Home = () => {
  const location = useLocation();
  return <p data-testid="home-state">{JSON.stringify(location.state)}</p>;
};

function renderPage(kind: HistoryKind) {
  const path = kind === 'quote' ? '/presupuestos' : '/pedidos';
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path={path} element={<HistoryPage kind={kind} />} />
      </Routes>
    </MemoryRouter>
  );
  return user;
}

function cleanupAndRender(kind: HistoryKind) {
  cleanup();
  return renderPage(kind);
}

const search = () => screen.getByLabelText('Buscar por número, cliente o referencia');
const rows = () => screen.queryAllByTestId('history-entry');

describe('HistoryPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('shows the quote heading, an intro and the page title', () => {
    seed('quote', sampleQuotes());
    renderPage('quote');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Historial de presupuestos' })
    ).toBeInTheDocument();
    expect(screen.getByText(/presupuestos guardados en este navegador/i)).toBeInTheDocument();
    expect(document.title).toBe('Historial de presupuestos · Agloval');
    expect(rows()).toHaveLength(3);
  });

  test('shows the order heading and the page title', () => {
    seed('order', [entry('order', 1, { fromQuoteNumber: 2 })]);
    renderPage('order');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Historial de pedidos' })
    ).toBeInTheDocument();
    expect(document.title).toBe('Historial de pedidos · Agloval');
    expect(screen.getByText('Desde presupuesto nº 2')).toBeInTheDocument();
  });

  test('announces the number of results politely', () => {
    seed('quote', sampleQuotes());
    renderPage('quote');

    const count = screen.getByText('3 presupuestos');
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  test('uses the singular for one order', () => {
    seed('order', [entry('order', 1)]);
    renderPage('order');
    expect(screen.getByText('1 pedido')).toBeInTheDocument();
  });

  test('filters by number', async () => {
    seed('quote', sampleQuotes());
    const user = renderPage('quote');

    await user.type(search(), '2');

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Presupuesto nº 2');
    expect(screen.getByText('1 presupuesto')).toBeInTheDocument();
  });

  test('filters by customer name ignoring case and accents', async () => {
    seed('quote', sampleQuotes());
    const user = renderPage('quote');

    await user.type(search(), 'LUCIA');
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Lucía Ferrer');

    await user.clear(search());
    await user.type(search(), 'jose martinez');
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Presupuesto nº 3');
  });

  test('filters by reference', async () => {
    seed('quote', sampleQuotes());
    const user = renderPage('quote');

    await user.type(search(), 'bano');

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Presupuesto nº 1');
  });

  test('says when nothing matches', async () => {
    seed('quote', sampleQuotes());
    const user = renderPage('quote');

    await user.type(search(), 'zzz');

    expect(rows()).toHaveLength(0);
    expect(screen.getByText('Sin resultados')).toHaveAttribute('aria-live', 'polite');
  });

  test.each([
    ['quote', 'Todavía no hay presupuestos'],
    ['order', 'Todavía no hay pedidos'],
  ] as const)('shows an empty state for %s with a link to the order manager', (kind, text) => {
    renderPage(kind);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al gestor de pedidos' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.queryByRole('button', { name: 'Vaciar historial' })).toBeNull();
  });

  test('deletes an entry', async () => {
    seed('quote', sampleQuotes());
    const user = renderPage('quote');

    await user.click(screen.getByRole('button', { name: 'Eliminar presupuesto nº 2' }));

    expect(rows()).toHaveLength(2);
    expect(screen.queryByText(/Presupuesto nº 2/)).toBeNull();
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEYS.quote)!);
    expect(stored.entries.map((e: HistoryEntry) => e.number)).toEqual([3, 1]);
  });

  test('clears the history after a second click and keeps the counter', async () => {
    seed('order', [entry('order', 2), entry('order', 1)], 5);
    const user = renderPage('order');

    await user.click(screen.getByRole('button', { name: 'Vaciar historial' }));
    expect(rows()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Confirmar vaciado' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Vaciar historial' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar vaciado' }));

    expect(rows()).toHaveLength(0);
    expect(screen.getByText('Todavía no hay pedidos')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(HISTORY_KEYS.order)!)).toEqual({
      counter: 5,
      entries: [],
    });
  });

  test('"Repetir" goes to the order manager with the entry to load', async () => {
    seed('quote', sampleQuotes());
    const user = renderPage('quote');

    const [first] = rows();
    await user.click(within(first).getByRole('button', { name: 'Repetir' }));

    expect(JSON.parse(screen.getByTestId('home-state').textContent!)).toEqual({
      reorder: 3,
      kind: 'quote',
    });
  });
  describe('"Pasar a pedido"', () => {
    const ana = customer('Ana Pérez');
    const quoteToConvert = () =>
      entry('quote', 3, { customer: ana, reference: 'Cocina Ruzafa', total: 4.2 });

    const storedEntries = (kind: HistoryKind) =>
      JSON.parse(localStorage.getItem(HISTORY_KEYS[kind]) ?? '{"entries":[]}')
        .entries as HistoryEntry[];

    beforeEach(() => {
      vi.mocked(getProduct).mockReset().mockResolvedValue(udProduct);
      vi.mocked(quoteOrder).mockReset().mockResolvedValue(makeQuote({ total: 4.2 }));
      vi.mocked(submitOrder)
        .mockReset()
        .mockImplementation(async (request) => ({
          orderNumber: request.orderNumber,
          quote: makeQuote({ total: 4.2 }),
          emails: { customer: 'sent', agloval: 'sent' },
        }));
    });

    async function openConversion(user: ReturnType<typeof userEvent.setup>) {
      const [first] = rows();
      await user.click(within(first).getByRole('button', { name: 'Pasar a pedido' }));
      return within(screen.getByRole('dialog', { name: 'Pasar a pedido' }));
    }

    test('only the quotes that are not orders yet offer it', () => {
      seed('quote', sampleQuotes());
      renderPage('quote');

      const [open, converted] = rows();
      expect(within(open).getByRole('button', { name: 'Pasar a pedido' })).toBeInTheDocument();
      expect(within(converted).queryByRole('button', { name: 'Pasar a pedido' })).toBeNull();
      expect(within(converted).getByText('Convertido en pedido nº 4')).toBeInTheDocument();
    });

    test('the orders page does not offer it', () => {
      seed('order', [entry('order', 1)]);
      renderPage('order');
      expect(screen.queryByRole('button', { name: 'Pasar a pedido' })).toBeNull();
    });

    test('shows the quote, re-prices it and prefills its customer and reference', async () => {
      seed('quote', [quoteToConvert()]);
      seed('order', [], 6);
      const user = renderPage('quote');

      const dialog = await openConversion(user);

      expect(dialog.getByText('Presupuesto nº 3')).toBeInTheDocument();
      expect(dialog.getByText('Se enviará como pedido nº 7')).toBeInTheDocument();
      expect(await dialog.findByText('Total: 4,20 EUR')).toBeInTheDocument();
      expect(quoteOrder).toHaveBeenCalledWith({ lines: [{ productId: 'p_ud', quantity: 12 }] });
      expect(dialog.queryByText(/El precio ha cambiado/)).toBeNull();
      expect(dialog.getByLabelText('Nombre')).toHaveValue(ana.name);
      expect(dialog.getByLabelText('Correo electrónico')).toHaveValue(ana.email);
      expect(dialog.getByLabelText('Referencia (opcional)')).toHaveValue('Cocina Ruzafa');
      expect(dialog.getByRole('button', { name: 'Enviar pedido a Agloval' })).toBeEnabled();
    });

    test('falls back to the session details when the quote has no customer', async () => {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customer('Lucía Ferrer')));
      seed('quote', [entry('quote', 1)]);
      const user = renderPage('quote');

      const dialog = await openConversion(user);

      expect(dialog.getByLabelText('Nombre')).toHaveValue('Lucía Ferrer');
    });

    test('warns when the price changed since the quote', async () => {
      vi.mocked(quoteOrder).mockResolvedValue(makeQuote({ total: 5.1 }));
      seed('quote', [quoteToConvert()]);
      const user = renderPage('quote');

      const dialog = await openConversion(user);

      expect(
        await dialog.findByText(
          'El precio ha cambiado desde el presupuesto: antes 4,20 EUR, ahora 5,10 EUR. Se enviará con el precio actual.'
        )
      ).toBeInTheDocument();
    });

    test('does not allow sending when products no longer exist', async () => {
      vi.mocked(getProduct).mockRejectedValue(new Error('Product not found'));
      seed('quote', [quoteToConvert()]);
      const user = renderPage('quote');

      const dialog = await openConversion(user);

      expect(await dialog.findByRole('alert')).toHaveTextContent(
        'No se puede pasar a pedido: estos productos ya no existen: Tornillo'
      );
      expect(dialog.getByRole('button', { name: 'Enviar pedido a Agloval' })).toBeDisabled();
      expect(quoteOrder).not.toHaveBeenCalled();
    });

    test('sends the order, saves it from the quote and marks the quote as converted', async () => {
      seed('quote', [quoteToConvert()]);
      seed('order', [], 6);
      const user = renderPage('quote');

      const dialog = await openConversion(user);
      await dialog.findByText('Total: 4,20 EUR');
      await user.click(dialog.getByRole('checkbox'));
      await user.click(dialog.getByRole('button', { name: 'Enviar pedido a Agloval' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(submitOrder).toHaveBeenCalledWith({
        orderNumber: 7,
        fromQuoteNumber: 3,
        customer: ana,
        reference: 'Cocina Ruzafa',
        privacyAccepted: true,
        lines: [{ productId: 'p_ud', quantity: 12 }],
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Presupuesto nº 3 pasado a pedido nº 7.'
      );
      const [quoteRow] = rows();
      expect(within(quoteRow).getByText('Convertido en pedido nº 7')).toBeInTheDocument();
      expect(within(quoteRow).queryByRole('button', { name: 'Pasar a pedido' })).toBeNull();

      const [order] = storedEntries('order');
      expect(order).toMatchObject({
        kind: 'order',
        number: 7,
        fromQuoteNumber: 3,
        customer: ana,
        reference: 'Cocina Ruzafa',
      });
      expect(storedEntries('quote')[0].convertedToOrder).toBe(7);
    });

    test('shows the order with "Desde presupuesto nº M" on the orders page afterwards', async () => {
      seed('quote', [quoteToConvert()]);
      const user = renderPage('quote');
      const dialog = await openConversion(user);
      await dialog.findByText('Total: 4,20 EUR');
      await user.click(dialog.getByRole('checkbox'));
      await user.click(dialog.getByRole('button', { name: 'Enviar pedido a Agloval' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      cleanupAndRender('order');

      expect(screen.getByText('Desde presupuesto nº 3')).toBeInTheDocument();
      expect(rows()[0]).toHaveTextContent('Pedido nº 1');
    });

    test('a failed submission keeps the window open and the quote unconverted', async () => {
      vi.mocked(submitOrder).mockRejectedValue(new Error('Demasiadas solicitudes'));
      seed('quote', [quoteToConvert()]);
      const user = renderPage('quote');

      const dialog = await openConversion(user);
      await dialog.findByText('Total: 4,20 EUR');
      await user.click(dialog.getByRole('checkbox'));
      await user.click(dialog.getByRole('button', { name: 'Enviar pedido a Agloval' }));

      expect(await dialog.findByRole('alert')).toHaveTextContent('Demasiadas solicitudes');
      expect(storedEntries('order')).toHaveLength(0);
      expect(storedEntries('quote')[0].convertedToOrder).toBeUndefined();
    });
  });
});
