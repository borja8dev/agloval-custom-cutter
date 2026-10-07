export interface FsLike {
  statSync(path: string): { size: number; mtimeMs: number };
}

export interface BackupGuardOptions {
  path: string;
  now: Date;
  maxAgeHours?: number;
}

/** Throws unless the backup file exists, is non-empty and was modified recently. */
export function assertRecentBackup(
  { path, now, maxAgeHours = 24 }: BackupGuardOptions,
  fs: FsLike
): void {
  let stat: { size: number; mtimeMs: number };
  try {
    stat = fs.statSync(path);
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
}
