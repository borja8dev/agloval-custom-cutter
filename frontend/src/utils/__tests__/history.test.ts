import { describe, expect, test } from 'vitest';
import {
  EMPTY_HISTORY,
  MAX_HISTORY_ENTRIES,
  appendEntry,
  markConverted,
  normalizeHistory,
  removeEntry,
  toHistoryLines
} from '../history';
import { makeQuote, sampleLines } from '../../test/fixtures';

const customer = { name: 'Lucía', email: 'lucia@example.com', phone: '600000000' };

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

describe('appendEntry', () => {
  const now = new Date('2026-10-09T10:00:00.000Z');

  test('numbers entries sequentially, puts the newest first and stamps the kind', () => {
    let state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines, {}, now);
    state = appendEntry(state, 'order', makeQuote({ total: 9 }), sampleLines, {}, now);
    expect(state.entries.map((e) => e.number)).toEqual([2, 1]);
    expect(state.counter).toBe(2);
    expect(state.entries[0]).toMatchObject({
      kind: 'order',
      total: 9,
      currency: 'EUR',
      createdAt: now.toISOString()
    });
    expect(state.entries[0].groups).toEqual(makeQuote().groups);
  });

  test('stores the optional customer, reference and source quote', () => {
    const state = appendEntry(
      EMPTY_HISTORY,
      'order',
      makeQuote(),
      sampleLines,
      { customer, reference: 'Cocina Pérez', fromQuoteNumber: 4 },
      now
    );
    expect(state.entries[0]).toMatchObject({ customer, reference: 'Cocina Pérez', fromQuoteNumber: 4 });
  });

  test('omits optional fields that were not given', () => {
    const state = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines, {}, now);
    expect(Object.keys(state.entries[0]).sort()).toEqual(
      ['createdAt', 'currency', 'groups', 'kind', 'lines', 'number', 'total'].sort()
    );
  });

  test('never reuses a number after a deletion', () => {
    let state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines, {}, now);
    state = appendEntry(state, 'order', makeQuote(), sampleLines, {}, now);
    state = removeEntry(state, 2);
    state = appendEntry(state, 'order', makeQuote(), sampleLines, {}, now);
    expect(state.entries.map((e) => e.number)).toEqual([3, 1]);
  });

  test('caps the list at 200 keeping the newest, counter keeps growing', () => {
    expect(MAX_HISTORY_ENTRIES).toBe(200);
    let state = EMPTY_HISTORY;
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      state = appendEntry(state, 'quote', makeQuote(), sampleLines, {}, now);
    }
    expect(state.entries).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(state.entries[0].number).toBe(MAX_HISTORY_ENTRIES + 5);
    expect(state.counter).toBe(MAX_HISTORY_ENTRIES + 5);
  });
});

describe('markConverted', () => {
  test('links a quote to the order it became, leaving the rest untouched', () => {
    let state = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines);
    state = appendEntry(state, 'quote', makeQuote(), sampleLines);
    const next = markConverted(state, 1, 7);
    expect(next.entries.find((e) => e.number === 1)?.convertedToOrder).toBe(7);
    expect(next.entries.find((e) => e.number === 2)?.convertedToOrder).toBeUndefined();
    expect(next.counter).toBe(2);
  });

  test('is a no-op for an unknown quote number', () => {
    const state = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines);
    expect(markConverted(state, 99, 7)).toEqual(state);
  });
});

describe('normalizeHistory', () => {
  test('accepts a valid state', () => {
    const state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines, {
      customer,
      reference: 'Ref',
      fromQuoteNumber: 2
    });
    expect(normalizeHistory(state, 'order')).toEqual(state);
  });

  test.each([
    null,
    undefined,
    3,
    'x',
    [],
    {},
    { counter: 'a', entries: [] },
    { counter: 1, entries: 'x' }
  ])('falls back to empty for malformed input %j', (bad) => {
    expect(normalizeHistory(bad, 'order')).toEqual(EMPTY_HISTORY);
  });

  test('counter never falls below the highest stored number', () => {
    const state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines);
    expect(normalizeHistory({ counter: 0, entries: state.entries }, 'order').counter).toBe(1);
  });

  test.each([
    { foo: 1 },
    { number: 'x' },
    { number: 2, createdAt: 1 },
    { number: 2, total: '3' },
    { number: 2, currency: null },
    { number: 2, lines: null },
    { number: 2, groups: {} }
  ])('drops entries with a missing or invalid required field %j', (patch) => {
    const state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines);
    const broken = 'foo' in patch ? patch : { ...state.entries[0], ...patch };
    const result = normalizeHistory({ counter: 1, entries: [...state.entries, broken] }, 'order');
    expect(result.entries).toHaveLength(1);
  });

  test('drops invalid optional fields but keeps the entry', () => {
    const state = appendEntry(EMPTY_HISTORY, 'order', makeQuote(), sampleLines);
    const raw = {
      counter: 1,
      entries: [
        {
          ...state.entries[0],
          customer: { name: 'Sin email' },
          reference: 42,
          fromQuoteNumber: -1,
          convertedToOrder: 'x'
        }
      ]
    };
    expect(normalizeHistory(raw, 'order')).toEqual(state);
  });

  test('forces the requested kind on every entry', () => {
    const state = appendEntry(EMPTY_HISTORY, 'quote', makeQuote(), sampleLines);
    const result = normalizeHistory(state, 'order');
    expect(result.entries[0].kind).toBe('order');
  });
});
