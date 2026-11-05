#!/bin/sh
# Starts the backend of the local stack: migrate, load a catalog into an empty database, serve.
set -eu

TARIFF=/data/source/TARIFA_AGLOVAL_JULIO2026.csv

echo "[setup] Applying database migrations"
npx prisma migrate deploy

categories=$(psql "$DATABASE_URL" -tAc 'SELECT count(*) FROM categories')
if [ "$categories" = "0" ]; then
  if [ -f "$TARIFF" ]; then
    echo "[setup] Empty catalog: importing the Agloval tariff from $TARIFF"
    # The importer refuses to apply without a recent, complete pg_dump.
    backup=/tmp/before-catalog-import.sql
    pg_dump "$DATABASE_URL" > "$backup"
    npm run catalog:import -- --file "$TARIFF" --apply --backup-file "$backup" --report-dir /tmp/catalog-report
  else
    echo "[setup] Empty catalog and no tariff at $TARIFF: loading the demo products"
    # Not `npm run seed`: its `node --loader tsx/cjs` cannot load .ts files on Node 20.20.
    npx tsx prisma/seed.ts
  fi
else
  echo "[setup] Catalog already loaded ($categories families): keeping it"
fi

echo "[setup] Starting the server"
exec npm start
