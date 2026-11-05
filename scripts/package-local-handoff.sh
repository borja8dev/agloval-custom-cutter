#!/usr/bin/env bash
# Builds the zip handed to Agloval to try the app locally (guide: probar-en-local/LEEME.md):
# the committed HEAD (git archive, so no .env, node_modules or local files) plus the real tariff.
# The tariff holds proprietary prices: send the zip privately, never upload it or commit it.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"

tariff=data/source/TARIFA_AGLOVAL_JULIO2026.csv
[ -f "$tariff" ] || { echo "Missing $tariff: the zip must carry the tariff." >&2; exit 1; }

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Warning: uncommitted changes are NOT included (the zip is built from HEAD)." >&2
fi

name=agloval-gestor-pedidos
out_dir="$root/data/handoff"
out="$out_dir/$name-$(git describe --tags --always)-$(date +%Y%m%d).zip"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

git archive --format=tar --prefix="$name/" HEAD | tar -x -C "$tmp"
mkdir -p "$tmp/$name/data/source"
cp "$tariff" "$tmp/$name/data/source/"

mkdir -p "$out_dir"
rm -f "$out"
(cd "$tmp" && zip -qr -X "$out" "$name")
echo "$out"
