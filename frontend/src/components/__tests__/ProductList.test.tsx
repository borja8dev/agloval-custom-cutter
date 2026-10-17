import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductList } from '../ProductList';
import { m2Product, udProduct, mlProduct, makeProduct } from '../../test/fixtures';
import type { CatalogProduct } from '../../types';

function setup(props: Partial<React.ComponentProps<typeof ProductList>> = {}) {
  const onSelect = vi.fn();
  const onQueryChange = vi.fn();
  const products: CatalogProduct[] = [m2Product, udProduct, mlProduct];
  render(
    <ProductList
      products={products}
      selectedId={null}
      onSelect={onSelect}
      countsByProduct={{}}
      query=""
      onQueryChange={onQueryChange}
      {...props}
    />
  );
  return { onSelect, onQueryChange };
}

describe('ProductList', () => {
  test('renders one row per product inside the scroll container', () => {
    setup();
    const list = screen.getByTestId('product-list');
    expect(list).toHaveClass('max-h-80', 'overflow-y-auto');
    expect(within(list).getAllByTestId('product-item')).toHaveLength(3);
  });

  test('shows name, sku, unit badge, measure and price per row', () => {
    setup();
    const [m2, ud, ml] = screen.getAllByTestId('product-item');
    expect(m2).toHaveTextContent('Melamina Blanca 244x122');
    expect(m2).toHaveTextContent('MEL-0001');
    expect(m2).toHaveTextContent('Tablero');
    expect(m2).toHaveTextContent('244 x 122 cm');
    expect(m2).toHaveTextContent('16 mm');
    expect(m2).toHaveTextContent('15,50 EUR/m2');
    expect(ud).toHaveTextContent('Unidad');
    expect(ud).toHaveTextContent('0,35 EUR/ud');
    expect(ml).toHaveTextContent('Barra');
    expect(ml).toHaveTextContent('2,40 m');
    expect(ml).toHaveTextContent('5,00 EUR/m');
  });

  test('falls back to price per board when pricePerM2 is null', () => {
    setup({ products: [makeProduct({ pricePerM2: null, pricePerUnit: 46.14 })] });
    expect(screen.getByTestId('product-item')).toHaveTextContent('46,14 EUR/tablero');
  });

  test('marks the selected row with aria-selected', () => {
    setup({ selectedId: 'p_ud' });
    const items = screen.getAllByTestId('product-item');
    expect(items[1]).toHaveAttribute('aria-selected', 'true');
    expect(items[0]).toHaveAttribute('aria-selected', 'false');
  });

  test('selects on click', async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getAllByTestId('product-item')[1]);
    expect(onSelect).toHaveBeenCalledWith(udProduct);
  });

  test('selects with the keyboard (Tab then Enter / Space)', async () => {
    const { onSelect } = setup();
    await userEvent.tab(); // search input
    await userEvent.tab(); // first row
    expect(screen.getAllByTestId('product-item')[0]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(m2Product);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenLastCalledWith(udProduct);
  });

  test('shows the in-order badge only for products already ordered', () => {
    setup({ countsByProduct: { p_ud: 3, p_ml: 0 } });
    const badges = screen.getAllByTestId('in-order-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('3 en el pedido');
    expect(screen.getAllByTestId('product-item')[1]).toContainElement(badges[0]);
  });

  test('search input is labelled and reports typing', async () => {
    const { onQueryChange } = setup();
    const input = screen.getByLabelText('Buscar producto');
    expect(input).toBe(screen.getByTestId('product-search'));
    await userEvent.type(input, 'ab');
    expect(onQueryChange).toHaveBeenNthCalledWith(1, 'a');
    expect(onQueryChange).toHaveBeenNthCalledWith(2, 'b'); // controlled by parent: value stays ''
  });

  test('shows the current query value', () => {
    setup({ query: 'melamina' });
    expect(screen.getByTestId('product-search')).toHaveValue('melamina');
  });

  test('shows the loading state', () => {
    setup({ products: [], isLoading: true });
    expect(screen.getByText('Cargando productos...')).toBeInTheDocument();
    expect(screen.queryByText('No hay productos para este filtro')).not.toBeInTheDocument();
  });

  test('shows the error through an alert', () => {
    setup({ products: [], error: 'Fallo de red' });
    expect(screen.getByRole('alert')).toHaveTextContent('Fallo de red');
  });

  test('shows the empty state', () => {
    setup({ products: [] });
    expect(screen.getByText('No hay productos para este filtro')).toBeInTheDocument();
  });

  test('shows the footer only when total exceeds the list', () => {
    const { rerender } = render(<div />);
    rerender(<div />);
    setup({ total: 120 });
    expect(screen.getByText('Mostrando 3 de 120')).toBeInTheDocument();
  });

  test('hides the footer when everything is shown', () => {
    setup({ total: 3 });
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });
});
