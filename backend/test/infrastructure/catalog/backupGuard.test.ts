import { assertRecentBackup, FsLike } from '../../../src/infrastructure/catalog/backupGuard';

const NOW = new Date('2026-08-10T12:00:00Z');
const HOUR = 3600 * 1000;

const fakeFs = (entry?: { size: number; mtimeMs: number }): FsLike => ({
  statSync: () => {
    if (!entry) throw new Error('ENOENT');
    return entry;
  }
});

describe('assertRecentBackup', () => {
  it('throws when the file is missing', () => {
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fakeFs())).toThrow(/not found/i);
  });

  it('throws when the file is empty', () => {
    const fs = fakeFs({ size: 0, mtimeMs: NOW.getTime() });
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fs)).toThrow(/empty/i);
  });

  it('throws when the file is older than the maximum age', () => {
    const fs = fakeFs({ size: 10, mtimeMs: NOW.getTime() - 25 * HOUR });
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fs)).toThrow(/older than 24/i);
  });

  it('honours a custom maxAgeHours', () => {
    const fs = fakeFs({ size: 10, mtimeMs: NOW.getTime() - 3 * HOUR });
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW, maxAgeHours: 2 }, fs)).toThrow(/older than 2/i);
  });

  it('accepts a non-empty recent file', () => {
    const fs = fakeFs({ size: 10, mtimeMs: NOW.getTime() - 2 * HOUR });
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fs)).not.toThrow();
  });
});
