/**
 * Integration tests call deleteMany on products and categories, so they must
 * never run against a database that holds the real catalog. This resolves the
 * URL the suite may use and refuses anything that is not named *_test.
 */
export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const candidate = env.DATABASE_URL_TEST ?? env.DATABASE_URL;

  if (!candidate) {
    throw new Error('Set DATABASE_URL_TEST to a dedicated *_test database before running the tests.');
  }

  let databaseName: string;
  try {
    databaseName = new URL(candidate).pathname.replace(/^\//, '');
  } catch {
    throw new Error('DATABASE_URL_TEST is not a valid database URL.');
  }

  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${databaseName}": the database name must end with _test. ` +
        'Set DATABASE_URL_TEST to a dedicated test database.',
    );
  }

  return candidate;
}
