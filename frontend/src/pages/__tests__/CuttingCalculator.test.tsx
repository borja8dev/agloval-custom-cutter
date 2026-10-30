import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/api', () => ({
  getFamilies: vi.fn(),
  listProducts: vi.fn(),
  searchCatalogProducts: vi.fn(),
  quoteOrder: vi.fn(),
  submitOrder: vi.fn(),
  submitQuote: vi.fn(),
  getProduct: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback),
  getFieldError: (e: unknown, field: string) =>
    (e as { fieldErrors?: Record<string, string> } | null)?.fieldErrors?.[field],
}));

import {
  getFamilies,
  getProduct,
  listProducts,
  quoteOrder,
  searchCatalogProducts,
  submitOrder,
  submitQuote,
} from '../../services/api';
import { MemoryRouter, useLocation, useNavigate, type MemoryRouterProps } from 'react-router-dom';

type InitialEntry = NonNullable<MemoryRouterProps['initialEntries']>[number];
import { App } from '../../App';
import { HISTORY_KEYS } from '../../services/history';
import { makeQuote, m2Product, mlProduct, udProduct } from '../../test/fixtures';
import type {
  CatalogProduct,
  Family,
  HistoryEntry,
  HistoryKind,
  ProductListParams,
} from '../../types';

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
const mockedSubmitQuote = vi.mocked(submitQuote);

const lucia = { name: 'Lucía Ferrer', email: 'lucia@example.com', phone: '600 123 456' };

function resetMocks() {
  mockedSubmit.mockImplementation(async (request) => ({
    orderNumber: request.orderNumber,
    quote: makeQuote({ total: 123.45 }),
    emails: { customer: 'sent', agloval: 'skipped' },
  }));
  mockedSubmitQuote.mockImplementation(async (request) => ({
    quoteNumber: request.quoteNumber,
    quote: makeQuote({ total: 123.45 }),
    emails: { customer: 'sent' },
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

// Test-only controls: navigate to "/" with a reorder request, and read the router state.
const RouterProbe = ({ request }: { request?: { reorder: number; kind: HistoryKind } }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      {request && (
        <button type="button" onClick={() => navigate('/', { state: request })}>
          probe-reorder
        </button>
      )}
      <output data-testid="router-state">{JSON.stringify(location.state ?? null)}</output>
    </div>
  );
};

function renderApp(entry: InitialEntry = '/', request?: { reorder: number; kind: HistoryKind }) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
      <RouterProbe request={request} />
    </MemoryRouter>
  );
}

async function renderPage(
  entry: InitialEntry = '/',
  request?: { reorder: number; kind: HistoryKind }
) {
  const user = userEvent.setup();
  renderApp(entry, request);
  await screen.findByText(m2Product.name);
  return user;
}

const pastEntry = (kind: HistoryKind, number: number): HistoryEntry => ({
  kind,
  number,
  createdAt: '2026-10-01T10:30:00.000Z',
  total: 123.45,
  currency: 'EUR',
  lines: [
    {
      productId: m2Product.id,
      name: m2Product.name,
      sku: m2Product.sku,
      unit: 'M2',
      pieces: [{ width: 100, height: 80, quantity: 20 }],
    },
    { productId: udProduct.id, name: udProduct.name, sku: udProduct.sku, unit: 'UD', quantity: 12 },
  ],
  groups: makeQuote().groups,
});

function seedHistory(kind: HistoryKind, entries: HistoryEntry[], counter = entries.length) {
  localStorage.setItem(HISTORY_KEYS[kind], JSON.stringify({ counter, entries }));
}

const stored = (kind: HistoryKind) =>
  JSON.parse(localStorage.getItem(HISTORY_KEYS[kind]) ?? '{"entries":[]}')
    .entries as HistoryEntry[];
const storedOrders = () => stored('order');
const storedQuotes = () => stored('quote');

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

const SUBMIT_LABEL = { quote: 'Enviarme el presupuesto', order: 'Enviar pedido a Agloval' };
const KIND_LABEL = { quote: 'Presupuesto', order: 'Pedido' };

// Opens "Confirmar envío" from the panel's "Confirmar" and yields the window.
async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }));
  return screen.getByRole('dialog', { name: 'Confirmar envío' });
}

async function fillDetails(
  user: ReturnType<typeof userEvent.setup>,
  dialog: ReturnType<typeof within>,
  customer = lucia
) {
  await user.clear(dialog.getByLabelText('Nombre'));
  await user.type(dialog.getByLabelText('Nombre'), customer.name);
  await user.clear(dialog.getByLabelText('Correo electrónico'));
  await user.type(dialog.getByLabelText('Correo electrónico'), customer.email);
  await user.clear(dialog.getByLabelText('Teléfono'));
  await user.type(dialog.getByLabelText('Teléfono'), customer.phone);
  await user.click(dialog.getByRole('checkbox'));
}

// Sends the current order as a quote or an order and waits for the window to close.
async function confirmSubmission(
  user: ReturnType<typeof userEvent.setup>,
  kind: HistoryKind = 'order',
  { customer = lucia, reference }: { customer?: typeof lucia; reference?: string } = {}
) {
  const dialog = within(await openDetails(user));
  await user.click(dialog.getByRole('radio', { name: KIND_LABEL[kind] }));
  await fillDetails(user, dialog, customer);
  if (reference) await user.type(dialog.getByLabelText('Referencia (opcional)'), reference);
  await user.click(dialog.getByRole('button', { name: SUBMIT_LABEL[kind] }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

const sentMessage = (number: number, email = lucia.email) =>
  `Pedido nº ${number} enviado a Agloval. Te hemos mandado una copia a ${email}.`;
const quoteSentMessage = (number: number, email = lucia.email) =>
  `Presupuesto nº ${number} enviado. Te lo hemos mandado a ${email}.`;

describe('CuttingCalculator page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getFamilies).mockReset();
    vi.mocked(listProducts).mockReset();
    vi.mocked(searchCatalogProducts).mockReset();
    vi.mocked(getProduct).mockReset();
    mockedQuote.mockReset();
    mockedSubmit.mockReset();
    mockedSubmitQuote.mockReset();
    resetMocks();
  });

  test('shows the three blocks in order with their headings and no history window', async () => {
    await renderPage();
    expect(document.title).toBe('Gestor de pedidos · Agloval');

    const titles = screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent);
    expect(titles).toEqual(['Gestor de pedidos']);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Selecciona producto', 'Medidas y cantidad', 'Pedido actual']);
    expect(screen.getAllByRole('region')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Historial/ })).not.toBeInTheDocument();
    expect(document.querySelector('[aria-haspopup="dialog"]')).toBeNull();
    const banner = within(screen.getByRole('banner'));
    expect(banner.getByRole('link', { name: 'Presupuestos' })).toHaveAttribute(
      'href',
      '/presupuestos'
    );
    expect(banner.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/pedidos');
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

  test('"Confirmar" opens "Confirmar envío" with a quote chosen and the next numbers', async () => {
    seedHistory('quote', [], 3);
    seedHistory('order', [], 5);
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    const dialog = within(await openDetails(user));

    expect(dialog.getByRole('radio', { name: 'Presupuesto' })).toBeChecked();
    expect(dialog.getByRole('radio', { name: 'Presupuesto' })).toHaveAccessibleDescription(
      expect.stringContaining('Presupuesto nº 4')
    );
    expect(dialog.getByRole('radio', { name: 'Pedido' })).toHaveAccessibleDescription(
      expect.stringContaining('Pedido nº 6')
    );
    expect(dialog.getByText('1 línea · 123,45 EUR')).toBeInTheDocument();
    expect(dialog.getByLabelText('Nombre')).toHaveValue('');
    expect(mockedSubmit).not.toHaveBeenCalled();
    expect(mockedSubmitQuote).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);

    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
    expect(storedOrders()).toHaveLength(0);
    expect(storedQuotes()).toHaveLength(0);
  });

  test('sending a quote emails it to the customer only and saves it as a quote', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    await confirmSubmission(user, 'quote', { reference: 'Obra Calle Mayor' });

    expect(mockedSubmitQuote).toHaveBeenCalledWith({
      quoteNumber: 1,
      customer: lucia,
      reference: 'Obra Calle Mayor',
      privacyAccepted: true,
      lines: [{ productId: m2Product.id, pieces: [{ width: 100, height: 80, quantity: 20 }] }],
    });
    expect(mockedSubmit).not.toHaveBeenCalled();
    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(block.getByRole('status')).toHaveTextContent(quoteSentMessage(1));
    expect(screen.queryAllByTestId('order-line')).toHaveLength(0);
    expect(within(screen.getByRole('banner')).getByText('Hola, Lucía')).toBeInTheDocument();

    expect(storedOrders()).toHaveLength(0);
    expect(storedQuotes()).toHaveLength(1);
    expect(storedQuotes()[0]).toMatchObject({
      kind: 'quote',
      number: 1,
      customer: lucia,
      reference: 'Obra Calle Mayor',
    });
  });

  test('sending an order sends it to Agloval, saves it as an order, clears it and greets the customer', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    await confirmSubmission(user, 'order');

    expect(mockedSubmit).toHaveBeenCalledWith({
      orderNumber: 1,
      customer: lucia,
      privacyAccepted: true,
      lines: [{ productId: m2Product.id, pieces: [{ width: 100, height: 80, quantity: 20 }] }],
    });
    expect(mockedSubmitQuote).not.toHaveBeenCalled();
    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(block.getByRole('status')).toHaveTextContent(sentMessage(1));
    expect(screen.queryAllByTestId('order-line')).toHaveLength(0);
    const banner = within(screen.getByRole('banner'));
    expect(banner.getByText('Hola, Lucía')).toBeInTheDocument();
    expect(banner.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();

    expect(storedQuotes()).toHaveLength(0);
    expect(storedOrders()).toHaveLength(1);
    expect(storedOrders()[0]).toMatchObject({ kind: 'order', number: 1, customer: lucia });
  });

  test('a failed submission keeps the order and the window open and shows the server message', async () => {
    mockedSubmitQuote.mockRejectedValue(
      new Error('No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.')
    );
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    const dialog = within(await openDetails(user));
    await fillDetails(user, dialog);
    await user.click(dialog.getByRole('button', { name: SUBMIT_LABEL.quote }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.'
    );
    expect(screen.getByRole('dialog', { name: 'Confirmar envío' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: SUBMIT_LABEL.quote })).toBeEnabled();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
    expect(storedQuotes()).toHaveLength(0);
    expect(storedOrders()).toHaveLength(0);
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument();
  });

  test('shows a reference rejected by the server next to the field', async () => {
    mockedSubmit.mockRejectedValue(
      Object.assign(new Error('Request validation failed'), {
        fieldErrors: { reference: 'La referencia contiene caracteres no válidos' },
      })
    );
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    const dialog = within(await openDetails(user));
    await user.click(dialog.getByRole('radio', { name: 'Pedido' }));
    await fillDetails(user, dialog);
    await user.type(dialog.getByLabelText('Referencia (opcional)'), 'Obra');
    await user.click(dialog.getByRole('button', { name: SUBMIT_LABEL.order }));

    const reference = dialog.getByLabelText('Referencia (opcional)');
    await waitFor(() => expect(reference).toHaveAttribute('aria-invalid', 'true'));
    expect(reference).toHaveAccessibleDescription(
      expect.stringContaining('La referencia contiene caracteres no válidos')
    );
    expect(dialog.queryByRole('alert')).toBeNull();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
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
    await user.click(dialog.getByRole('radio', { name: 'Pedido' }));
    await user.click(dialog.getByRole('checkbox'));
    await user.click(dialog.getByRole('button', { name: SUBMIT_LABEL.order }));

    expect(dialog.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmando...' })).toBeDisabled();

    resolveSubmit();
    expect(await screen.findByText(sentMessage(1))).toBeInTheDocument();
  });

  test('"Cerrar sesión" removes the greeting and keeps the history', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmSubmission(user);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.queryByText('Hola, Lucía')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    expect(storedOrders()).toHaveLength(1);
    expect(localStorage.getItem('agloval_customer_v1')).toBe('null');
  });

  test('prefills the next confirmation with the remembered details', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmSubmission(user);

    await addUnitLine(user);
    await waitFor(() => expect(screen.getAllByTestId('order-line')).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
    );
    const dialog = within(await openDetails(user));

    expect(dialog.getByLabelText('Nombre')).toHaveValue(lucia.name);
    expect(dialog.getByLabelText('Correo electrónico')).toHaveValue(lucia.email);
    expect(dialog.getByLabelText('Teléfono')).toHaveValue(lucia.phone);
  });

  test('loads the lines of a past order requested through the router state', async () => {
    seedHistory('order', [pastEntry('order', 1)]);
    await renderPage({ pathname: '/', state: { reorder: 1, kind: 'order' } });

    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    await waitFor(() =>
      expect(block.getByRole('status')).toHaveTextContent('Pedido #1 cargado en el pedido actual')
    );
    expect(screen.getAllByTestId('order-line')).toHaveLength(2);
    await waitFor(() => expect(screen.getByTestId('router-state')).toHaveTextContent('null'));
  });

  test('loads the lines of a past quote requested through the router state', async () => {
    seedHistory('quote', [pastEntry('quote', 4)]);
    await renderPage({ pathname: '/', state: { reorder: 4, kind: 'quote' } });

    const block = within(screen.getByRole('region', { name: 'Pedido actual' }));
    await waitFor(() =>
      expect(block.getByRole('status')).toHaveTextContent(
        'Presupuesto #4 cargado en el pedido actual'
      )
    );
    expect(screen.getAllByTestId('order-line')).toHaveLength(2);
  });

  test('ignores a reorder request for an entry that no longer exists', async () => {
    await renderPage({ pathname: '/', state: { reorder: 9, kind: 'order' } });

    await waitFor(() => expect(screen.getByTestId('router-state')).toHaveTextContent('null'));
    expect(screen.queryAllByTestId('order-line')).toHaveLength(0);
    expect(getProduct).not.toHaveBeenCalled();
  });

  test('asks before replacing a non-empty order and keeps it when declined', async () => {
    seedHistory('order', [pastEntry('order', 1)]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = await renderPage('/', { reorder: 1, kind: 'order' });
    await addUnitLine(user);

    await user.click(screen.getByRole('button', { name: 'probe-reorder' }));

    expect(confirm).toHaveBeenCalledWith('¿Reemplazar el pedido actual?');
    await waitFor(() => expect(screen.getByTestId('router-state')).toHaveTextContent('null'));
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
    expect(getProduct).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  test('replaces a non-empty order when the customer accepts', async () => {
    seedHistory('order', [pastEntry('order', 1)]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = await renderPage('/', { reorder: 1, kind: 'order' });
    await addUnitLine(user);

    await user.click(screen.getByRole('button', { name: 'probe-reorder' }));

    await waitFor(() => expect(screen.getAllByTestId('order-line')).toHaveLength(2));
    expect(confirm).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  test('warns about the products that no longer exist when reordering', async () => {
    seedHistory('order', [pastEntry('order', 1)]);
    vi.mocked(getProduct).mockImplementation(async (id: string) => {
      if (id === m2Product.id) return m2Product;
      throw new Error('Product not found');
    });
    await renderPage({ pathname: '/', state: { reorder: 1, kind: 'order' } });

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
    await confirmSubmission(user);
    await screen.findByText(sentMessage(1));

    expect(document.body.textContent).not.toMatch(/desperdicio|aprovechamiento|utilizaci/i);
  });

  test('keeps the current order in a complementary panel', async () => {
    await renderPage();
    const panel = screen.getByRole('complementary', { name: 'Pedido actual' });
    expect(panel).toContainElement(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(panel).toContainElement(screen.getByTestId('order-total'));
  });

  test('keeps numbers out of the panel and offers the next ones after sending', async () => {
    const user = await renderPage();
    const block = () => within(screen.getByRole('region', { name: 'Pedido actual' }));
    expect(block().getByRole('heading', { level: 3 })).toHaveTextContent(/^Tu pedido$/);
    expect(block().queryByText(/nº/)).toBeNull();

    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await confirmSubmission(user, 'order');
    await screen.findByText(sentMessage(1));

    await addUnitLine(user);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled());
    const dialog = within(await openDetails(user));
    expect(dialog.getByRole('radio', { name: 'Presupuesto' })).toHaveAccessibleDescription(
      expect.stringContaining('Presupuesto nº 1')
    );
    expect(dialog.getByRole('radio', { name: 'Pedido' })).toHaveAccessibleDescription(
      expect.stringContaining('Pedido nº 2')
    );
  });

  test('shows a bottom order bar only while the order has lines', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const user = await renderPage();
    expect(screen.queryByTestId('order-bar')).not.toBeInTheDocument();

    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    const bar = screen.getByTestId('order-bar');
    expect(bar).toHaveTextContent('Tu pedido · 1 línea · 123,45 EUR');
    expect(bar).not.toHaveTextContent('nº');

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
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent('Familias no disponibles');
  });

  test('surfaces a products loading error in an alert', async () => {
    vi.mocked(listProducts).mockRejectedValue(new Error('Productos no disponibles'));
    renderApp();

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
