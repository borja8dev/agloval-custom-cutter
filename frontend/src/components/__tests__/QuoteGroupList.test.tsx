import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteGroupList } from '../QuoteGroupList';
import { makeQuote } from '../../test/fixtures';
import type {
  QuoteBoardGroup,
  QuoteGroup,
  QuoteLinearGroup,
  QuoteProductSummary,
} from '../../types';

const summary = (overrides: Partial<QuoteProductSummary>): QuoteProductSummary => ({
  id: 'p',
  sku: 'SKU',
  name: 'Producto',
  unit: 'UD',
  familyCode: 'F',
  familyName: 'Familia',
  thickness: null,
  boardWidth: null,
  boardHeight: null,
  lengthCm: null,
  ...overrides,
});

const boardGroup: QuoteBoardGroup = {
  kind: 'BOARD',
  product: summary({
    id: 'p_m2',
    name: 'Melamina Blanca',
    unit: 'M2',
    thickness: 16,
    boardWidth: 244,
    boardHeight: 122,
  }),
  pieces: [{ width: 100, height: 80, quantity: 5 }],
  pieceCount: 5,
  usedAreaM2: 4,
  boardAreaM2: 2.9768,
  boardsNeeded: 2,
  pricePerM2: 15.5,
  pricePerBoard: 46.14,
  price: 62,
};

const linearGroup: QuoteLinearGroup = {
  kind: 'LINEAR',
  product: summary({ id: 'p_ml', name: 'Perfil', unit: 'ML', lengthCm: 240 }),
  quantity: 3,
  lengthM: 2.4,
  pricePerMeter: 5,
  price: 36,
};

describe('QuoteGroupList', () => {
  test('renders nothing for an empty list', () => {
    const { container } = render(<QuoteGroupList groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders a board group as used area x price per m² = price', () => {
    render(<QuoteGroupList groups={[boardGroup]} />);
    const item = screen.getByTestId('quote-group');
    expect(item).toHaveTextContent('4,00 m² x 15,50 EUR/m² = 62,00 EUR');
    expect(item).toHaveTextContent('Melamina Blanca');
    expect(item).toHaveTextContent('16 mm');
    expect(item).not.toHaveTextContent('por tablero');
  });

  test('shows the board count as information with the board size', () => {
    render(<QuoteGroupList groups={[boardGroup]} />);
    expect(screen.getByTestId('quote-group')).toHaveTextContent(
      'Necesitas 2 tableros de 244 x 122 cm'
    );
  });

  test('uses the singular for one board', () => {
    render(<QuoteGroupList groups={[{ ...boardGroup, boardsNeeded: 1 }]} />);
    expect(screen.getByTestId('quote-group')).toHaveTextContent('Necesitas 1 tablero de');
    expect(screen.queryByText(/1 tableros/)).toBeNull();
  });

  test('falls back to the per-board wording for stored entries without pricePerM2', () => {
    const stored = { ...boardGroup, pricePerM2: undefined } as unknown as QuoteBoardGroup;
    render(<QuoteGroupList groups={[stored]} />);
    const item = screen.getByTestId('quote-group');
    expect(item).toHaveTextContent('46,14 EUR por tablero = 62,00 EUR');
    expect(item).toHaveTextContent('2 tableros');
  });

  test('renders a unit group as quantity x price = total', () => {
    render(<QuoteGroupList groups={makeQuote().groups} />);
    const item = screen.getByTestId('quote-group');
    expect(item).toHaveTextContent('Tornillo');
    expect(item).toHaveTextContent('12 x 0,35 EUR = 4,20 EUR');
  });

  test('renders a linear group as bars x price per metre = total', () => {
    render(<QuoteGroupList groups={[linearGroup]} />);
    expect(screen.getByTestId('quote-group')).toHaveTextContent(
      '3 barras de 2,40 m x 5,00 EUR/m = 36,00 EUR'
    );
  });

  test('uses the singular for one bar', () => {
    render(<QuoteGroupList groups={[{ ...linearGroup, quantity: 1, price: 12 }]} />);
    expect(screen.getByTestId('quote-group')).toHaveTextContent('1 barra de 2,40 m');
  });

  test('renders one item per group and never mentions waste', () => {
    const groups: QuoteGroup[] = [boardGroup, ...makeQuote().groups, linearGroup];
    render(<QuoteGroupList groups={groups} />);
    expect(screen.getAllByTestId('quote-group')).toHaveLength(3);
    expect(screen.queryByText(/desperdicio|aprovechamiento|utilizaci/i)).toBeNull();
  });
});
