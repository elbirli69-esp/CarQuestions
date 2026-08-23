#!/usr/bin/env bash
# Re-descarga páginas de marca con HTML inválido (antibot / vacío).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/data/catalog-cache"
SLUGS_FILE="$ROOT/data/coches-net-brand-slugs.json"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
MIN_BYTES=120000

mkdir -p "$CACHE"
while IFS= read -r slug; do
  out="$CACHE/${slug}.html"
  size=0
  if [[ -f "$out" ]]; then size=$(wc -c <"$out"); fi
  if [[ "$size" -ge "$MIN_BYTES" ]]; then
    continue
  fi
  echo "Refetch $slug (was ${size} bytes)…"
  curl -sL -A "$UA" -H "Accept-Language: es-ES" \
    "https://www.coches.net/${slug}/segunda-mano/" -o "$out" || true
  sleep 2.5
done < <(jq -r '.[]' "$SLUGS_FILE")

echo "Done. Valid:" "$(find "$CACHE" -name '*.html' -size +${MIN_BYTES}c | wc -l)"
