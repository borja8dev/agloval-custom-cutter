import fs from 'fs';
import path from 'path';
import { parseFamilyNames } from '../../../src/infrastructure/catalog/loadFamilyNames';
import { parseCatalogCsv } from '../../../src/infrastructure/catalog/parseCatalogCsv';

describe('parseFamilyNames', () => {
  it('returns the map for valid JSON', () => {
    expect(parseFamilyNames('{"01":"Alpha","02":"Beta"}')).toEqual({ '01': 'Alpha', '02': 'Beta' });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseFamilyNames('{oops')).toThrow(/valid JSON/i);
  });

  it('rejects non-object roots', () => {
    expect(() => parseFamilyNames('["a"]')).toThrow(/object/i);
  });

  it('rejects empty or non-string names', () => {
    expect(() => parseFamilyNames('{"01":"  "}')).toThrow(/"01"/);
    expect(() => parseFamilyNames('{"01":5}')).toThrow(/"01"/);
  });

  it('rejects duplicate names ignoring case', () => {
    expect(() => parseFamilyNames('{"01":"Alpha","02":"alpha"}')).toThrow(/duplicate/i);
  });
});

const FAMILIES = path.resolve(__dirname, '../../../data/families.json');
const REAL_CSV = path.resolve(__dirname, '../../../../data/source/TARIFA_AGLOVAL_JULIO2026.csv');

describe('data/families.json', () => {
  it('is valid with unique names', () => {
    const names = parseFamilyNames(fs.readFileSync(FAMILIES, 'utf8'));
    expect(Object.keys(names).length).toBeGreaterThan(0);
  });
});

(fs.existsSync(REAL_CSV) ? describe : describe.skip)('families.json against the real tariff (codes only)', () => {
  it('names every family code present in the CSV', () => {
    const names = parseFamilyNames(fs.readFileSync(FAMILIES, 'utf8'));
    const { summary } = parseCatalogCsv(fs.readFileSync(REAL_CSV, 'utf8'));
    const missing = Object.keys(summary.byFamily).filter((code) => !(code in names));
    expect(missing).toEqual([]);
  });
});
