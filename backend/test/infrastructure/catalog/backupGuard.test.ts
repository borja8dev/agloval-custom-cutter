import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  assertRecentBackup,
  FsLike,
  nodeBackupFs
} from '../../../src/infrastructure/catalog/backupGuard';

const NOW = new Date('2026-08-10T12:00:00Z');
const HOUR = 3600 * 1000;
const COMPLETE_TAIL = '\n--\n-- PostgreSQL database dump complete\n--\n';

const fakeFs = (entry?: { size: number; mtimeMs: number }, tail = COMPLETE_TAIL): FsLike => ({
  statSync: () => {
    if (!entry) throw new Error('ENOENT');
    return entry;
  },
  readTail: () => tail
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

  it('accepts a non-empty recent file that ends with the pg_dump completion marker', () => {
    const fs = fakeFs({ size: 10, mtimeMs: NOW.getTime() - 2 * HOUR });
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fs)).not.toThrow();
  });

  it('throws when the dump is truncated and lacks the completion marker', () => {
    const fs = fakeFs({ size: 10, mtimeMs: NOW.getTime() }, 'COPY products (id, name) FROM stdin;\nabc\tHalf a ro');
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fs)).toThrow(/incomplete|truncated/i);
  });

  it('accepts a dump where newer pg_dump versions append lines after the marker', () => {
    const tail = '\n-- PostgreSQL database dump complete\n--\n\n\\unrestrict AbCdEf\n';
    const fs = fakeFs({ size: 10, mtimeMs: NOW.getTime() }, tail);
    expect(() => assertRecentBackup({ path: 'b.sql', now: NOW }, fs)).not.toThrow();
  });
});

describe('nodeBackupFs', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-guard-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads only the tail of a large file', () => {
    const file = path.join(dir, 'big.sql');
    fs.writeFileSync(file, `${'x'.repeat(10_000)}${COMPLETE_TAIL}`);

    const tail = nodeBackupFs.readTail(file, 100);

    expect(tail.length).toBeLessThanOrEqual(100);
    expect(tail).toContain('PostgreSQL database dump complete');
  });

  it('reads a file shorter than the requested tail', () => {
    const file = path.join(dir, 'small.sql');
    fs.writeFileSync(file, 'short');

    expect(nodeBackupFs.readTail(file, 4096)).toBe('short');
  });

  it('works end to end with assertRecentBackup on a real truncated and a real complete dump', () => {
    const truncated = path.join(dir, 'truncated.sql');
    const complete = path.join(dir, 'complete.sql');
    fs.writeFileSync(truncated, 'CREATE TABLE products (id text);\nCOPY products FROM stdin;\nab');
    fs.writeFileSync(complete, `CREATE TABLE products (id text);${COMPLETE_TAIL}`);
    const now = new Date();

    expect(() => assertRecentBackup({ path: truncated, now }, nodeBackupFs)).toThrow(/incomplete|truncated/i);
    expect(() => assertRecentBackup({ path: complete, now }, nodeBackupFs)).not.toThrow();
  });
});
