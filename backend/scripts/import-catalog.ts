import 'dotenv/config';
import { getPrismaClient } from '../src/infrastructure/config/database';
import { runImport } from '../src/infrastructure/catalog/runImport';

runImport(process.argv.slice(2), {
  now: () => new Date(),
  log: (line) => console.log(line),
  createPrisma: getPrismaClient
}).then((code) => process.exit(code));
