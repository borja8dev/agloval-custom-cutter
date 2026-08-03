import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { Product } from '../../types';

describe('ProductCard Component', () => {
  const mockProduct: Product = {
    id: 'prod_1',
    name: 'Melamina Blanca',
    categoryName: 'Melamina',
    standardWidth: 300,
    standardHeight: 200,
    thickness: 18,
    pricePerUnit: 95.5,
    currency: 'EUR'
  };

  test('should render product information', () => {
    const handleSelect = vi.fn();

    render(<ProductCard product={mockProduct} onSelect={handleSelect} />);

    expect(screen.getByText('Melamina Blanca')).toBeInTheDocument();
    expect(screen.getByText('Melamina')).toBeInTheDocument();
    expect(screen.getByText('300 cm')).toBeInTheDocument();
    expect(screen.getByText('200 cm')).toBeInTheDocument();
    expect(screen.getByText('€95.50')).toBeInTheDocument();
  });

  test('should call onSelect when clicked', () => {
    const handleSelect = vi.fn();

    render(<ProductCard product={mockProduct} onSelect={handleSelect} />);

    const card = screen.getByTestId('product-card');
    fireEvent.click(card);

    expect(handleSelect).toHaveBeenCalledWith(mockProduct);
  });

  test('should show selected state', () => {
    const handleSelect = vi.fn();

    render(
      <ProductCard product={mockProduct} isSelected={true} onSelect={handleSelect} />
    );

    expect(screen.getByText('✓ Seleccionado')).toBeInTheDocument();
  });
});
