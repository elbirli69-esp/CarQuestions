# CarQuestions MVP Report

**Fecha:** 24 de agosto de 2026  
**Rama:** `cursor/mvp-hardening-d112`  
**Objetivo:** Endurecer fiabilidad, coherencia de datos, RAG estricto, precio honesto, preguntas relevantes y UX mobile-first.

---

## 1. Resumen ejecutivo

CarQuestions ha pasado de un análisis permisivo (RAG genérico + precios heurísticos) a un **pipeline con validación de identidad previa**, **recuperación de conocimiento acotada por tren motriz**, **valoración de mercado sin inventar cifras** y **producto orientado a la decisión de compra** (veredicto, calidad del anuncio, datos faltantes, checklist, preguntas al vendedor).

El bug crítico reproducido — **Ebro S800 + sDrive18d + eléctrico** generando CKP, octovalve y bomba de calor — queda **bloqueado antes del RAG**.

---

## 2. Problema raíz (contaminación RAG)

| Causa | Efecto |
|-------|--------|
| 345/689 chunks con `brands: ["*"]` | Conocimiento genérico mezclado con cualquier marca |
| Matching de modelo por `includes` | Falsos positivos (`s8` ↔ `S800`) |
| Sin filtro por tren motriz | Eléctricos recibían EGR/CKP; diésel recibía SOH/octovalve |
| Sin validación de identidad | Análisis seguía con datos absurdos |
| Heurística de precio | Precio inventado sin comparables |

---

## 3. Arquitectura del nuevo pipeline

```
VehicleInput
    → validateVehicleConsistency()     [bloquea si incoherente]
    → searchAllComparables()           [coches.net]
    → valueOnMarket()                  [observed | insufficient | unavailable]
    → buildTechnicalKnowledge()        [RAG A/B/C + powertrain gating]
    → assessListingQuality()
    → detectMissingData()
    → buildBuyVerdict()
    → buildScorecard()
    → buildSellerQuestions()           [max 8, gated]
    → buildInspectionChecklist()
    → AnalyzeResponse
```

**Archivos clave**

- Identidad: `lib/vehicles/identity/`
- RAG: `lib/rag/knowledge/{scope,relevance,retrieve}.ts`
- Mercado: `lib/valuation/market-engine.ts`
- Análisis: `lib/vehicles/analyze.ts`
- UI: `components/analyze-app.tsx`, `components/identity/`, `components/valuation/*`

---

## 4. Validación de identidad (P0)

### Implementado

- Modelo canónico con **procedencia por campo** (`user`, `listing`, `catalog`, `derived`, `inferred`)
- `VehicleConsistencyValidator` con 10+ reglas: marca↔modelo, trim exclusivo (BMW sDrive, Tesla, dCi…), combustible vs powertrain, potencia vs segmento
- Flag `safeForTechnicalKnowledge`: si es `false`, el RAG y el chat no afirman averías

### Casos adversarios validados (tests)

| Caso | Resultado |
|------|-----------|
| BMW X1 sDrive18d diésel 2019 | `ok`, conocimiento B47/cadena |
| Ebro S800 1.5 TGDI gasolina | `ok` |
| Ebro S800 + sDrive18d + eléctrico | `invalid`, RAG `blocked` |
| Tesla diésel, BMW Model 3, Ferrari 1.5 dCi, Prius V8 | `invalid` o `suspicious` |

---

## 5. RAG estricto (P0)

### Niveles de evidencia

- **A:** Específico del modelo/motor
- **B:** Plataforma compartida (misma base)
- **C:** Contexto de segmento (no avería confirmada)
- **D:** Excluido o bloqueado

### Puertas duras

- Powertrain: ICE vs BEV vs HEV vs PHEV
- Matching de modelo por **tokens**, no substring
- Priorización A > B > C en `retrieveScopedKnowledge()`
- Separación en respuesta: `modelSpecific`, `platformShared`, `segmentContext`

### Resultado Ebro inválido

- `knowledge.status: blocked`
- `modelSpecific.length: 0`
- Sin CKP, P0118, octovalve en issues

---

## 6. Mercado honesto (P0)

### Reglas

- **0 comparables** → `status: unavailable`, `estimatedPrice: null`
- **1–2 comparables** → `status: insufficient`, sin veredicto fiable
- **≥3 comparables observados** → `status: observed`, percentiles P10/P90, confianza cualitativa
- Referencia de segmento **separada** y con disclaimer explícito (no sustituye mercado)

### UI

- `ValuationCard` muestra «Sin mercado» cuando no hay precio
- `BuyVerdictCard` prioriza `insufficient_data` sin semáforo engañoso

---

## 7. Producto y UX (P1)

| Feature | Estado |
|---------|--------|
| Buy verdict | ✅ `buildBuyVerdict()` + `BuyVerdictCard` |
| Scorecard | ✅ Evidencia y confianza por dimensión |
| Listing quality 0–100 | ✅ `ListingQualityCard` |
| Missing data ranking | ✅ `MissingDataCard` |
| Seller questions (max 8) | ✅ Prioridad, categoría, gating por powertrain |
| Inspection checklist (5 fases) | ✅ Adaptada al vehículo |
| Layout verdict-first | ✅ `analyze-app.tsx` mobile-first max-w-3xl |
| Identity alert | ✅ Bloqueante vs suspicious |
| Demo banner | ✅ Según identidad + dataMode |
| Chat anti-alucinación | ✅ `prompt.ts` + `mock-provider.ts` |

---

## 8. Tests y calidad

```bash
npm run test:adversarial   # 22 tests, 0 fallos
npx tsc --noEmit           # limpio
npm run build              # OK
```

**Suites:** VehicleConsistencyValidator (9), RAG anti-contamination (2), Hallucination battery (5), coches.net parsers (6).

---

## 9. Criterios de aceptación

### Ebro S800 + sDrive18d + eléctrico + 29.000 €

| Criterio | Cumple |
|----------|--------|
| Detecta inconsistencias antes del RAG | ✅ |
| No muestra CKP/octovalve/bomba de calor | ✅ |
| Sin precio de mercado inventado | ✅ |
| Veredicto honesto (`insufficient_data`) | ✅ |

### BMW X1 sDrive18d diésel válido

| Criterio | Cumple |
|----------|--------|
| Issues A específicos (B47, cadena, EGR) | ✅ |
| Preguntas relevantes (no batería HV) | ✅ |
| Precio solo con comparables reales | ✅ |

---

## 10. MVP Score (0–10)

| Dimensión | Score | Notas |
|-----------|-------|-------|
| Fiabilidad / anti-alucinación | **9/10** | Identidad + RAG gating; corpus aún tiene 50% wildcard |
| Coherencia de datos | **9/10** | Validador robusto; catálogo no cubre todos los trims |
| RAG / conocimiento técnico | **8/10** | A/B/C + scope; mejorable con más chunks nivel A por modelo |
| Precio honesto | **9/10** | Sin fake price; segment reference bien separada |
| Preguntas al vendedor | **8/10** | Gating correcto; falta personalización por issues A |
| UX mobile-first | **8/10** | Layout verdict-first; chat secundario |
| Observabilidad | **7/10** | `AnalysisTimer` por etapas; falta export estructurado |
| Tests adversarios | **9/10** | 22 tests; ampliar casos reales de anuncios |
| Chat / prompts | **8/10** | Reglas anti-alucinación; depende del provider real |
| Documentación / entregables | **9/10** | Este informe + código comentado en puntos críticos |

### **MVP global: 8.4 / 10**

---

## Próximos pasos recomendados (post-MVP)

1. Reducir chunks `brands: ["*"]` y enriquecer nivel A por modelo español frecuente
2. Cachear retrieval RAG dentro de `analyzeVehicle()` para chat
3. Deprecar por completo `lib/valuation/engine.ts` (heurística legacy)
4. Ampliar catálogo coches.net con trims verificados
5. E2E manual con anuncios reales en staging

---

## Comandos útiles

```bash
npm run dev
npm run test:adversarial
npm run build
```
