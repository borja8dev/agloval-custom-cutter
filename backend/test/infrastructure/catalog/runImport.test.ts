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
