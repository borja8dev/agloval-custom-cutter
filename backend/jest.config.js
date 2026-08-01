export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // ProductRepository.test.ts and CalculationRepository.test.ts both reset
  // shared state (deleteMany) against the same real Postgres database in
  // beforeAll/afterEach — running test files in parallel workers (Jest's
  // default) races them against each other and causes intermittent FK
  // violations. Serializing is the standard fix for integration suites that
  // share one real external database rather than per-worker isolation.
  maxWorkers: 1,
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
}
