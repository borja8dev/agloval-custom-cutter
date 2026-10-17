import { resolveTestDatabaseUrl } from './resolveTestDatabaseUrl';

const TEST_URL = 'postgresql://u:p@localhost:5432/agloval_cutting_test';
const DEV_URL = 'postgresql://u:p@localhost:5432/agloval_cutting_dev';

describe('resolveTestDatabaseUrl', () => {
  it('prefers DATABASE_URL_TEST when it points at a *_test database', () => {
    const env = { DATABASE_URL: DEV_URL, DATABASE_URL_TEST: TEST_URL };

    expect(resolveTestDatabaseUrl(env)).toBe(TEST_URL);
  });

  it('falls back to DATABASE_URL when it already points at a *_test database (CI)', () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: TEST_URL })).toBe(TEST_URL);
  });

  it('refuses a DATABASE_URL that is not a test database', () => {
    expect(() => resolveTestDatabaseUrl({ DATABASE_URL: DEV_URL })).toThrow(/DATABASE_URL_TEST/);
  });

  it('refuses a DATABASE_URL_TEST that is not a test database', () => {
    const env = { DATABASE_URL_TEST: DEV_URL };

    expect(() => resolveTestDatabaseUrl(env)).toThrow(/_test/);
  });

  it('ignores query parameters when checking the database name', () => {
    const url = `${TEST_URL}?schema=public`;

    expect(resolveTestDatabaseUrl({ DATABASE_URL_TEST: url })).toBe(url);
  });

  it('throws a clear error when nothing is configured', () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow(/DATABASE_URL_TEST/);
  });

  it('throws when the URL cannot be parsed', () => {
    expect(() => resolveTestDatabaseUrl({ DATABASE_URL_TEST: 'not a url' })).toThrow(/valid/);
  });
});
