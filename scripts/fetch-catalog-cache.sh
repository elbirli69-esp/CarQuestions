#!/usr/bin/env bash
# Descarga HTML de marcas coches.net para generar catálogo (evita rate limit de fetch en Node).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/data/catalog-cache"
SLUGS_FILE="$ROOT/data/coches-net-brand-slugs.json"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

mkdir -p "$CACHE"
slugs=$(jq -r '.[]' "$SLUGS_FILE")

for slug in $slugs; do
  out="$CACHE/${slug}.html"
  if [[ -f "$out" ]] && [[ $(wc -c <"$out") -gt 50000 ]]; then
    continue
  fi
  echo "Fetching $slug…"
  curl -sL -A "$UA" -H "Accept-Language: es-ES" \
    "https://www.coches.net/${slug}/segunda-mano/" -o "$out" || true
  sleep 1.2
done

echo "Cache ready in $CACHE"
