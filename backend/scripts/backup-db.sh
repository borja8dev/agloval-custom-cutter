#!/usr/bin/env sh
# Creates a timestamped pg_dump of the database in DATABASE_URL under data/backups/
# and prints the file path. Run it before `npm run catalog:import -- --apply`.
set -eu

: "${DATABASE_URL:?Set DATABASE_URL, e.g. postgresql://agloval_user:agloval_password@localhost:5432/agloval_cutting_dev}"

BACKUP_DIR="${BACKUP_DIR:-../data/backups}"
DB_NAME="$(printf '%s' "$DATABASE_URL" | sed -e 's#^[^:]*://[^/]*/##' -e 's#[?].*$##')"
FILE="$BACKUP_DIR/${DB_NAME}-$(date +%Y%m%dT%H%M%S).sql"

mkdir -p "$BACKUP_DIR"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" --no-owner --file "$FILE"
else
  docker exec agloval_postgres pg_dump -U agloval_user --no-owner "$DB_NAME" > "$FILE"
fi

echo "$FILE"
