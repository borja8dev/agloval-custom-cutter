import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderSummary } from '../OrderSummary';
import { m2Product, mlProduct, makeQuote, sampleLines } from '../../test/fixtures';
import type { OrderLine, OrderQuote, QuoteGroup } from '../../types';

const boardGroup: QuoteGroup = {
  kind: 'BOARD',
  product: {
    id: 'p_m2',
    sku: 'MEL-0001',
    name: 'Melamina Blanca 244x122',
    unit: 'M2',
    familyCode: 'MEL',
    familyName: 'Melamina',
    thickness: 16,
    boardWidth: 244,
    boardHeight: 122,
    lengthCm: null,
  },
  pieces: [{ width: 100, height: 80, quantity: 5 }],
  pieceCount: 5,
  usedAreaM2: 4,
  boardAreaM2: 2.9768,
  boardsNeeded: 2,
  pricePerM2: 15.5,
  pricePerBoard: 46.14,
  price: 92.28,
};

const fullQuote: OrderQuote = makeQuote({
  groups: [boardGroup, ...makeQuote().groups],
  total: 96.48,
});

function setup(props: Partial<React.ComponentProps<typeof OrderSummary>> = {}) {
  const handlers = {
    onUpdatePiece: vi.fn(),
    onRemovePiece: vi.fn(),
    onUpdateQuantity: vi.fn(),
    onRemoveLine: vi.fn(),
    onConfirm: vi.fn(),
    onClear: vi.fn(),
  };
  render(<OrderSummary lines={sampleLines} quote={fullQuote} {...handlers} {...props} />);
  return handlers;
}

describe('OrderSummary', () => {
  test('shows an empty state with disabled actions', () => {
    setup({ lines: [], quote: null });
    expect(screen.getByText('El pedido está vacío')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vaciar pedido' })).toBeDisabled();
    expect(screen.getByTestId('order-total')).toHaveTextContent('Total: 0,00 EUR');
  });

  test('renders M2 lines with their pieces and UD lines with quantity', () => {
    setup();
    const list = screen.getByTestId('order-lines');
    expect(list).toHaveClass('max-h-96', 'overflow-y-auto');
    expect(within(list).getAllByTestId('order-line')).toHaveLength(2);
    const [m2, ud] = screen.getAllByTestId('order-line');
    expect(m2).toHaveTextContent('Melamina Blanca 244x122');
    expect(m2).toHaveTextContent('MEL-0001');
    expect(m2).toHaveTextContent('100 x 80 cm x');
    expect(within(m2).getByRole('spinbutton')).toHaveValue(2);
    expect(ud).toHaveTextContent('Tornillo');
    expect(within(ud).getByRole('spinbutton', { name: 'Cantidad de Tornillo' })).toHaveValue(12);
  });

  test('renders ML lines with a quantity input', () => {
    const lines: OrderLine[] = [{ id: 'l3', product: mlProduct, quantity: 3 }];
    setup({ lines, quote: null });
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Perfil 2.4 m' })).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'Eliminar línea' })).toBeInTheDocument();
  });

  test('shows the quote groups matched to each line by product id', () => {
    setup();
    const [m2, ud] = screen.getAllByTestId('order-line');
    expect(within(m2).getAllByTestId('quote-group')).toHaveLength(1);
    expect(m2).toHaveTextContent('4,00 m² usados · 2 tableros de 244 x 122 cm');
    expect(m2).toHaveTextContent('2 tableros x 46,14 EUR = 92,28 EUR');
    expect(ud).toHaveTextContent('12 x 0,35 EUR = 4,20 EUR');
  });

  test('shows the total with two decimals and comma', () => {
    setup();
    expect(screen.getByTestId('order-total')).toHaveTextContent('Total: 96,48 EUR');
  });

  test('keeps the total bar outside the scrolling lines container', () => {
    const many: OrderLine[] = Array.from({ length: 30 }, (_, i) => ({
      id: `line${i}`,
      product: { ...m2Product, id: `p${i}`, name: `Producto ${i}` },
      pieces: [{ width: 10, height: 10, quantity: 1 }],
    }));
    setup({ lines: many });
    const total = screen.getByTestId('order-total');
    expect(screen.getByTestId('order-lines')).not.toContainElement(total);
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeInTheDocument();
    expect(screen.getByTestId('order-lines')).not.toContainElement(
      screen.getByRole('button', { name: 'Confirmar pedido' })
    );
  });

  test('edits a piece quantity on blur with exact arguments', async () => {
    const { onUpdatePiece } = setup();
    const [m2] = screen.getAllByTestId('order-line');
    const input = within(m2).getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    expect(onUpdatePiece).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onUpdatePiece).toHaveBeenCalledWith('l1', 0, { width: 100, height: 80, quantity: 5 });
  });

  test('commits a piece quantity with Enter', async () => {
    const { onUpdatePiece } = setup();
    const [m2] = screen.getAllByTestId('order-line');
    const input = within(m2).getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '7{Enter}');
    expect(onUpdatePiece).toHaveBeenCalledWith('l1', 0, { width: 100, height: 80, quantity: 7 });
  });

  test('ignores invalid piece quantities and restores the value', async () => {
    const { onUpdatePiece } = setup();
    const [m2] = screen.getAllByTestId('order-line');
    const input = within(m2).getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.tab();
    expect(onUpdatePiece).not.toHaveBeenCalled();
    expect(input).toHaveValue(2);
  });

  test('removes a piece with exact arguments', async () => {
    const { onRemovePiece } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar pieza' }));
    expect(onRemovePiece).toHaveBeenCalledWith('l1', 0);
  });

  test('edits a line quantity and removes a line', async () => {
    const { onUpdateQuantity, onRemoveLine } = setup();
    const input = screen.getByRole('spinbutton', { name: 'Cantidad de Tornillo' });
    await userEvent.clear(input);
    await userEvent.type(input, '20{Enter}');
    expect(onUpdateQuantity).toHaveBeenCalledWith('l2', 20);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar línea' }));
    expect(onRemoveLine).toHaveBeenCalledWith('l2');
  });

  test('confirms and clears the order', async () => {
    const { onConfirm, onClear } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Vaciar pedido' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('disables Confirmar without a quote, while loading and while confirming', () => {
    const { unmount } = render(
      <OrderSummary
        lines={sampleLines}
        quote={null}
        onUpdatePiece={vi.fn()}
        onRemovePiece={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onRemoveLine={vi.fn()}
        onConfirm={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();
    unmount();
  });

  test('disables Confirmar while loading and keeps the previous values', () => {
    setup({ isLoading: true });
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();
    expect(screen.getByText('Calculando...')).toBeInTheDocument();
    expect(screen.getByTestId('order-total')).toHaveTextContent('Total: 96,48 EUR');
    expect(screen.getAllByTestId('order-line')[0]).toHaveTextContent('92,28 EUR');
  });

  test('announces the calculating status through an aria-live region', () => {
    setup({ isLoading: true });
    expect(screen.getByText('Calculando...').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });

  test('disables Confirmar while confirming', () => {
    setup({ isConfirming: true });
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
  });

  test('shows errors through the alert', () => {
    setup({ error: 'No se pudo calcular' });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo calcular');
  });

  test('never shows waste information', () => {
    setup();
    expect(screen.queryByText(/desperdicio|aprovechamiento|utilizaci/i)).toBeNull();
  });
});
