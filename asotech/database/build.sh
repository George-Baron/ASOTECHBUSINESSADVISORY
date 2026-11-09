#!/usr/bin/env bash
# Assemble ordered migrations for the Supabase CLI (supabase/migrations) and a combined seed.sql.
set -euo pipefail
cd "$(dirname "$0")"
(cd .. && python3 scripts/build-services.py >/dev/null)
mkdir -p migrations
cp schema.sql                       migrations/0001_schema.sql
cp triggers/triggers.sql            migrations/0002_triggers.sql
cp functions/rpc.sql                migrations/0003_functions.sql
cp policies/row-level-security.sql  migrations/0004_row_level_security.sql
cat seed-reference.sql seed-services.generated.sql > seed.sql
echo "Built migrations/0001..0004 and seed.sql"
