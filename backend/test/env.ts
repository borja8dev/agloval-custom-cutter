import 'dotenv/config';
import { resolveTestDatabaseUrl } from './helpers/resolveTestDatabaseUrl';

process.env.DATABASE_URL = resolveTestDatabaseUrl(process.env);
