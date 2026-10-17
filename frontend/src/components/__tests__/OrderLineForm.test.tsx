import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderLineForm } from '../OrderLineForm';
import { m2Product, udProduct, mlProduct } from '../../test/fixtures';
import type { CatalogProduct } from '../../types';

function setup(product: CatalogProduct | null) {
  const onAddPiece = vi.fn();
  const onAddQuantity = vi.fn();
  const utils = render(
    <OrderLineForm product={product} onAddPiece={onAddPiece} onAddQuantity={onAddQuantity} />
  );
  return { onAddPiece, onAddQuantity, ...utils };
}

const fill = async (testId: string, value: string) => {
  const el = screen.getByTestId(testId);
  await userEvent.clear(el);
  await userEvent.type(el, value);
};

describe('OrderLineForm', () => {
  test('shows a hint without product', () => {
    setup(null);
    expect(screen.getByText('Selecciona un producto para añadirlo al pedido')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('M2', () => {
    test('renders labelled width, height and quantity inputs', () => {
      setup(m2Product);
      expect(screen.getByLabelText('Ancho (cm)')).toBe(screen.getByTestId('width-input'));
      expect(screen.getByLabelText('Alto (cm)')).toBe(screen.getByTestId('height-input'));
      expect(screen.getByLabelText('Cantidad de piezas iguales')).toBe(
        screen.getByTestId('quantity-input')
      );
      expect(screen.getByTestId('quantity-input')).toHaveValue(1);
      expect(screen.getByRole('button', { name: 'Añadir pieza' })).toBe(
        screen.getByTestId('add-piece-btn')
      );
    });

    test('adds a valid piece, clears dimensions and keeps quantity at 1', async () => {
      const { onAddPiece } = setup(m2Product);
      await fill('width-input', '100');
      await fill('height-input', '50');
      await fill('quantity-input', '4');
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(onAddPiece).toHaveBeenCalledWith({ width: 100, height: 50, quantity: 4 });
      expect(screen.getByTestId('width-input')).toHaveValue(null);
      expect(screen.getByTestId('height-input')).toHaveValue(null);
      expect(screen.getByTestId('quantity-input')).toHaveValue(1);
      expect(screen.queryByText(/mínimo|máximo|Introduce/)).not.toBeInTheDocument();
    });

    test('accepts the exact limits', async () => {
      const { onAddPiece } = setup(m2Product);
      await fill('width-input', '2');
      await fill('height-input', '15');
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      await fill('width-input', '244');
      await fill('height-input', '122');
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(onAddPiece).toHaveBeenCalledTimes(2);
    });

    test('Enter in an input submits', async () => {
      const { onAddPiece } = setup(m2Product);
      await fill('width-input', '100');
      await userEvent.type(screen.getByTestId('height-input'), '50{Enter}');
      expect(onAddPiece).toHaveBeenCalledWith({ width: 100, height: 50, quantity: 1 });
    });

    test.each([
      ['width-input', '1', '100', 'El ancho mínimo es 2 cm'],
      ['height-input', '14', '100', 'El alto mínimo es 15 cm'],
    ])('rejects %s below minimum', async (testId, bad, other, message) => {
      const { onAddPiece } = setup(m2Product);
      const isWidth = testId === 'width-input';
      await fill('width-input', isWidth ? bad : other);
      await fill('height-input', isWidth ? other : bad);
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(onAddPiece).not.toHaveBeenCalled();
    });

    test('rejects dimensions above the board', async () => {
      const { onAddPiece } = setup(m2Product);
      await fill('width-input', '245');
      await fill('height-input', '50');
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(screen.getByText('El ancho máximo es 244 cm')).toBeInTheDocument();
      await fill('width-input', '100');
      await fill('height-input', '123');
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(screen.getByText('El alto máximo es 122 cm')).toBeInTheDocument();
      expect(onAddPiece).not.toHaveBeenCalled();
    });

    test('rejects empty dimensions', async () => {
      const { onAddPiece } = setup(m2Product);
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(screen.getByText('Introduce el ancho')).toBeInTheDocument();
      expect(screen.getByText('Introduce el alto')).toBeInTheDocument();
      expect(onAddPiece).not.toHaveBeenCalled();
    });

    test.each(['0', '1.5', '10001', '-2'])('rejects quantity %s', async (q) => {
      const { onAddPiece } = setup(m2Product);
      await fill('width-input', '100');
      await fill('height-input', '50');
      await fill('quantity-input', q);
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      expect(
        screen.getByText('La cantidad debe ser un entero entre 1 y 10000')
      ).toBeInTheDocument();
      expect(onAddPiece).not.toHaveBeenCalled();
    });

    test('announces validation messages with aria-live', async () => {
      setup(m2Product);
      await userEvent.click(screen.getByTestId('add-piece-btn'));
      const live = screen.getByText('Introduce el ancho').closest('[aria-live]');
      expect(live).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('UD and ML', () => {
    test('UD shows only quantity and no measure', () => {
      setup(udProduct);
      expect(screen.queryByTestId('width-input')).not.toBeInTheDocument();
      expect(screen.queryByText(/Medida fija/)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Cantidad')).toBe(screen.getByTestId('quantity-input'));
      expect(screen.getByTestId('quantity-input')).toHaveValue(1);
      expect(screen.getByRole('button', { name: 'Añadir al pedido' })).toBe(
        screen.getByTestId('add-line-btn')
      );
    });

    test('ML shows the fixed measure read-only', () => {
      setup(mlProduct);
      expect(screen.getByText('Medida fija: 2,40 m')).toBeInTheDocument();
      expect(screen.queryByTestId('width-input')).not.toBeInTheDocument();
    });

    test('adds a quantity and resets it to 1', async () => {
      const { onAddQuantity } = setup(udProduct);
      await fill('quantity-input', '12');
      await userEvent.click(screen.getByTestId('add-line-btn'));
      expect(onAddQuantity).toHaveBeenCalledWith(12);
      expect(screen.getByTestId('quantity-input')).toHaveValue(1);
    });

    test('Enter submits', async () => {
      const { onAddQuantity } = setup(mlProduct);
      await userEvent.type(screen.getByTestId('quantity-input'), '{Backspace}3{Enter}');
      expect(onAddQuantity).toHaveBeenCalledWith(3);
    });

    test.each(['0', '1.5', '100001', ''])('rejects quantity "%s"', async (q) => {
      const { onAddQuantity } = setup(udProduct);
      await userEvent.clear(screen.getByTestId('quantity-input'));
      if (q) await userEvent.type(screen.getByTestId('quantity-input'), q);
      await userEvent.click(screen.getByTestId('add-line-btn'));
      expect(
        screen.getByText('La cantidad debe ser un entero entre 1 y 100000')
      ).toBeInTheDocument();
      expect(onAddQuantity).not.toHaveBeenCalled();
    });
  });

  test('resets the form when the product changes', async () => {
    const { rerender, onAddPiece, onAddQuantity } = setup(m2Product);
    await fill('width-input', '100');
    await fill('quantity-input', '5');
    await userEvent.click(screen.getByTestId('add-piece-btn')); // triggers a height error
    expect(screen.getByText('Introduce el alto')).toBeInTheDocument();
    rerender(
      <OrderLineForm product={udProduct} onAddPiece={onAddPiece} onAddQuantity={onAddQuantity} />
    );
    expect(screen.queryByText('Introduce el alto')).not.toBeInTheDocument();
    expect(screen.getByTestId('quantity-input')).toHaveValue(1);
    rerender(
      <OrderLineForm product={m2Product} onAddPiece={onAddPiece} onAddQuantity={onAddQuantity} />
    );
    expect(screen.getByTestId('width-input')).toHaveValue(null);
  });
});
