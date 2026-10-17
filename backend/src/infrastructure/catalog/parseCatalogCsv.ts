import {
  CatalogItem,
  CatalogUnit,
  ParseResult,
  SkippedRow,
  Warning
} from './catalogTypes';

export * from './catalogTypes';

const HEADER_PREFIX = 'fam;art;des;pvp1;unimed';
const UNITS: ReadonlySet<string> = new Set(['UD', 'M2', 'ML']);
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const THICKNESS_PATTERN = /(?<!\d)(\d{1,3})\s*mm/i;
const DIMENSIONS_PATTERN = /(?<!\d)(\d{2,4})\s*x\s*(\d{2,4})(?!\d)/i;
const DIMENSION_TOLERANCE_CM = 1;

/** Parses a decimal-comma number; returns NaN when the text is not numeric. */
const parseDecimal = (text: string): number => {
  const normalized = text.replace(',', '.');
  return NUMBER_PATTERN.test(normalized) ? Number(normalized) : NaN;
};

const metresToCm = (metres: number): number => Math.round(metres * 100);

const cleanDescription = (raw: string): string =>
  raw.replace(/^[%.]\s*/, '').replace(/\s+/g, ' ').trim();

/** Description dimensions as [long, short] in cm; values >= 1000 are millimetres. */
const descriptionDimensionsCm = (description: string): [number, number] | undefined => {
  const match = DIMENSIONS_PATTERN.exec(description);
  if (!match) return undefined;
  const toCm = (value: number): number => (value >= 1000 ? value / 10 : value);
  const a = toCm(Number(match[1]));
  const b = toCm(Number(match[2]));
  return a >= b ? [a, b] : [b, a];
};

const findHeaderIndex = (lines: string[]): number =>
  lines.findIndex((line) => line.trim().toLowerCase().startsWith(HEADER_PREFIX));

export function parseCatalogCsv(content: string): ParseResult {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = text.split(/\r\n|\n|\r/);

  const headerIndex = findHeaderIndex(lines);
  if (headerIndex === -1) {
    throw new Error(
      `Catalog header not found: expected a line starting with "${HEADER_PREFIX}"`
    );
  }

  const items: CatalogItem[] = [];
  const skipped: SkippedRow[] = [];
  const warnings: Warning[] = [];
  const seenSkus = new Set<string>();
  const byUnit: Record<CatalogUnit, number> = { UD: 0, M2: 0, ML: 0 };
  const byFamily: Record<string, number> = {};
  const descriptionGroups = new Map<string, { line: number; sku: string }[]>();
  let totalRows = 0;

  for (let index = headerIndex + 1; index < lines.length; index++) {
    const rawLine = lines[index];
    const line = index + 1;
    const fields = rawLine.split(';').map((field) => field.trim());

    if (fields.every((field) => field === '')) {
      // A trailing newline yields one final empty string; it is not a row.
      if (rawLine.trim() !== '' || index < lines.length - 1) {
        skipped.push({ line, reason: 'EMPTY_ROW', raw: rawLine });
      }
      continue;
    }

    totalRows++;
    const [familyCode = '', sku = '', rawDescription = '', priceText = '', unit = '', m1Text = '', m2Text = ''] = fields;
    const skip = (reason: SkippedRow['reason']): void => {
      skipped.push({ line, reason, raw: rawLine });
    };

    if (!familyCode || !sku || !rawDescription) {
      skip('MISSING_FIELD');
      continue;
    }
    const price = parseDecimal(priceText);
    if (!(price > 0)) {
      skip('INVALID_PRICE');
      continue;
    }
    if (!UNITS.has(unit)) {
      skip('UNKNOWN_UNIT');
      continue;
    }
    if (seenSkus.has(sku)) {
      skip('DUPLICATE_SKU');
      continue;
    }

    const catalogUnit = unit as CatalogUnit;
    const measure1 = parseDecimal(m1Text);
    const measure2 = parseDecimal(m2Text);
    const name = cleanDescription(rawDescription);
    const item: CatalogItem = { sku, familyCode, name, rawDescription, unit: catalogUnit, price };

    if (catalogUnit === 'M2') {
      if (!(measure1 > 0) || !(measure2 > 0)) {
        skip('M2_WITHOUT_DIMENSIONS');
        continue;
      }
      item.widthCm = metresToCm(measure1);
      item.heightCm = metresToCm(measure2);
      const thickness = THICKNESS_PATTERN.exec(rawDescription);
      if (thickness) item.thicknessMm = Number(thickness[1]);
    } else if (catalogUnit === 'ML') {
      if (!(measure1 > 0)) {
        skip('ML_WITHOUT_LENGTH');
        continue;
      }
      item.lengthCm = metresToCm(measure1);
    }

    seenSkus.add(sku);
    items.push(item);
    byUnit[catalogUnit]++;
    byFamily[familyCode] = (byFamily[familyCode] ?? 0) + 1;

    const prefix = rawDescription[0];
    if (prefix === '%' || prefix === '.') {
      warnings.push({
        line,
        sku,
        code: prefix === '%' ? 'PERCENT_PREFIX' : 'DOT_PREFIX',
        message: `Description starts with "${prefix}"; prefix removed from the name`
      });
    }

    if (catalogUnit === 'M2') {
      const dims = descriptionDimensionsCm(rawDescription);
      if (dims) {
        const actual = [item.widthCm as number, item.heightCm as number].sort((x, y) => y - x);
        if (
          Math.abs(dims[0] - actual[0]) > DIMENSION_TOLERANCE_CM ||
          Math.abs(dims[1] - actual[1]) > DIMENSION_TOLERANCE_CM
        ) {
          warnings.push({
            line,
            sku,
            code: 'DIMENSIONS_MISMATCH',
            message: `Description dimensions ${dims[0]}x${dims[1]} cm differ from ${actual[0]}x${actual[1]} cm in medida1/medida2`
          });
        }
      }
    }

    const key = name.toLowerCase();
    const group = descriptionGroups.get(key);
    if (group) group.push({ line, sku });
    else descriptionGroups.set(key, [{ line, sku }]);
  }

  for (const group of descriptionGroups.values()) {
    if (group.length < 2) continue;
    for (const entry of group) {
      warnings.push({
        line: entry.line,
        sku: entry.sku,
        code: 'DUPLICATE_DESCRIPTION',
        message: `Same description shared by ${group.length} SKUs: ${group.map((g) => g.sku).join(', ')}`
      });
    }
  }
  warnings.sort((a, b) => a.line - b.line);

  return {
    items,
    skipped,
    warnings,
    summary: { totalRows, imported: items.length, byUnit, byFamily }
  };
}

