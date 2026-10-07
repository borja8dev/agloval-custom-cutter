import fs from 'fs';
import os from 'os';
import path from 'path';
import { runImport, ImportDeps } from '../../../src/infrastructure/catalog/runImport';

const HEADER = 'fam;art;des;pvp1;unimed;medida1;medida2;art2;';
const CSV = [
  'Tabla 1',
  HEADER,
  '01;S-1;Board alpha 244x122 16mm;12,50;M2;2,44;1,22;S-1;',
  '01;S-2;Piece beta;3,10;UD;0,00;0,00;S-2;',
  '02;S-3;Strip gamma;1,00;ML;2,40;0,00;S-3;',
  '02;S-4;Broken;abc;UD;0,00;0,00;S-4;'
].join('\n');

describe('runImport', () => {
  let dir: string;
  let lines: string[];
  let created: number;
  const deps = (): ImportDeps => ({
    now: () => new Date('2026-08-10T10:00:00Z'),
    log: (line) => lines.push(line),
    createPrisma: () => {
      created += 1;
      throw new Error('database must not be touched');
    }
  });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-'));
    fs.writeFileSync(path.join(dir, 'tariff.csv'), CSV);
    fs.writeFileSync(path.join(dir, 'families.json'), JSON.stringify({ '01': 'Alpha family' }));
    lines = [];
    created = 0;
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const args = (...extra: string[]) => [
    '--file', path.join(dir, 'tariff.csv'),
    '--families', path.join(dir, 'families.json'),
    '--report-dir', path.join(dir, 'reports'),
    ...extra
  ];

  it('dry-run writes a price-free report, prints a summary and never creates a DB client', async () => {
    const code = await runImport(args(), deps());
    expect(code).toBe(0);
    expect(created).toBe(0);

    const files = fs.readdirSync(path.join(dir, 'reports'));
    expect(files).toEqual(['import-2026-08-10T10-00-00.000Z.json']);
    const raw = fs.readFileSync(path.join(dir, 'reports', files[0]), 'utf8');
    const report = JSON.parse(raw);
    expect(report.mode).toBe('dry-run');
    expect(report.summary.byUnit).toEqual({ UD: 1, M2: 1, ML: 1 });
    expect(report.missingFamilies).toEqual(['02']);
    expect(report.skipped).toEqual([{ line: 6, reason: 'INVALID_PRICE' }]);
    expect(raw).not.toMatch(/12[.,]50|3[.,]10/);

    const out = lines.join('\n');
    expect(out).toMatch(/DRY-RUN/);
    expect(out).toMatch(/INVALID_PRICE/);
    expect(out).toMatch(/02/);
  });

  it('still writes a report with partial progress and the error name when an apply fails mid-way', async () => {
    const backup = path.join(dir, 'backup.sql');
    fs.writeFileSync(backup, 'CREATE TABLE t (id text);\n-- PostgreSQL database dump complete\n');
    let batch = 0;
    const fakePrisma = {
      category: {
        findMany: async () => [],
        upsert: async ({ where }: { where: { code: string } }) => ({ id: `cat-${where.code}` })
      },
      product: { findMany: async () => [], upsert: (args: unknown) => args },
      $transaction: async () => {
        batch += 1;
        if (batch === 2) {
          const error = new Error('connection dropped, secret=12,50');
          error.name = 'PrismaClientKnownRequestError';
          throw error;
        }
        return [];
      },
      $disconnect: async () => undefined
    };

    const code = await runImport(args('--apply', '--backup-file', backup), {
      ...deps(),
      batchSize: 1,
      createPrisma: () => fakePrisma as never
    });

    expect(code).toBe(1);
    const files = fs.readdirSync(path.join(dir, 'reports'));
    expect(files).toHaveLength(1);
    const raw = fs.readFileSync(path.join(dir, 'reports', files[0]), 'utf8');
    const report = JSON.parse(raw);
    expect(report.mode).toBe('apply');
    expect(report.status).toBe('failed');
    // The fixture CSV has two families (01 and 02) and three importable rows, one per batch.
    expect(report.import).toEqual({ categoriesUpserted: 2, productsCreated: 1, productsUpdated: 0 });
    expect(report.error).toEqual({ name: 'PrismaClientKnownRequestError' });
    expect(raw).not.toMatch(/12[.,]50|secret|connection dropped/);
    expect(lines.join('\n')).toMatch(/connection dropped/);
    expect(lines.join('\n')).toMatch(/Report written to/);
  });

  it('refuses --apply without --backup-file before touching the database', async () => {
    const code = await runImport(args('--apply'), deps());
    expect(code).toBe(1);
    expect(created).toBe(0);
    expect(lines.join('\n')).toMatch(/--backup-file/);
  });

  it('refuses --apply with a missing backup file', async () => {
    const code = await runImport(args('--apply', '--backup-file', path.join(dir, 'nope.sql')), deps());
    expect(code).toBe(1);
    expect(created).toBe(0);
  });

  it('exits 1 on unknown arguments', async () => {
    expect(await runImport(['--bogus'], deps())).toBe(1);
  });

  it('exits 1 when the CSV cannot be parsed', async () => {
    fs.writeFileSync(path.join(dir, 'tariff.csv'), 'no header here');
    expect(await runImport(args(), deps())).toBe(1);
  });
});
