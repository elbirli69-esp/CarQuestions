# CarQuestions MVP Report

Fecha: 2026-08-23  
Rama: `cursor/mvp-reliability-85a3`

## 1. Estado inicial

CarQuestions ya tenía un flujo funcional (formulario → scrape/búsqueda coches.net → valoración → RAG → preguntas → chat), pero **sobreestimaba la fiabilidad de los datos**:

- Aceptaba combinaciones imposibles (p. ej. Ebro S800 + sDrive18d).
- El RAG usaba chunks universales (`brands: ["*"]`) como si fueran problemas del modelo.
- `isDemo: true` se convertía en `isDemo: false` al publicar fiabilidad.
- Sin mercado real se inventaba un precio con anclas hardcoded (`origin: "ai_estimate"`).
- Un solo anuncio bastaba para un veredicto barato/caro.
- Preguntas genéricas / irrelevantes (HV, heat pump en térmicos).
- Matching de modelo usaba `version.includes(key)` → riesgo de contaminación.
- Tests casi solo de scraping; sin batería de coherencia / alucinación.

## 2. Problemas encontrados

| Área | Problema |
|------|----------|
| Identidad | Sin validación marca↔modelo↔versión↔combustible↔potencia↔año |
| RAG | Chunks universales → “problemas conocidos del modelo” |
| RAG | Demo corpus presentado como curado |
| Mercado | Precio inventado sin comparables |
| Mercado | Veredicto con 1 anuncio |
| Mercado | Ads mapeados a brand/model del query sin verificar título |
| Preguntas | Heat pump / batería HV en gasolina/diésel |
| Precio | Regex `si` marcaba “sin accidentes” como accidente |
| SSRF | `listingUrl` aceptaba cualquier URL |
| UX | No había veredicto de compra ni “qué falta” priorizado |
| Score | Dimensiones inventadas (mantenimiento derivado, fiabilidad por defecto 68/75) |

## 3. Cambios realizados

### P0 — Crítico
- **`VehicleConsistencyValidator`** (`lib/vehicles/consistency.ts`): detecta trims ajenos (sDrive/xDrive/TDI/dCi…), mismatches de marca/modelo, fuel↔trim, Tesla+diésel, Ferrari+diésel, Prius+V8, años imposibles.
- Bloqueo de **conocimiento de modelo + mercado** si la identidad es inválida.
- **RAG estricto**: matching exacto de modelo; version ya no desbloquea chunks; universales ≠ known issues; se preserva `isDemo`.
- **Mercado honesto**: ≥3 anuncios para estimar; ≥5 para veredicto; si no → `estimatedPrice: null` + referencia de segmento etiquetada.
- **Preguntas**: 5–8 priorizadas; filtro por combustible; sin tech de modelo si identidad rota.
- **URL policy** https + coches.net only.
- **Anti-alucinación** en prompts del analista.

### P1
- Sistema de confianza con bandas (`alta/media/baja/muy_baja`) y techos por tamaño de muestra.
- Scorecard que no inventa dimensiones sin datos.
- Calidad del anuncio 0–100 + campos faltantes.
- Checklist de inspección por fases y combustible.
- Preguntas dinámicas con priority/category.
- Missing-data con impacto priorizado.
- Veredicto de compra (“¿Es una buena compra?”).

### P2
- Observabilidad JSON (`lib/observability/analysis-log.ts`).
- UX reordenada: coherencia → veredicto → precio → gaps → fuentes → score → anuncio → preguntas → checklist.
- Mobile-first conservado (stack vertical `max-w-3xl`).

## 4. Arquitectura modificada

```
analyzeVehicle
  ├─ validateVehicleConsistency  → blockModelKnowledge / blockMarketSearch
  ├─ URL policy + listing scrape
  ├─ searchAllComparables (omitido si identidad rota)
  ├─ lookupKnowledge (omitido si identidad rota)
  │    └─ filters + to-reliability (solo nivel A/B model-specific)
  ├─ valueVehicle (honest market thresholds)
  ├─ analyzeListing (qualityScore)
  ├─ scoreVehicle / sellerQuestions / checklist / missingData
  └─ buildPurchaseVerdict
```

Nuevos módulos clave:
- `lib/vehicles/consistency.ts`
- `lib/vehicles/evidence.ts`
- `lib/vehicles/missing-data.ts`
- `lib/vehicles/purchase-verdict.ts`
- `lib/vehicles/inspection-checklist.ts`
- `lib/vehicles/url-policy.ts`
- `lib/observability/analysis-log.ts`

## 5. Tests creados

`lib/vehicles/__tests__/mvp-reliability.test.ts` — 23 casos:

1. BMW X1 sDrive18d válido  
2. Ebro S800 eléctrico coherente  
3. Ebro S800 + sDrive18d **INVALID**  
4. EV → preguntas batería  
5. Gasolina → NO HV  
6. Diésel → NO heat pump  
7. 0 anuncios → sin mercado  
8. 1 anuncio → confianza muy baja  
9. Muchos comparables → distribución real  
10. Datos incompletos → campos de mayor impacto  
+ alucinaciones (BMW+Tesla, Ferrari+dCi, Tesla+diésel, Prius+V8)  
+ RAG isolation / isDemo / SSRF / checklist  

Scripts: `npm run test:mvp`, `npm test`.

## 6. Tests ejecutados

| Suite | Resultado |
|-------|-----------|
| `npm run test:mvp` | **23/23 pass** |
| `npm test` (scraping + mvp) | **29/29 pass** |
| `npm run build` | **OK** |
| Smoke API live | Ebro inválido bloquea RAG; BMW X1 obtiene mercado + issues nivel A |

## 7. Bugs corregidos

- Contaminación RAG vía `version.includes(modelKey)`.
- Demo knowledge presentado como curado.
- Precio inventado sin mercado.
- Veredicto con muestra insuficiente.
- “Sin accidentes” penalizado como accidente.
- Preguntas EV en motores térmicos.
- SSRF potencial en `listingUrl`.
- `LayoutProps` TypeScript roto en `app/layout.tsx`.
- Ads coches.net sin verificación básica de título.

## 8. Limitaciones actuales

- Catálogo solo prueba marca/modelo URL, no motorizaciones oficiales completas.
- Corpus RAG sigue mayoritariamente `isDemo: true` (ahora se declara).
- Verificación de título de anuncios es heurística (normalize/includes), no parser estructural perfecto.
- Sin calibración empírica del % de confianza vs error real.
- Fuentes oficiales (DGT, fabricante) siguen stubs “no conectadas”.
- Scraping coches.net sujeto a antibot.
- No hay auth / rate limit en APIs públicas.

## 9. Pendiente para la siguiente iteración

1. Tabla canónica de motorizaciones (engine_code, potencia, años) por modelo.
2. Revisión humana del corpus RAG y quitar `isDemo` donde proceda.
3. Parser de marca/modelo desde URL/slug de coches.net (no solo título).
4. Calibrar confianza con holdout de precios históricos.
5. Informe de bastidor / cargas (cuando haya proveedor real).
6. Fotos / calidad visual del anuncio.
7. Tests e2e Playwright en viewport móvil.
8. Citar document IDs en respuestas del chat de forma estructurada (JSON).

## 10. Recomendaciones

- Priorizar **datos canónicos de motor** antes que más UI.
- Tratar todo chunk `isDemo` como no publicable en scores numéricos (ya parcialmente hecho).
- Medir precision@k del RAG con casos adversos (wrong-brand exclusion) en CI.
- No reactivar anclas de precio como “estimación” bajo ningún naming confuso.

---

## MVP SCORE (0–10)

| Dimensión | Nota | Comentario |
|-----------|------|------------|
| UX | 7.5 | Veredicto + gaps claros; aún denso en móvil |
| Datos | 8.0 | Coherencia fuerte; provenance básica |
| Mercado | 7.5 | Honesto; depende de scrape |
| Precio | 8.0 | Sin falsas medianas |
| RAG | 8.0 | Aislamiento A/B vs C; corpus demo |
| Fiabilidad | 7.0 | Ya no inventa; cobertura modelo irregular |
| Preguntas | 8.5 | Priorizadas y por combustible |
| Inspección | 8.0 | Checklist por fases |
| Transparencia | 8.5 | Demo, banda confianza, limitaciones |
| Mobile | 7.0 | Layout ok; falta QA visual dedicada |
| Performance | 7.0 | Menos trabajo si identidad inválida |

### Valoración global: **7.8 / 10**

De una demo que **fingía certeza** a un copiloto que **falla en abierto** cuando no sabe — condición necesaria para confiar en una compra de ~30.000 €.

### Prueba mental exigida

**Ebro S800 + sDrive18d + 220 CV + eléctrico + 29.000 €**  
→ `consistency: invalid`, conocimiento bloqueado, sin issues genéricos CKP/octovalve/SOH como “del modelo”, sin precio de mercado inventado, veredicto “Datos incoherentes”.

**BMW X1 sDrive18d**  
→ válido, mercado observado cuando hay anuncios, issues nivel A del modelo, preguntas FAP/EGR (no heat pump), confianza acorde a la muestra.
