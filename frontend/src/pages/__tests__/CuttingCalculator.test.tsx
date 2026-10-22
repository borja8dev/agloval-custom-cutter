import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/api', () => ({
  getFamilies: vi.fn(),
  listProducts: vi.fn(),
  searchCatalogProducts: vi.fn(),
  quoteOrder: vi.fn(),
  getProduct: vi.fn(),
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
}));

import { getFamilies, getProduct, listProducts, quoteOrder, searchCatalogProducts } from '../../services/api';
import { CuttingCalculator } from '../CuttingCalculator';
import { makeQuote, m2Product, mlProduct, udProduct } from '../../test/fixtures';
import type { CatalogProduct, Family, ProductListParams } from '../../types';

const families: Family[] = [
  { code: 'MEL', name: 'Melamina', productCount: 1, units: { UD: 0, M2: 1, ML: 0 } },
  { code: 'FER', name: 'Ferreteria', productCount: 1, units: { UD: 1, M2: 0, ML: 0 } }
];

const page = (products: CatalogProduct[]) => ({ products, count: products.length, total: products.length });

const mockedQuote = vi.mocked(quoteOrder);

function resetMocks() {
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
    resetMocks();
  });

  test('shows the three blocks in order with their headings and a history button', async () => {
    await renderPage();

    const titles = screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent);
    expect(titles).toEqual(['Gestor de pedidos']);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['1. Selecciona producto', '2. Medidas y cantidad', '3. Pedido actual']);
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
      expect(within(screen.getByTestId('product-list')).getByText(m2Product.name)).toBeInTheDocument()
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
            { productId: udProduct.id, quantity: 12 }
          ]
        },
        expect.anything()
      )
    );
  });

  test('keeps the total from the quote visible in the current order block', async () => {
    const user = await renderPage();

    await addBoardPiece(user);

    const total = await screen.findByText(/Total: 123,45 EUR/);
    const block = screen.getByRole('region', { name: '3. Pedido actual' });
    expect(block).toContainElement(total);
    expect(block).toContainElement(screen.getByTestId('order-total'));
  });

  test('confirming saves Pedido #1, clears the order and lists it in the history window', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Pedido #1 guardado');
    await waitFor(() => expect(screen.queryAllByTestId('order-line')).toHaveLength(0));

    const dialog = await openHistory(user, 1);
    const entries = within(dialog).getAllByTestId('history-entry');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent('Pedido #1');
    expect(within(dialog).queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  test('"Volver a pedir" closes the history window and reloads the lines of a past order', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await addUnitLine(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(screen.queryAllByTestId('order-line')).toHaveLength(0));

    const dialog = await openHistory(user, 1);
    await user.click(within(dialog).getByRole('button', { name: 'Volver a pedir' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const block = within(screen.getByRole('region', { name: '3. Pedido actual' }));
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
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(screen.queryAllByTestId('order-line')).toHaveLength(0));
    vi.mocked(getProduct).mockImplementation(async (id: string) => {
      if (id === m2Product.id) return m2Product;
      throw new Error('Product not found');
    });

    const dialog = await openHistory(user, 1);
    await user.click(within(dialog).getByRole('button', { name: 'Volver a pedir' }));

    const block = within(screen.getByRole('region', { name: '3. Pedido actual' }));
    const warning = await block.findByText(new RegExp(`ya no existen.*${udProduct.name}`, 'i'));
    expect(warning.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('order-line')).toHaveLength(1);
  });

  test('never shows waste or utilisation figures', async () => {
    const user = await renderPage();
    await addBoardPiece(user);
    await screen.findByText(/Total: 123,45 EUR/);
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await screen.findByText('Pedido #1 guardado');

    expect(document.body.textContent).not.toMatch(/desperdicio|aprovechamiento|utilizaci/i);
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
