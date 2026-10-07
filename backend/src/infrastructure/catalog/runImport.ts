import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { assertRecentBackup } from './backupGuard';
import { importCatalog, ImportResult } from './importCatalog';
import { loadFamilyNames } from './loadFamilyNames';
import { parseCatalogCsv } from './parseCatalogCsv';

export interface ImportDeps {
  now: () => Date;
  log: (line: string) => void;
  /** Only called in apply mode, after every argument and the backup were validated. */
  createPrisma: () => PrismaClient;
}

interface CliOptions {
  file: string;
  families: string;
  reportDir: string;
  apply: boolean;
  backupFile?: string;
}

const MAX_LINES_PER_GROUP = 10;

const USAGE =
  'Usage: catalog:import [--file <csv>] [--families <json>] [--report-dir <dir>] [--apply --backup-file <sql>]';

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    file: '../data/source/TARIFA_AGLOVAL_JULIO2026.csv',
    families: 'data/families.json',
    reportDir: '../data/reports',
    apply: false
  };
  const valueFlags: Record<string, 'file' | 'families' | 'reportDir' | 'backupFile'> = {
    '--file': 'file',
    '--families': 'families',
    '--report-dir': 'reportDir',
    '--backup-file': 'backupFile'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg in valueFlags) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      options[valueFlags[arg]] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.apply && !options.backupFile) {
    throw new Error('--apply requires --backup-file <path> pointing to a recent pg_dump (see scripts/backup-db.sh)');
  }
  return options;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

/** CLI logic; returns the process exit code. Dry-run never creates a database client. */
export async function runImport(argv: string[], deps: ImportDeps): Promise<number> {
  const { log } = deps;
  try {
    const options = parseArgs(argv);
    const mode = options.apply ? 'apply' : 'dry-run';

    if (options.apply) {
      assertRecentBackup({ path: options.backupFile as string, now: deps.now() }, fs);
    }

    const familyNames = loadFamilyNames(options.families);
    const parsed = parseCatalogCsv(fs.readFileSync(options.file, 'utf8'));
    const { summary, skipped, warnings } = parsed;

    const missingFamilies = Object.keys(summary.byFamily)
      .filter((code) => !familyNames[code])
      .sort();

    log(`Catalog import (${mode === 'apply' ? 'APPLY' : 'DRY-RUN'})`);
    log(`Rows: ${summary.totalRows}, importable: ${summary.imported}, skipped: ${skipped.length}`);
    log(`By unit: UD ${summary.byUnit.UD}, M2 ${summary.byUnit.M2}, ML ${summary.byUnit.ML}`);
    log(`Families: ${Object.keys(summary.byFamily).length}`);
    for (const [code, count] of Object.entries(summary.byFamily).sort(([a], [b]) => a.localeCompare(b))) {
      log(`  ${code} ${familyNames[code] ?? '(unnamed)'}: ${count}`);
    }

    if (skipped.length > 0) {
      log(`Skipped rows (${skipped.length}):`);
      skipped.slice(0, MAX_LINES_PER_GROUP).forEach((s) => log(`  line ${s.line}: ${s.reason}`));
      if (skipped.length > MAX_LINES_PER_GROUP) log(`  ... ${skipped.length - MAX_LINES_PER_GROUP} more (see report)`);
    }

    for (const [code, group] of groupBy(warnings, (w) => w.code)) {
      log(`Warnings ${code} (${group.length}):`);
      group.slice(0, MAX_LINES_PER_GROUP).forEach((w) => log(`  line ${w.line} ${w.sku}`));
      if (group.length > MAX_LINES_PER_GROUP) log(`  ... ${group.length - MAX_LINES_PER_GROUP} more (see report)`);
    }

    if (missingFamilies.length > 0) {
      log(`Family codes without a name in ${options.families}: ${missingFamilies.join(', ')}`);
    }

    let result: ImportResult | undefined;
    if (options.apply) {
      const prisma = deps.createPrisma();
      try {
        result = await importCatalog(prisma, parsed.items, familyNames);
      } finally {
        await prisma.$disconnect();
      }
      log(
        `Imported: ${result.categoriesUpserted} categories, ${result.productsCreated} products created, ` +
          `${result.productsUpdated} updated`
      );
      if (result.unnamedFamilies.length > 0) {
        log(`Categories created with fallback names: ${result.unnamedFamilies.join(', ')}`);
      }
    } else {
      log('Dry-run: no database changes were made. Use --apply --backup-file <path> to import.');
    }

    // The report intentionally carries sku/line/code only: no prices or descriptions.
    const report = {
      generatedAt: deps.now().toISOString(),
      mode,
      file: path.basename(options.file),
      summary,
      skipped: skipped.map((s) => ({ line: s.line, reason: s.reason })),
      warnings: warnings.map((w) => ({ line: w.line, sku: w.sku, code: w.code })),
      missingFamilies,
      import: result ?? null
    };
    fs.mkdirSync(options.reportDir, { recursive: true });
    const reportPath = path.join(
      options.reportDir,
      `import-${deps.now().toISOString().replace(/:/g, '-')}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Report written to ${reportPath}`);
    return 0;
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && /argument|Missing value|--apply/.test(error.message)) log(USAGE);
    return 1;
  }
}
