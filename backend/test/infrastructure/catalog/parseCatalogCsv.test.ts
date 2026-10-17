import fs from 'fs';
import path from 'path';
import { parseCatalogCsv } from '../../../src/infrastructure/catalog/parseCatalogCsv';

const HEADER = 'fam;art;des;pvp1;unimed;medida1;medida2;art2;';

const row = (
  fam: string,
  art: string,
  des: string,
  pvp: string,
  unit: string,
  m1 = '0,00',
  m2 = '0,00'
): string => `${fam};${art};${des};${pvp};${unit};${m1};${m2};${art};`;

const build = (...lines: string[]): string =>
  ['Tabla 1', ';;;;;;;;', ...lines].join('\n');

const csv = (...rows: string[]): string => build(HEADER, ...rows);

describe('parseCatalogCsv', () => {
  describe('header and file format', () => {
    it('ignores junk lines before the header and reports 1-based line numbers', () => {
      const content = ['Tabla 1', ';;;;;;;;', 'x', HEADER, row('03', 'A1', 'Item', '1,50', 'UD'), ';;;;;;;;'].join('\n');
      const result = parseCatalogCsv(content);
      expect(result.items).toHaveLength(1);
      expect(result.skipped).toEqual([{ line: 6, reason: 'EMPTY_ROW', raw: ';;;;;;;;' }]);
    });

    it('finds the header case-insensitively', () => {
      const result = parseCatalogCsv(['FAM;ART;DES;PVP1;UNIMED;m1;m2;art2;', row('03', 'A1', 'Item', '1,50', 'UD')].join('\n'));
      expect(result.items).toHaveLength(1);
    });

    it('throws a clear error when the header is missing', () => {
      expect(() => parseCatalogCsv('Tabla 1\n;;;\nfoo;bar')).toThrow(/header/i);
    });

    it('strips a BOM and handles CRLF line endings', () => {
      const content = '﻿' + csv(row('03', 'A1', 'Item', '1,50', 'UD'), row('04', 'A2', 'Other', '2,00', 'UD')).replace(/\n/g, '\r\n');
      const result = parseCatalogCsv(content);
      expect(result.items.map((i) => i.sku)).toEqual(['A1', 'A2']);
      expect(result.items[0].name).toBe('Item');
    });
  });

  describe('field mapping', () => {
    it('converts decimal comma prices to numbers', () => {
      const result = parseCatalogCsv(csv(row('03', 'A1', 'Item', '12,345', 'UD')));
      expect(result.items[0].price).toBe(12.345);
    });

    it('keeps family code as text with leading zeros and sku with case', () => {
      const result = parseCatalogCsv(csv(row('03', '37ZOCÇAMSACA', 'Item', '1,00', 'UD'), row('091', 'b2', 'Two', '1,00', 'UD')));
      expect(result.items[0]).toMatchObject({ familyCode: '03', sku: '37ZOCÇAMSACA' });
      expect(result.items[1]).toMatchObject({ familyCode: '091', sku: 'b2' });
    });

    it('trims every field', () => {
      const result = parseCatalogCsv(csv(' 03 ; A1 ;  Item   name  ; 1,00 ; UD ; ; ;x;'));
      expect(result.items[0]).toMatchObject({ familyCode: '03', sku: 'A1', name: 'Item name', unit: 'UD' });
    });

    it('M2 uses medida1/medida2 as centimetres with float-safe rounding', () => {
      const result = parseCatalogCsv(csv(
        row('01', 'M1', 'Board', '10,00', 'M2', '2,44', '1,22'),
        row('01', 'M2X', 'Board two', '10,00', 'M2', '2,07', '1,22')
      ));
      expect(result.items[0]).toMatchObject({ unit: 'M2', widthCm: 244, heightCm: 122 });
      expect(result.items[0].lengthCm).toBeUndefined();
      expect(result.items[1].widthCm).toBe(207);
    });

    it('ML uses medida1 as length and ignores medida2', () => {
      const result = parseCatalogCsv(csv(row('02', 'L1', 'Bar', '5,00', 'ML', '3,00', '1,00')));
      expect(result.items[0]).toMatchObject({ unit: 'ML', lengthCm: 300 });
      expect(result.items[0].widthCm).toBeUndefined();
      expect(result.items[0].heightCm).toBeUndefined();
    });

    it('UD ignores placeholder measures', () => {
      const result = parseCatalogCsv(csv(row('02', 'U1', 'Unit', '5,00', 'UD', '300,00', '1,00')));
      const item = result.items[0];
      expect(item.widthCm).toBeUndefined();
      expect(item.heightCm).toBeUndefined();
      expect(item.lengthCm).toBeUndefined();
      expect(item.thicknessMm).toBeUndefined();
    });

    it('extracts thickness for M2 only', () => {
      const result = parseCatalogCsv(csv(
        row('01', 'T1', 'MDF 10mm raw', '10,00', 'M2', '2,44', '1,22'),
        row('01', 'T2', 'Board 19 MM', '10,00', 'M2', '2,44', '1,22'),
        row('01', 'T3', 'Board plain', '10,00', 'M2', '2,44', '1,22'),
        row('01', 'T4', 'Screw 10mm', '1,00', 'UD')
      ));
      expect(result.items.map((i) => i.thicknessMm)).toEqual([10, 19, undefined, undefined]);
    });

    it('cleans % and . prefixes but keeps the raw description', () => {
      const result = parseCatalogCsv(csv(
        row('01', 'P1', '%  Offer   item', '1,00', 'UD'),
        row('01', 'P2', '. Dotted item', '1,00', 'UD')
      ));
      expect(result.items[0]).toMatchObject({ name: 'Offer item', rawDescription: '%  Offer   item' });
      expect(result.items[1]).toMatchObject({ name: 'Dotted item', rawDescription: '. Dotted item' });
      expect(result.warnings.map((w) => w.code)).toEqual(['PERCENT_PREFIX', 'DOT_PREFIX']);
    });
  });

  describe('skipped rows', () => {
    const reasonOf = (r: string): string[] => parseCatalogCsv(csv(r)).skipped.map((s) => s.reason);

    it('EMPTY_ROW is skipped and not counted in totalRows', () => {
      const result = parseCatalogCsv(csv(';;;;;;;;', row('03', 'A1', 'Item', '1,00', 'UD')));
      expect(result.skipped[0].reason).toBe('EMPTY_ROW');
      expect(result.summary.totalRows).toBe(1);
    });

    it('MISSING_FIELD', () => {
      expect(reasonOf(row('', 'A1', 'Item', '1,00', 'UD'))).toEqual(['MISSING_FIELD']);
      expect(reasonOf(row('03', '', 'Item', '1,00', 'UD'))).toEqual(['MISSING_FIELD']);
      expect(reasonOf(row('03', 'A1', '', '1,00', 'UD'))).toEqual(['MISSING_FIELD']);
    });

    it('INVALID_PRICE for non numeric, zero and negative', () => {
      expect(reasonOf(row('03', 'A1', 'Item', 'abc', 'UD'))).toEqual(['INVALID_PRICE']);
      expect(reasonOf(row('03', 'A1', 'Item', '0,00', 'UD'))).toEqual(['INVALID_PRICE']);
      expect(reasonOf(row('03', 'A1', 'Item', '-1,00', 'UD'))).toEqual(['INVALID_PRICE']);
      expect(reasonOf(row('03', 'A1', 'Item', '', 'UD'))).toEqual(['INVALID_PRICE']);
    });

    it('UNKNOWN_UNIT', () => {
      expect(reasonOf(row('03', 'A1', 'Item', '1,00', 'KG'))).toEqual(['UNKNOWN_UNIT']);
    });

    it('M2_WITHOUT_DIMENSIONS', () => {
      expect(reasonOf(row('03', 'A1', 'Item', '1,00', 'M2', '0,00', '1,22'))).toEqual(['M2_WITHOUT_DIMENSIONS']);
      expect(reasonOf(row('03', 'A1', 'Item', '1,00', 'M2', '2,44', '0,00'))).toEqual(['M2_WITHOUT_DIMENSIONS']);
    });

    it('ML_WITHOUT_LENGTH', () => {
      expect(reasonOf(row('03', 'A1', 'Item', '1,00', 'ML', '0,00', '1,00'))).toEqual(['ML_WITHOUT_LENGTH']);
    });

    it('DUPLICATE_SKU keeps the first occurrence and reports the line', () => {
      const result = parseCatalogCsv(csv(row('03', 'A1', 'First', '1,00', 'UD'), row('03', 'A1', 'Second', '2,00', 'UD')));
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('First');
      expect(result.skipped).toMatchObject([{ line: 5, reason: 'DUPLICATE_SKU' }]);
    });

    it('stores the raw line in skipped rows', () => {
      const line = row('03', 'A1', 'Item', '1,00', 'KG');
      expect(parseCatalogCsv(csv(line)).skipped[0].raw).toBe(line);
    });
  });

  describe('warnings', () => {
    it('DUPLICATE_DESCRIPTION warns on every involved row, case-insensitively after cleaning', () => {
      const result = parseCatalogCsv(csv(
        row('03', 'A1', 'Same thing', '1,00', 'UD'),
        row('03', 'A2', '% same THING', '1,00', 'UD'),
        row('03', 'A3', 'Different', '1,00', 'UD')
      ));
      const dups = result.warnings.filter((w) => w.code === 'DUPLICATE_DESCRIPTION');
      expect(dups.map((w) => w.sku).sort()).toEqual(['A1', 'A2']);
      expect(result.items).toHaveLength(3);
    });

    it('DIMENSIONS_MISMATCH warns when description dimensions disagree', () => {
      const result = parseCatalogCsv(csv(row('01', 'D1', 'Board 244x122 10mm', '1,00', 'M2', '2,44', '1,50')));
      expect(result.warnings.map((w) => w.code)).toEqual(['DIMENSIONS_MISMATCH']);
      expect(result.warnings[0]).toMatchObject({ sku: 'D1', line: 4 });
    });

    it('does not warn when dimensions match within 1 cm', () => {
      const result = parseCatalogCsv(csv(row('01', 'D1', 'Board 244x122', '1,00', 'M2', '2,44', '1,22')));
      expect(result.warnings).toEqual([]);
    });

    it('interprets values >= 1000 as millimetres (3000x1200 does not warn)', () => {
      const result = parseCatalogCsv(csv(row('01', 'D1', 'Board 3000x1200', '1,00', 'M2', '3,00', '1,20')));
      expect(result.warnings).toEqual([]);
    });

    it('does not warn without dimensions in the description or for non-M2 units', () => {
      const result = parseCatalogCsv(csv(
        row('01', 'D1', 'Board plain', '1,00', 'M2', '2,44', '1,22'),
        row('01', 'D2', 'Unit 100x200', '1,00', 'UD', '1,00', '1,00')
      ));
      expect(result.warnings).toEqual([]);
    });
  });

  describe('summary', () => {
    it('counts rows, imported items, units and families', () => {
      const result = parseCatalogCsv(csv(
        row('03', 'A1', 'One', '1,00', 'UD'),
        row('03', 'A2', 'Two', '1,00', 'UD'),
        row('091', 'B1', 'Board', '1,00', 'M2', '2,44', '1,22'),
        row('091', 'B2', 'Bar', '1,00', 'ML', '3,00', '0,00'),
        row('091', 'B3', 'Bad', 'x', 'UD'),
        ';;;;;;;;'
      ));
      expect(result.summary).toEqual({
        totalRows: 5,
        imported: 4,
        byUnit: { UD: 2, M2: 1, ML: 1 },
        byFamily: { '03': 2, '091': 2 }
      });
    });
  });
});

const REAL_CSV = path.resolve(__dirname, '../../../../data/source/TARIFA_AGLOVAL_JULIO2026.csv');
const maybeDescribe = fs.existsSync(REAL_CSV) ? describe : describe.skip;

maybeDescribe('parseCatalogCsv against the real tariff file (counts only)', () => {
  it('parses every row with the expected totals', () => {
    const result = parseCatalogCsv(fs.readFileSync(REAL_CSV, 'utf8'));
    const nonEmptySkips = result.skipped.filter((s) => s.reason !== 'EMPTY_ROW');
    expect(result.summary.totalRows).toBe(2690);
    expect(result.summary.imported).toBe(2690);
    expect(nonEmptySkips).toHaveLength(0);
    expect(result.summary.byUnit).toEqual({ UD: 2001, M2: 607, ML: 82 });
    expect(Object.keys(result.summary.byFamily)).toHaveLength(62);
  });
});
