#!/usr/bin/env sh
# Creates the dedicated test database inside the docker-compose Postgres and
# applies the migrations to it. Safe to re-run.
set -eu

: "${DATABASE_URL_TEST:?Set DATABASE_URL_TEST, e.g. postgresql://agloval_user:agloval_password@localhost:5432/agloval_cutting_test}"

DB_NAME="agloval_cutting_test"
EXISTS="$(docker exec agloval_postgres psql -U agloval_user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"

if [ "$EXISTS" != "1" ]; then
  docker exec agloval_postgres createdb -U agloval_user "$DB_NAME"
fi

DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
