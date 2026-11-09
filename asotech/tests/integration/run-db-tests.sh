#!/usr/bin/env bash
# Applies the stub, migrations, seed and runs the SQL assertions on a throwaway database.
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres bash tests/integration/run-db-tests.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=asotech_test
bash database/build.sh
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
for f in tests/integration/supabase-stub.sql database/migrations/0001_schema.sql database/migrations/0002_triggers.sql database/migrations/0003_functions.sql database/migrations/0004_row_level_security.sql database/seed.sql; do
  psql -q -v ON_ERROR_STOP=1 -d $DB -f "$f"
done
OUT=$(psql -q -d $DB -f tests/integration/ledger-and-rls.test.sql 2>&1 || true)
echo "$OUT" | grep -E "FAIL|ERROR" || true
PASS=$(echo "$OUT" | grep -c "PASS:" || true)
echo "Passed assertions: $PASS"
if echo "$OUT" | grep -qE "FAIL|ERROR"; then echo "DATABASE TESTS FAILED"; exit 1; fi
echo "DATABASE TESTS OK"
