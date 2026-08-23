# Sprint scraping avanzado — 6 h desatendido

Plan de ejecución autónoma para mejorar fiabilidad de precios y calidad de respuestas (RAG/chat).

**Rama:** `cursor/scraping-advanced-67ef` (desde `cursor/p0-ux-confianza-67ef` o `main` si ya mergeado)  
**Objetivo:** más comparables útiles, fichas individuales scrapeables, RAG enriquecido, tests con fixtures, cliente resiliente.  
**No incluido en 6 h:** Playwright, proxies, segundo portal completo, Redis cache persistente, embeddings.

---

## Métricas de éxito (benchmark final)

Ejecutar `pnpm scraping:benchmark` (crear en este sprint) con 5 vehículos de referencia:

| Caso | Marca/Modelo | Año | Combustible |
|------|--------------|-----|-------------|
| A | BMW X1 | 2019 | diesel |
| B | Volkswagen Golf | 2018 | petrol |
| C | SEAT León | 2020 | petrol |
| D | Toyota Corolla | 2021 | hybrid |
| E | Mercedes-Benz Clase A | 2017 | diesel |

**Targets mínimos (vs baseline en `benchmarks/scraping-baseline.json`):**

- `coreCount` ≥ +30 % media en casos A–E (o coreCount ≥ 8 en ≥4 casos)
- `matchStrictness === "strict"` en ≥3 casos
- `avgSimilarity` ≥ 0.58 media
- `extractListing` con URL real: precio + km + CV en ≥4/5 URLs
- Tests: `pnpm test:scraping` verde (parse + map + slug)
- `pnpm build` y `pnpm lint` verde

---

## Hora 0 — Setup y baseline (30 min)

### T0.1 Rama y dependencias (10 min)

```bash
git fetch origin cursor/p0-ux-confianza-67ef main
git checkout -b cursor/scraping-advanced-67ef origin/cursor/p0-ux-confianza-67ef
# Si p0 ya en main: git checkout -b cursor/scraping-advanced-67ef origin/main
```

- Añadir `linkedom` (ligero, sin cheerio) para parse HTML de fichas si JSON falla.
- Añadir script `test:scraping` con `node --test` (sin vitest extra).

**Archivos:** `package.json`

### T0.2 Fixtures HTML (15 min)

Capturar o sintetizar fixtures (si live fetch falla por antibot, usar HTML guardado mínimo válido):

- `lib/sources/coches-net/__fixtures__/search-page-1.html` — ≥3 cards con `data-ad-id`
- `lib/sources/coches-net/__fixtures__/listing-detail.html` — ficha con JSON-LD o `__NEXT_DATA__`
- `lib/sources/coches-net/__fixtures__/urls.json` — 5 URLs de anuncio reales

**Cómo obtener live (intentar primero):**

```bash
tsx scripts/capture-coches-fixtures.ts
```

Si 403/vacío: construir fixture mínimo copiando estructura DOM observada en `parse.ts` (cards + ld+json).

### T0.3 Baseline benchmark (5 min)

- Crear `scripts/scraping-benchmark.ts` + `benchmarks/scraping-baseline.json`
- Ejecutar y guardar snapshot **antes** de cambios.
- Commit: `chore(scraping): baseline benchmark y fixtures`

---

## Hora 1 — Cliente resiliente + URL con filtros (55 min)

### T1.1 Cliente fetch robusto (25 min)

**Archivo:** `lib/sources/coches-net/client.ts`

- Reintentos: 3 intentos, backoff 2s / 4s / 8s
- Rotación ligera de `User-Agent` (2–3 UAs Chrome recientes)
- Timeout 15s por request
- Distinguir: `403` antibot, `empty_page`, `network`
- Cache: mantener `revalidate: 1800`; opcional env `COCHES_NET_CACHE_SECONDS`

**Archivo:** `lib/sources/coches-net/errors.ts` — tipos de error exportados

**Test:** mock fetch → reintento en 503

### T1.2 Filtros nativos en URL de búsqueda (30 min)

**Archivos:** `lib/sources/coches-net/slug.ts`, `lib/sources/coches-net/filters.ts` (nuevo)

Extender `buildSearchUrl(brand, model, page, filters?)`:

| Filtro query | Fuente | Mapeo |
|--------------|--------|-------|
| Año min/max | `year ± 1` | Investigar params reales (`fi=`, `YearFrom`, etc.) vía URL copiada del navegador o HTML de filtros |
| Combustible | `fuel` | gasolina/diesel/electrico/hibrido… |
| Provincia | `location` | slug provincia si disponible |

**Proceso obligatorio:**

1. `tsx scripts/discover-coches-url-params.ts` — fetch página marca/modelo, extraer links de filtros del HTML
2. Documentar params encontrados en comentario en `filters.ts`
3. Pasar `ComparableQuery` completo a `fetchSearchPages` / `buildSearchUrl`

**Test:** `buildSearchUrl("BMW","X1",1,{year:2019,fuel:"diesel"})` contiene params esperados

**Commit:** `feat(scraping): cliente resiliente y filtros URL coches.net`

---

## Hora 2 — Extracción estructurada + parse ficha (60 min)

### T2.1 JSON embebido (20 min)

**Archivo:** `lib/sources/coches-net/structured.ts` (nuevo)

```typescript
extractJsonLd(html): object[]
extractNextData(html): unknown | null
pickListingFromStructured(data, adId?): ParsedDetailFields
```

Prioridad: `application/ld+json` tipo `Car` / `Product` → `__NEXT_DATA__` → fallback DOM.

### T2.2 Parse ficha individual (35 min)

**Archivo:** `lib/sources/coches-net/parse-listing.ts` (nuevo)

`parseListingHtml(html, url): ParsedCochesNetDetail` con:

- `description` (texto completo)
- `equipment` (lista o keywords detectadas)
- `mileage`, `year`, `power`, `fuel`, `transmission`
- `sellerType`, `location`
- `publicationDate` / `daysOnMarket` si aparece ("Publicado hace X días")
- `images` (urls, max 5)

**Test:** fixture `listing-detail.html` → campos no vacíos

### T2.3 Fetch directo de ficha (15 min)

**Archivo:** `lib/sources/coches-net/provider.ts`

```typescript
async function fetchListingDetail(url: string): Promise<ParsedCochesNetDetail | null>
```

- `fetchCochesNetHtml(url)` → `parseListingHtml`
- Usar en `extractListing`: **primero ficha directa**, luego fallback búsqueda por ID

**Commit:** `feat(scraping): parse ficha coches.net vía JSON-LD y HTML`

---

## Hora 3 — Pool de comparables + provider (60 min)

### T3.1 Fetch secuencial con throttle (20 min)

**Archivo:** `lib/sources/coches-net/provider.ts`

- Reemplazar `Promise.all` de páginas por **concurrencia 2** + delay 300ms entre batches
- Con filtros URL: reducir páginas iniciales a 2; ampliar a 4–6 solo si `coreCount < 8`
- Log en `notes`: `pagesFetched`, `adsRaw`, `filteredUrl` usada

### T3.2 Enriquecer listings desde cards (15 min)

**Archivo:** `lib/sources/coches-net/map.ts`

- Pasar `publicationDate` / `bodyType` si parseados en cards
- Guardar `descriptionSnippet` (primeros 200 chars del título+attrs) en `rawData`

### T3.3 Opcional: detail scrape para top comparables (25 min)

Si tiempo y red permiten:

- Para top 3 comparables por `similarity`, fetch ficha (cache 30 min)
- Merge `equipment` + `description` en `VehicleListing`
- Límite: 3 fetches extra por análisis (evitar rate limit)

**Commit:** `feat(scraping): pool ampliado con throttle y fichas top comparables`

---

## Hora 4 — RAG y chat (55 min)

### T4.1 Documentos RAG enriquecidos (30 min)

**Archivo:** `lib/rag/documents.ts`

Nuevas funciones:

- `listingToDocument` — incluir `equipment`, `description` (truncado), `similarity`, `daysOnMarket`
- `listingDetailDocument(vehicle, detail)` — ficha del anuncio del usuario
- `marketStatsDocument(valuation, comparables)` — P25/P75, N, strictness, avgSimilarity, outliers

Fragmentar descripciones largas en chunks ~400 chars con ids `listing_{id}_chunk_{n}`.

### T4.2 Pipeline questions (15 min)

**Archivo:** `app/api/vehicle/questions/route.ts`

```typescript
const documents = [
  vehicleSummaryDocument(analysis.vehicle),
  marketStatsDocument(analysis.valuation, analysis.comparables),
  ...analysis.comparables.slice(0, 15).map(listingToDocument),
  // si listingDetail scrapeado en analyze:
  ...listingDetailChunks,
  ...knownIssues...
];
```

Aumentar `limit` retrieval a 12 para preguntas de equipamiento/precio.

### T4.3 Intent routing ligero (10 min)

**Archivo:** `lib/rag/query/expand.ts`

Boost keywords para intents:

- `price` → priorizar `marketStatsDocument`, comparables
- `equipment` / `equipamiento` → priorizar listing detail chunks
- `negotiation` / `negociar` → daysOnMarket, precio anunciado vs estimado

**Commit:** `feat(rag): documentos de mercado y fichas para chat`

---

## Hora 5 — Tests, analyze pipeline, UI mínima (50 min)

### T5.1 Suite de tests (25 min)

**Archivo:** `lib/sources/coches-net/__tests__/parse.test.ts`, `map.test.ts`, `slug.test.ts`

- `parseSearchHtml` → count, precios, transmisión inferida
- `mapAndFilterCochesNetAds` → strictness con query BMW X1 2019
- `parseListingUrl` → 5 URLs en fixtures
- `parseListingHtml` → description + equipment

```bash
node --test lib/sources/coches-net/__tests__/*.test.ts
```

### T5.2 Integrar en analyze (15 min)

**Archivos:** `lib/vehicles/analyze.ts`, `lib/sources/registry.ts`

- Si `vehicle.listingUrl`: `fetchListingDetail` → rellenar `equipment`, pasar a `valueVehicle` completeness
- Pasar `searchNotes` + `listingDetailNotes` a response
- `valueVehicle`: bonus confianza pequeño (+3) si `equipment` scrapeado

### T5.3 UI copy (10 min, solo si hay tiempo)

**Archivos:** `components/sources/sources-panel.tsx`, `lib/help/guide.ts`

- Nota cuando ficha individual fue scrapeada
- Help: "pegamos URL → leemos ficha completa"

**Commit:** `test(scraping): fixtures y tests parse/map; integrate listing detail`

---

## Hora 6 — Benchmark, hardening, PR (40 min)

### T6.1 Benchmark post-cambios (15 min)

```bash
pnpm scraping:benchmark --save benchmarks/scraping-after.json
pnpm scraping:benchmark --compare benchmarks/scraping-baseline.json benchmarks/scraping-after.json
```

Si regresión en algún caso: revertir cambio concreto (filtros URL o throttle), documentar en PR.

### T6.2 Smoke live (10 min)

```bash
pnpm smoke:store
tsx scripts/smoke-scraping-live.ts  # crear: 1 search + 1 extract URL
```

### T6.3 Calidad repo (10 min)

```bash
pnpm lint
pnpm build
```

### T6.4 PR (15 min)

- Push `cursor/scraping-advanced-67ef`
- PR draft → `main` (o `p0` si no mergeado)
- Body: tabla benchmark antes/después, límites conocidos, screenshots opcionales

**Commit final:** `chore: benchmark results scraping sprint`

---

## Paralelización (si hay subagentes)

| Paralelo A | Paralelo B |
|------------|------------|
| H1 cliente + filtros URL | H2 structured + parse-listing |
| H4 RAG documents | H5 tests con fixtures |
| H3 provider throttle | H4 questions route |

**Secuencia crítica:** fixtures (H0) → parse-listing (H2) → provider extract (H2.3) → RAG (H4) → benchmark (H6)

---

## Contingencias

| Problema | Acción |
|----------|--------|
| coches.net 403 en VM | Tests solo con fixtures; benchmark en CI con retry; documentar en PR |
| Params URL no descubibles | Mantener búsqueda marca+modelo; mejorar solo ficha individual + client retry |
| JSON-LD vacío en ficha | Fallback linkedom selectores: descripción, lista equipamiento |
| Timeout en build | Reducir imports dinámicos; no añadir playwright |
| p0 no mergeado | Base branch `cursor/p0-ux-confianza-67ef`; PR apilado o merge p0 primero |

---

## Archivos nuevos esperados

```
lib/sources/coches-net/
  __fixtures__/search-page-1.html
  __fixtures__/listing-detail.html
  __fixtures__/urls.json
  __tests__/parse.test.ts
  __tests__/map.test.ts
  __tests__/slug.test.ts
  errors.ts
  filters.ts
  structured.ts
  parse-listing.ts
scripts/
  capture-coches-fixtures.ts
  discover-coches-url-params.ts
  scraping-benchmark.ts
  smoke-scraping-live.ts
benchmarks/
  scraping-baseline.json
  scraping-after.json (generado)
```

---

## Scripts package.json a añadir

```json
{
  "scraping:benchmark": "tsx scripts/scraping-benchmark.ts",
  "test:scraping": "node --test lib/sources/coches-net/__tests__/*.test.ts",
  "scraping:fixtures": "tsx scripts/capture-coches-fixtures.ts"
}
```

---

## Checklist final desatendido

- [ ] Rama `cursor/scraping-advanced-67ef` pusheada
- [ ] `pnpm test:scraping` verde
- [ ] `pnpm build` verde
- [ ] Benchmark comparado y mejorado o documentado
- [ ] PR creado con métricas
- [ ] Sin credenciales ni HTML gigante en git (fixtures < 500KB cada uno)
