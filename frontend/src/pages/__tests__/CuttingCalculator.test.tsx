import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/api', () => ({
  getFamilies: vi.fn(),
  listProducts: vi.fn(),
  searchCatalogProducts: vi.fn(),
  quoteOrder: vi.fn(),
  submitOrder: vi.fn(),
  getProduct: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback),
}));

import {
  getFamilies,
  getProduct,
  listProducts,
  quoteOrder,
  searchCatalogProducts,
  submitOrder,
} from '../../services/api';
import { CuttingCalculator } from '../CuttingCalculator';
import { makeQuote, m2Product, mlProduct, udProduct } from '../../test/fixtures';
import type { CatalogProduct, Family, ProductListParams } from '../../types';

const families: Family[] = [
  { code: 'MEL', name: 'Melamina', productCount: 1, units: { UD: 0, M2: 1, ML: 0 } },
  { code: 'FER', name: 'Ferreteria', productCount: 1, units: { UD: 1, M2: 0, ML: 0 } },
];

const page = (products: CatalogProduct[]) => ({
  products,
  count: products.length,
  total: products.length,
});

const mockedQuote = vi.mocked(quoteOrder);
const mockedSubmit = vi.mocked(submitOrder);

const lucia = { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' };

function resetMocks() {
  mockedSubmit.mockImplementation(async (request) => ({
    orderNumber: request.orderNumber,
    quote: makeQuote({ total: 123.45 }),
    emails: { customer: 'sent', agloval: 'skipped' },
  }));
  vi.mocked(getFamilies).mockResolvedValue(families);
  vi.mocked(listProducts).mockImplementation(async ({ family }: ProductListParams = {}) => {
    if (family === 'MEL') return page([m2Product]);
    if (family === 'FER') return page([udProduct]);
    return page([m2Product, udProduct, mlProduct]);
  });
  vi.mocked(searchCatalogProducts).mockResolvedValue(page([udProduct]));
  mockedQuote.mockResolvedValue(makeQuote({ total: 123.45 }));
  vi.mocked(getProduct).mockImplementation(async (id: string) => {
    if (id === m2Product.id) return m2Product;
    if (id === udProduct.id) return udProduct;
    throw new Error('Product not found');
  });
}

async function renderPage() {
  const user = userEvent.setup();
  render(<CuttingCalculator />);
  await screen.findByText(m2Product.name);
  return user;
}

async function pickProduct(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(screen.getByTestId('product-list')).getByText(name));
}

async function addBoardPiece(user: ReturnType<typeof userEvent.setup>) {
  await pickProduct(user, m2Product.name);
  await user.type(screen.getByTestId('width-input'), '100');
  await user.type(screen.getByTestId('height-input'), '80');
  await user.clear(screen.getByTestId('quantity-input'));
  await user.type(screen.getByTestId('quantity-input'), '20');
  await user.click(screen.getByTestId('add-piece-btn'));
}

async function addUnitLine(user: ReturnType<typeof userEvent.setup>) {
  await pickProduct(user, udProduct.name);
  await user.clear(screen.getByTestId('quantity-input'));
  await user.type(screen.getByTestId('quantity-input'), '12');
  await user.click(screen.getByTestId('add-line-btn'));
}

// Opens "Tus datos" from "Confirmar pedido" and yields the window.
async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
  return screen.getByRole('dialog', { name: 'Tus datos' });
}

// Confirms the current order with the customer's details and waits for the window to close.
async function confirmOrder(user: ReturnType<typeof userEvent.setup>, customer = lucia) {
  const dialog = within(await openDetails(user));
  await user.clear(dialog.getByLabelText('Nombre'));
  await user.type(dialog.getByLabelText('Nombre'), customer.name);
  await user.clear(dialog.getByLabelText('Correo electrónico'));
  await user.type(dialog.getByLabelText('Correo electrónico'), customer.email);
  await user.clear(dialog.getByLabelText('Teléfono'));
  await user.type(dialog.getByLabelText('Teléfono'), customer.phone);
  await user.click(dialog.getByRole('checkbox'));
  await user.click(dialog.getByRole('button', { name: 'Enviar pedido' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

const sentMessage = (number: number, email = lucia.email) =>
  `Pedido nº ${number} enviado. Te hemos mandado el presupuesto a ${email}.`;

async function openHistory(user: ReturnType<typeof userEvent.setup>, count: number) {
  await user.click(screen.getByRole('button', { name: `Historial (${count})` }));
  return screen.getByRole('dialog', { name: 'Historial de pedidos' });
}

describe('CuttingCalculator page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getFamilies).mockReset();
    vi.mocked(listProducts).mockReset();
    vi.mocked(searchCatalogProducts).mockReset();
    vi.mocked(getProduct).mockReset();
    mockedQuote.mockReset();
    mockedSubmit.mockReset();
    resetMocks();
  });

  test('shows the three blocks in order with their headings and a history button', async () => {
    await renderPage();

    const titles = screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent);
    expect(titles).toEqual(['Gestor de pedidos']);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Selecciona producto',
      'Medidas y cantidad',
      'Pedido actual',
    ]);
    expect(screen.getAllByRole('region')).toHaveLength(3);
    const historyButton = screen.getByRole('button', { name: 'Historial (0)' });
    expect(historyButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.getByRole('banner')).toContainElement(historyButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('choosing a family refetches the products with that family', async () => {
    const user = await renderPage();

    await user.selectOptions(screen.getByTestId('family-select'), 'FER');

    await waitFor(() =>
      expect(listProducts).toHaveBeenLastCalledWith({ family: 'FER', limit: 50 })
    );
    const list = await screen.findByTestId('product-list');
    expect(within(list).getByText(udProduct.name)).toBeInTheDocument();
    expect(within(list).queryByText(m2Product.name)).not.toBeInTheDocument();
  });

  test('debounces the search text and shows the family list again when it is cleared', async () => {
    const user = await renderPage();

    await user.type(screen.getByTestId('product-search'), 'torn');
    expect(searchCatalogProducts).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(searchCatalogProducts).toHaveBeenCalledWith('torn', { family: undefined, limit: 50 })
    );
    expect(searchCatalogProducts).toHaveBeenCalledTimes(1);

    await user.clear(screen.getByTestId('product-search'));
    await waitFor(() =>
      expect(
        within(screen.getByTestId('product-list')).getByText(m2Product.name)
      ).toBeInTheDocument()
    );
  });

  test('sends the board pieces and the unit quantity to the quote endpoint', async () => {
    const user = await renderPage();

    await addBoardPiece(user);
    await addUnitLine(user);

    await waitFor(() =>
      expect(mockedQuote).toHaveBeenLastCalledWith(
        {
          lines: [
            { productId: m2Product.id, pieces: [{ width: 100, height: 80, quantity: 20 }] },
            { productId: udProduct.id, quantity: 12 },
          ],
        },
        expect.anything()
      )
    );
  });

  test('keeps the total from the quote visible in the current order block', async () => {
    const user = await renderPage();

    await addBoardPiece(user);

    const total = await screen.findByText(/Total: 123,45 EUR/);
    const block = screen.getByRole('region', { name: 'Pedido actual' });
    expect(block).toContainElement(total);
    expect(block).toContainElement(screen.getByTestId('order-total'));
  });

  test('"Confirmar pedido" opens "Tus datos" without saving the order yet', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    const dialog = await openDetails(user);

    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('');
    expect(mockedSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Historial (0)' })).toBeInTheDocument();
  });

  test('submitting the details sends the order, saves Pedido #1, clears it and greets the customer', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    await confirmOrder(user);

    expect(mockedSubmit).toHaveBeenCalledWith({
      orderNumber: 1,
      customer: lucia,
      privacyAccepted: true,
      lines: [{ productId: m2Product.id, pieces: [{ width: 100, height: 80, quantity: 20 }] }],
    });
    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(block.getByRole('status')).toHaveTextContent(sentMessage(1));
    expect(screen.queryAllByTestId('order-line')).toHaveLength(0);
    const banner = within(screen.getByRole('banner'));
    expect(banner.getByText('Hola, Lucía')).toBeInTheDocument();
    expect(banner.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();

    const dialog = await openHistory(user, 1);
    const entries = within(dialog).getAllByTestId('history-entry');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent('Pedido #1');
    expect(within(dialog).queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  test('a failed submission keeps the order and the window open and shows the server message', async () => {
    mockedSubmit.mockRejectedValue(
      new Error('No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.')
    );
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    const dialog = within(await openDetails(user));
    await user.type(dialog.getByLabelText('Nombre'), lucia.name);
    await user.type(dialog.getByLabelText('Correo electrónico'), lucia.email);
    await user.type(dialog.getByLabelText('Teléfono'), lucia.phone);
    await user.click(dialog.getByRole('checkbox'));
    await user.click(dialog.getByRole('button', { name: 'Enviar pedido' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.'
    );
    expect(screen.getByRole('dialog', { name: 'Tus datos' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Enviar pedido' })).toBeEnabled();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Historial (0)' })).toBeInTheDocument();
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument();
  });

  test('shows the sending state on the confirm and submit buttons', async () => {
    let resolveSubmit: () => void = () => {};
    mockedSubmit.mockImplementation(
      (request) =>
        new Promise((resolve) => {
          resolveSubmit = () =>
            resolve({
              orderNumber: request.orderNumber,
              quote: makeQuote({ total: 123.45 }),
              emails: { customer: 'sent', agloval: 'skipped' },
            });
        })
    );
    localStorage.setItem('agloval_customer_v1', JSON.stringify(lucia));
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    const dialog = within(await openDetails(user));
    await user.click(dialog.getByRole('checkbox'));
    await user.click(dialog.getByRole('button', { name: 'Enviar pedido' }));

    expect(dialog.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmando...' })).toBeDisabled();

    resolveSubmit();
    expect(await screen.findByText(sentMessage(1))).toBeInTheDocument();
  });

  test('"Cerrar sesión" removes the greeting and keeps the history', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmOrder(user);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.queryByText('Hola, Lucía')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial (1)' })).toBeInTheDocument();
    expect(localStorage.getItem('agloval_customer_v1')).toBe('null');
  });

  test('prefills the next confirmation with the remembered details', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmOrder(user);

    await addUnitLine(user);
    await waitFor(() => expect(screen.getAllByTestId('order-line')).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
    );
    const dialog = within(await openDetails(user));

    expect(dialog.getByLabelText('Nombre')).toHaveValue(lucia.name);
    expect(dialog.getByLabelText('Correo electrónico')).toHaveValue(lucia.email);
    expect(dialog.getByLabelText('Teléfono')).toHaveValue(lucia.phone);
  });

  test('"Volver a pedir" closes the history window and reloads the lines of a past order', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await addUnitLine(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmOrder(user);
    await waitFor(() => expect(screen.queryAllByTestId('order-line')).toHaveLength(0));

    const dialog = await openHistory(user, 1);
    await user.click(within(dialog).getByRole('button', { name: 'Volver a pedir' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(await block.findByRole('status')).toHaveTextContent(
      'Pedido #1 cargado en el pedido actual'
    );
    expect(screen.getAllByTestId('order-line')).toHaveLength(2);
  });

  test('warns about the products that no longer exist when reordering', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await addUnitLine(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmOrder(user);
    await waitFor(() => expect(screen.queryAllByTestId('order-line')).toHaveLength(0));
    vi.mocked(getProduct).mockImplementation(async (id: string) => {
      if (id === m2Product.id) return m2Product;
      throw new Error('Product not found');
    });

    const dialog = await openHistory(user, 1);
    await user.click(within(dialog).getByRole('button', { name: 'Volver a pedir' }));

    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    const warning = await block.findByText(new RegExp(`ya no existen.*${udProduct.name}`, 'i'));
    expect(warning.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
  });

  test('never shows waste or utilisation figures', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmOrder(user);
    await screen.findByText(sentMessage(1));

    expect(document.body.textContent).not.toMatch(/desperdicio|aprovechamiento|utilizaci/i);
  });

  test('keeps the current order in a complementary panel', async () => {
    await renderPage();
    const panel = screen.getByRole('complementary', { name: 'Pedido actual' });
    expect(panel).toContainElement(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(panel).toContainElement(screen.getByTestId('order-total'));
  });

  test('shows the number of the order being built and moves to the next one after confirming', async () => {
    const user = await renderPage();
    const block = () => within(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(block().getByRole('heading', { level: 3 })).toHaveTextContent('Pedido nº 1');

    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmOrder(user);
    await screen.findByText(sentMessage(1));

    expect(block().getByRole('heading', { level: 3 })).toHaveTextContent('Pedido nº 2');
  });

  test('shows a bottom order bar only while the order has lines', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const user = await renderPage();
    expect(screen.queryByTestId('order-bar')).not.toBeInTheDocument();

    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    const bar = screen.getByTestId('order-bar');
    expect(bar).toHaveTextContent('Pedido nº 1 · 1 línea · 123,45 EUR');

    await addUnitLine(user);
    await waitFor(() => expect(bar).toHaveTextContent('2 líneas'));

    await user.click(within(bar).getByRole('button', { name: 'Ver pedido' }));
    const heading = screen.getByRole('heading', { level: 2, name: 'Pedido actual' });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(heading).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Vaciar pedido' }));
    await waitFor(() => expect(screen.queryByTestId('order-bar')).not.toBeInTheDocument());
  });

  test('surfaces a families loading error in an alert', async () => {
    vi.mocked(getFamilies).mockRejectedValue(new Error('Familias no disponibles'));
    render(<CuttingCalculator />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Familias no disponibles');
  });

  test('surfaces a products loading error in an alert', async () => {
    vi.mocked(listProducts).mockRejectedValue(new Error('Productos no disponibles'));
    render(<CuttingCalculator />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Productos no disponibles');
  });

  test('surfaces a quote error in an alert', async () => {
    const user = await renderPage();
    mockedQuote.mockRejectedValue(new Error('Presupuesto no disponible'));

    await addBoardPiece(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Presupuesto no disponible');
  });
});
