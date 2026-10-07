import fs from 'fs';

export interface FsLike {
  statSync(path: string): { size: number; mtimeMs: number };
  /** Returns the last `bytes` bytes of the file (or the whole file if shorter) as text. */
  readTail(path: string, bytes: number): string;
}

export interface BackupGuardOptions {
  path: string;
  now: Date;
  maxAgeHours?: number;
}

/** pg_dump writes this comment as the last statement of a plain-format dump. */
const DUMP_COMPLETE_MARKER = 'PostgreSQL database dump complete';

/**
 * Newer pg_dump versions append a few short lines (such as \unrestrict) after
 * the marker, so it is searched for in the tail instead of the last line.
 */
const TAIL_BYTES = 4096;

export const nodeBackupFs: FsLike = {
  statSync: (path) => fs.statSync(path),
  readTail: (path, bytes) => {
    const fd = fs.openSync(path, 'r');
    try {
      const { size } = fs.fstatSync(fd);
      const length = Math.min(bytes, size);
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, size - length);
      return buffer.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  }
};

/**
 * Throws unless the backup file exists, is non-empty, was modified recently
 * and ends with pg_dump's completion marker, so a dump killed mid-write
 * (OOM, full disk, container exit) is never accepted as a rollback point.
 */
export function assertRecentBackup(
  { path, now, maxAgeHours = 24 }: BackupGuardOptions,
  files: FsLike
): void {
  let stat: { size: number; mtimeMs: number };
  try {
    stat = files.statSync(path);
  } catch {
    throw new Error(`Backup file not found: ${path}`);
  }
  if (stat.size <= 0) {
    throw new Error(`Backup file is empty: ${path}`);
  }
  const ageHours = (now.getTime() - stat.mtimeMs) / 3_600_000;
  if (ageHours > maxAgeHours) {
    throw new Error(`Backup file is older than ${maxAgeHours} hours: ${path}`);
  }
  if (!files.readTail(path, TAIL_BYTES).includes(DUMP_COMPLETE_MARKER)) {
    throw new Error(
      `Backup file looks incomplete (truncated pg_dump, no completion marker found): ${path}`
    );
  }
}
