import { boardsForArea, priceWholeBoards } from '../../src/domain/services/BoardPricing';

// 1 m2 = 10,000 cm2. A 100 x 100 piece is exactly 1 m2.
const square = (quantity = 1) => ({ width: 100, height: 100, quantity });
const base = { boardAreaM2: 10, pricePerM2: 10, pricePerUnit: 0 };

describe('boardsForArea', () => {
  test('rounds up, with a minimum of one board', () => {
    expect(boardsForArea(37, 10)).toBe(4);
    expect(boardsForArea(10, 10)).toBe(1);
    expect(boardsForArea(0.0001, 10)).toBe(1);
  });

  test('ignores float noise beyond the epsilon', () => {
    expect(boardsForArea(10.000000000000002, 10)).toBe(1);
    expect(boardsForArea(10.01, 10)).toBe(2);
  });
});

describe('priceWholeBoards', () => {
  test('bills 4 boards when the area needs 3.7', () => {
    const result = priceWholeBoards({ ...base, pieces: [square(37)] });
    expect(result.boardsNeeded).toBe(4);
    expect(result.pricePerBoard).toBe(100);
    expect(result.totalPrice).toBe(400);
  });

  test('bills the same for 3.1 and 3.9 boards of area', () => {
    const low = priceWholeBoards({ ...base, pieces: [square(31)] });
    const high = priceWholeBoards({ ...base, pieces: [square(39)] });
    expect(low.boardsNeeded).toBe(4);
    expect(high.boardsNeeded).toBe(4);
    expect(low.totalPrice).toBe(high.totalPrice);
  });

  test('bills exactly one board for exactly 1.0 boards of area', () => {
    const result = priceWholeBoards({ ...base, pieces: [square(10)] });
    expect(result.boardsNeeded).toBe(1);
    expect(result.totalPrice).toBe(100);
  });

  test('does not add a board for float noise on an exact multiple', () => {
    // 0.1 m2 pieces x 30 = 3 m2 exactly on a 1 m2 board
    const result = priceWholeBoards({
      pieces: [{ width: 10, height: 100, quantity: 30 }],
      boardAreaM2: 1,
      pricePerM2: 10,
      pricePerUnit: 0,
    });
    expect(result.boardsNeeded).toBe(3);
  });

  test('adds a board when the area is beyond the epsilon', () => {
    // 10.0001 m2 on a 10 m2 board
    const result = priceWholeBoards({
      ...base,
      pieces: [{ width: 100.001, height: 1000, quantity: 1 }],
    });
    expect(result.boardsNeeded).toBe(2);
  });

  test('bills one board for a tiny area (minimum)', () => {
    const result = priceWholeBoards({ ...base, pieces: [{ width: 1, height: 1 }] });
    expect(result.boardsNeeded).toBe(1);
    expect(result.totalPrice).toBe(100);
  });

  test('rounds the board price to cents first, then multiplies', () => {
    // 3.66 m2 x 12.34 = 45.1644 -> 45.16 per board; 2 boards -> 90.32 (not 90.33)
    const result = priceWholeBoards({
      pieces: [square(5)],
      boardAreaM2: 3.66,
      pricePerM2: 12.34,
      pricePerUnit: 0,
    });
    expect(result.boardsNeeded).toBe(2);
    expect(result.pricePerBoard).toBe(45.16);
    expect(result.totalPrice).toBe(90.32);
    expect(Math.round(result.pricePerBoard * 100) * result.boardsNeeded).toBe(
      Math.round(result.totalPrice * 100)
    );
  });

  test('treats a missing quantity as 1', () => {
    const result = priceWholeBoards({
      ...base,
      pieces: [{ width: 100, height: 100 }],
    });
    expect(result.totalPrice).toBe(100);
  });

  test('uses pricePerUnit as the board price when pricePerM2 is null (legacy rows)', () => {
    // 95.50 EUR per 6 m2 board -> 15.92 EUR/m2 shown; 7 m2 needs 2 boards
    const result = priceWholeBoards({
      pieces: [square(7)],
      boardAreaM2: 6,
      pricePerM2: null,
      pricePerUnit: 95.5,
    });
    expect(result.boardsNeeded).toBe(2);
    expect(result.pricePerM2).toBe(15.92);
    expect(result.pricePerBoard).toBe(95.5);
    expect(result.totalPrice).toBe(191);
  });
});
