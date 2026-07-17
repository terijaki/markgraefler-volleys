#!/usr/bin/env bash
# Temporarily restore pre-#40 ElectroDB seed + entities, run db-seed, then restore Toolbox tree.
# Usage: ./scripts/seed-electrodb-legacy.sh [-- db-seed args...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LEGACY_COMMIT="528f000^"
ELECTRODB_FILES=(
  lib/db/electrodb-client.ts
  lib/db/electrodb-entities.ts
  lib/db/sams-electrodb-entities.ts
  lib/db/type-guards.ts
)

restored=false

restore_tree() {
  if [[ "$restored" == true ]]; then
    return
  fi
  restored=true

  echo ""
  echo "♻️  Restoring Toolbox seed and removing temporary ElectroDB files..."
  git checkout HEAD -- scripts/db-seed.ts
  for file in "${ELECTRODB_FILES[@]}"; do
    rm -f "$file"
    git restore --staged "$file" 2>/dev/null || true
  done
  if grep -q '"electrodb"' package.json; then
    echo "📤 Removing temporary electrodb dependency..."
    bun remove electrodb --silent
  else
    bun install --silent
  fi
  echo "✅ Restored current branch state"
}

trap restore_tree EXIT

echo "📦 Checking out ElectroDB seed + entities from ${LEGACY_COMMIT}..."
git checkout "$LEGACY_COMMIT" -- scripts/db-seed.ts "${ELECTRODB_FILES[@]}"

if ! grep -q '"electrodb"' package.json; then
  echo "📥 Installing electrodb@^3.9.1 (temporary)..."
  bun add electrodb@^3.9.1
fi

seed_args=()
if [[ "${1:-}" == "--" ]]; then
  shift
fi
if [[ $# -gt 0 ]]; then
  seed_args=("$@")
fi

echo ""
echo "🌱 Running legacy ElectroDB seed..."
if [[ ${#seed_args[@]} -gt 0 ]]; then
  bun ./scripts/db-seed.ts "${seed_args[@]}"
else
  bun ./scripts/db-seed.ts
fi

echo ""
echo "✅ Legacy seed complete. Trap will restore Toolbox files on exit."
