import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PiecesList } from '../PiecesList';

describe('PiecesList Component', () => {
  const mockPieces = [
    { width: 200, height: 100 },
    { width: 150, height: 150 }
  ];

  const mockHandlers = {
    onRemove: vi.fn(),
    onUpdate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should display empty state', () => {
    render(<PiecesList pieces={[]} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByText(/Aún no hay piezas/i)).toBeInTheDocument();
  });

  test('should display pieces', () => {
    render(<PiecesList pieces={mockPieces} {...mockHandlers} />);

    expect(screen.getByText('200 × 100 cm')).toBeInTheDocument();
    expect(screen.getByText('150 × 150 cm')).toBeInTheDocument();
  });

  test('should calculate area for each piece', () => {
    render(<PiecesList pieces={mockPieces} {...mockHandlers} />);

    // 200cm x 100cm = 2m x 1m = 2.00 m²; 150cm x 150cm = 1.5m x 1.5m = 2.25 m²
    expect(screen.getByText('Área: 2.00 m²')).toBeInTheDocument();
    expect(screen.getByText('Área: 2.25 m²')).toBeInTheDocument();
  });

  test('should call onRemove when clicking remove button', () => {
    render(<PiecesList pieces={mockPieces} {...mockHandlers} />);

    const removeButtons = screen.getAllByText('Quitar');
    fireEvent.click(removeButtons[0]);

    expect(mockHandlers.onRemove).toHaveBeenCalledWith(0);
  });

  test('should show summary', () => {
    render(<PiecesList pieces={mockPieces} {...mockHandlers} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
