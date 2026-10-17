import { describe, expect, test } from 'vitest';
import {
  EMPTY_HISTORY,
  MAX_HISTORY_ENTRIES,
  appendOrder,
  normalizeHistory,
  removeOrderEntry,
  toHistoryLines
} from '../orderHistory';
import { makeQuote, sampleLines } from '../../test/fixtures';

describe('toHistoryLines', () => {
  test('snapshots product identity and drops the full product object', () => {
    expect(toHistoryLines(sampleLines)).toEqual([
      {
        productId: 'p_m2',
        name: 'Melamina Blanca 244x122',
        sku: 'MEL-0001',
        unit: 'M2',
        pieces: [{ width: 100, height: 80, quantity: 2 }]
      },
      { productId: 'p_ud', name: 'Tornillo', sku: 'FER-0012', unit: 'UD', quantity: 12 }
    ]);
  });
});

describe('appendOrder', () => {
  const now = new Date('2026-10-09T10:00:00.000Z');

  test('numbers orders sequentially and puts the newest first', () => {
    let state = appendOrder(EMPTY_HISTORY, makeQuote(), sampleLines, now);
    state = appendOrder(state, makeQuote({ total: 9 }), sampleLines, now);
    expect(state.orders.map((o) => o.number)).toEqual([2, 1]);
    expect(state.counter).toBe(2);
    expect(state.orders[0]).toMatchObject({
      total: 9,
      currency: 'EUR',
      createdAt: now.toISOString()
    });
    expect(state.orders[0].groups).toEqual(makeQuote().groups);
  });

  test('never reuses a number after a deletion', () => {
    let state = appendOrder(EMPTY_HISTORY, makeQuote(), sampleLines, now);
    state = appendOrder(state, makeQuote(), sampleLines, now);
    state = removeOrderEntry(state, 2);
    state = appendOrder(state, makeQuote(), sampleLines, now);
    expect(state.orders.map((o) => o.number)).toEqual([3, 1]);
  });

  test('caps the list at 50 keeping the newest, counter keeps growing', () => {
    let state = EMPTY_HISTORY;
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      state = appendOrder(state, makeQuote(), sampleLines, now);
    }
    expect(state.orders).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(state.orders[0].number).toBe(MAX_HISTORY_ENTRIES + 5);
    expect(state.counter).toBe(MAX_HISTORY_ENTRIES + 5);
  });
});

describe('normalizeHistory', () => {
  test('accepts a valid state', () => {
    const state = appendOrder(EMPTY_HISTORY, makeQuote(), sampleLines);
    expect(normalizeHistory(state)).toEqual(state);
  });

  test.each([null, undefined, 3, 'x', [], {}, { counter: 'a', orders: [] }, { counter: 1, orders: 'x' }])(
    'falls back to empty for malformed input %j',
    (bad) => {
      expect(normalizeHistory(bad)).toEqual(EMPTY_HISTORY);
    }
  );

  test('counter never falls below the highest stored number', () => {
    const state = appendOrder(EMPTY_HISTORY, makeQuote(), sampleLines);
    expect(normalizeHistory({ counter: 0, orders: state.orders }).counter).toBe(1);
  });

  test('drops entries without a numeric number', () => {
    const state = appendOrder(EMPTY_HISTORY, makeQuote(), sampleLines);
    const result = normalizeHistory({ counter: 1, orders: [...state.orders, { foo: 1 }] });
    expect(result.orders).toHaveLength(1);
  });
});
