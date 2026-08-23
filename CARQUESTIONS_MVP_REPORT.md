# CarQuestions MVP Improvement Report

**Fecha:** 23 de agosto de 2026  
**Rama:** `cursor/mvp-quality-improvements-c80e`  
**Objetivo:** Convertir CarQuestions en un copiloto fiable para comprar coches de segunda mano, priorizando coherencia de datos, honestidad del mercado y ausencia de alucinaciones técnicas.

---

## 1. Estado inicial

La aplicación ya tenía una base funcional:

- Formulario de vehículo + extracción de anuncios coches.net
- Valoración de precio con comparables o referencia de segmento
- RAG con ~26 packs de conocimiento técnico
- Preguntas al vendedor, análisis de anuncio y chat
- Score multidimensional

**Problemas críticos detectados:**

| Problema | Impacto |
|----------|---------|
| Sin validación marca/modelo/versión/combustible | Combinaciones absurdas (Ebro S800 + sDrive18d eléctrico) pasaban sin aviso |
| RAG con chunks universales (`brands: ["*"]`) | Conocimiento de segmento EV (bomba de calor, brake-by-wire, SOH) presentado como del modelo |
| `chunkMatchesModel` permisivo + sin niveles de evidencia | Contaminación entre vehículos |
| Confianza del precio podía ser alta con pocos datos | Falsas certezas (ej. 16 % con cifra precisa) |
| Preguntas genéricas sin prioridad ni filtro por combustible | Preguntas irrelevantes (HV en gasolina, heat pump en diésel) |
| Sin veredicto de compra ni checklist estructurada | UX no respondía en 10 s a «¿es buena compra?» |

---

## 2. Problemas encontrados (detalle técnico)

### P0 — Coherencia vehículo
- `vehicleInputSchema` validaba tipos pero no coherencia semántica
- Versiones BMW (`sDrive18d`) no se detectaban fuera de BMW por regex demasiado estricta (`\bsdrive\b` no matcheaba `sdrive18d`)
- Tesla + diésel no se bloqueaba

### P0 — Contaminación RAG
- `retrieveKnowledgeForVehicle` devolvía chunks universales con boost positivo (`isUniversal ? 0.02`)
- `chunksToReliability` incluía cualquier chunk que pasara filtro de combustible
- Issues de nivel segmento se mostraban como «problemas conocidos del modelo»

### P0 — Alucinaciones / falsas certezas
- Score de fiabilidad se calculaba incluso con solo chunks universales
- Mantenimiento derivado de segmento sin disclaimer
- Confianza de precio con fórmula que podía dar valores engañosos con 1 comparable

---

## 3. Cambios realizados

### Validación de coherencia (`VehicleConsistencyValidator`)
- **Archivo:** `lib/vehicles/consistency-validator.ts`
- Valida: marca↔modelo (catálogo), versión↔marca (patrones OEM), versión↔combustible, marca↔combustible (Tesla=solo EV), potencia↔combustible, año↔combustible, combinaciones adversarias
- Devuelve `severity`, `canUseModelSpecificKnowledge`, lista de issues

### Niveles de evidencia RAG (A/B/C/D)
- **Archivo:** `lib/vehicles/evidence.ts`
- A = modelo exacto, B = motor/plataforma, C = segmento, D = no aplicable
- Solo A/B alimentan `knownIssues` y preguntas específicas del modelo
- C se muestra como `segmentNotes` con etiqueta explícita

### RAG más estricto
- Penalización de chunks universales en vector store (`-0.08` vs `+0.02`)
- Re-ranking por nivel de evidencia en `retrieveKnowledgeForVehicle`
- Bloqueo total de conocimiento de modelo si validación falla

### Valoración honesta
- Percentiles P10/P90 en distribución
- `confidenceTier`: Alta / Media / Baja / Muy baja
- Penalización extra con 1–3 comparables
- Sin mercado: confianza máxima ~28 %, tier «muy baja»

### Producto de compra
- `PurchaseRecommendation`: veredicto 🟢🟡🟠🔴 con resumen
- `MissingDataCard`: datos que más mejoran la valoración
- Calidad del anuncio 0–100 con factores desglosados
- Checklist de inspección por fases (antes de ir, frío, prueba, caliente, antes de pagar)
- Preguntas al vendedor: prioridad, categoría, máx. 8, filtradas por combustible

### Observabilidad
- **Archivo:** `lib/observability/analysis-logger.ts`
- Logs JSON: validación, mercado, RAG, fallbacks

### UI
- Alertas de validación
- Hero «¿Es una buena compra?»
- Badges de evidencia en issues técnicos
- Sección «Notas de segmento» separada

---

## 4. Arquitectura modificada

```
VehicleInput
    │
    ▼
validateVehicleConsistency() ──► validation (bloquea RAG si invalid)
    │
    ├── searchAllComparables() ──► valuation (con confidenceTier)
    │
    ├── lookupKnowledge(allowModelKnowledge)
    │       │
    │       ├── retrieveKnowledgeForVehicle() [re-rank por evidencia]
    │       └── chunksToReliability() [solo A/B en knownIssues]
    │
    ├── scoreVehicle() + buildPurchaseRecommendation()
    ├── analyzeListing() [qualityScore + checklist]
    └── buildSellerQuestions() [prioridad + filtro combustible]
    │
    ▼
AnalyzeResponse (+ validation, purchaseRecommendation, missingData)
```

**Nuevos tipos:** `types/vehicle-validation.ts`  
**API:** `POST /api/vehicle/analyze` — respuesta ampliada, retrocompatible en campos existentes

---

## 5. Tests creados

**Archivo:** `lib/vehicles/__tests__/mvp-quality.test.ts`  
**Script:** `npm run test:mvp`

| Caso | Descripción | Resultado |
|------|-------------|-----------|
| 1 | BMW X1 sDrive18d válido | ✅ |
| 2 | Ebro S800 motor válido | ✅ (catálogo) |
| 3 | Ebro S800 + sDrive18d | ✅ invalid + sin RAG modelo |
| 4 | EV pregunta batería | ✅ |
| 5 | Gasolina NO pregunta HV | ✅ |
| 6 | Diésel NO pregunta heat pump | ✅ |
| 7 | Sin anuncios → sin mercado | ✅ |
| 8 | 1 anuncio → confianza baja | ✅ |
| 9 | Muchos comparables → P10/P90 | ✅ |
| 10 | Adversarios (BMW+Model3, Ferrari+dCi, Tesla+diesel, Prius+V8) | ✅ |

---

## 6. Tests ejecutados

```bash
npm run test:mvp     # 15/15 pass
npm run build        # OK
```

**Prueba manual API (Ebro S800 incoherente):**
- `validation.severity`: `invalid`
- `reliability.knownIssues`: `0`
- `purchaseRecommendation`: «No compraría sin investigar más»

**Prueba manual API (BMW X1 válido):**
- `validation.severity`: `valid`
- `reliability.knownIssues`: `3`
- `comparables`: 13, `confidenceTier`: `alta`

---

## 7. Bugs corregidos

1. Contaminación RAG EV → modelos sin evidencia (Ebro S800)
2. Versión BMW no detectada en strings tipo `sDrive18d`
3. Confianza alta con muestra mínima de mercado
4. Preguntas de batería HV en vehículos no eléctricos
5. Issues universales presentados como específicos del modelo

---

## 8. Limitaciones actuales

- **Catálogo:** validación marca/modelo depende de `vehicle-catalog.json`; marcas nuevas generan warning, no error
- **Generaciones:** no hay validación año↔generación por modelo (requiere base de datos de generaciones)
- **RAG:** sigue existiendo conocimiento de segmento; ahora está etiquetado pero no eliminado del corpus
- **Mercado:** depende de disponibilidad de coches.net (antibot, rate limits)
- **Score global:** sigue siendo heurístico en depreciación; no hay ML
- **Mobile:** mejorado en layout pero sin test visual exhaustivo en esta sesión
- **Chat IA:** prompts mejorados indirectamente vía RAG; no reescritos por completo

---

## 9. Funcionalidades pendientes

| Prioridad | Funcionalidad |
|-----------|---------------|
| P1 | Base de generaciones por modelo para validar año↔versión |
| P1 | Enriquecer catálogo Ebro con motorizaciones oficiales |
| P1 | Score de riesgo de compra independiente con más peso en validación + anuncio |
| P2 | Cache de búsquedas de mercado por query hash |
| P2 | Tests E2E con Playwright en viewport móvil |
| P3 | Trazabilidad de fuentes por afirmación (official/marketplace/community) en UI |
| P3 | Integración DGT / informes de bastidor cuando haya API |

---

## 10. Recomendaciones para la siguiente iteración

1. **Generaciones en catálogo:** añadir `yearFrom`/`yearTo` por modelo en `vehicle-catalog.json` para validar año vs motorización.
2. **RAG ingest:** marcar chunks con `evidenceLevel` en origen (en JSON packs) en lugar de inferir solo en runtime.
3. **Mercado:** persistir resultados de scrape 24 h para reducir latencia y mejorar reproducibilidad.
4. **A/B producto:** medir si el veredicto «¿Es buena compra?» reduce rebotes vs solo precio.
5. **Ampliar batería adversaria:** ejecutar `npm run test:mvp` en CI en cada PR.

---

## MVP SCORE (0–10)

| Dimensión | Antes | Después | Notas |
|-----------|-------|---------|-------|
| UX | 5 | 7 | Veredicto de compra, alertas, checklist; falta pulir flujo móvil |
| Datos | 3 | 8 | Validación fuerte; falta generaciones |
| Mercado | 6 | 7 | Honesto sin comparables; tiers de confianza |
| Precio | 5 | 8 | P10/P90, tiers, sin fingir mercado |
| RAG | 3 | 8 | Evidencia A/B/C, bloqueo si datos incoherentes |
| Fiabilidad | 4 | 7 | Solo con evidencia de modelo; segmento separado |
| Preguntas | 5 | 8 | Prioridad, filtro combustible, máx. 8 |
| Inspección | 4 | 7 | Checklist por fases adaptada al vehículo |
| Transparencia | 4 | 9 | «No lo sabemos» preferido a inventar |
| Mobile | 6 | 7 | Layout responsive; sin QA visual completo |
| Performance | 7 | 7 | Sin regresión; logging añadido |

### **Valoración global MVP: 7.5 / 10**

*(Antes estimado: ~4.5/10 — principalmente por contaminación RAG y falta de validación)*

---

## Criterio final (caso Ebro)

**Entrada:** Ebro S800, sDrive18d, 220 CV, eléctrico, 2026, 12.000 km, 29.000 €

**Resultado:**
- ✅ Detecta inconsistencias antes de generar conocimiento técnico
- ✅ 0 issues de modelo atribuidos
- ✅ Veredicto: no comprar sin investigar más
- ✅ Sin preguntas de bomba de calor presentadas como del Ebro S800

**BMW X1 válido:**
- ✅ 3 issues con evidencia de modelo
- ✅ 13 comparables, confianza alta
- ✅ Preguntas relevantes (diésel, no EV)

---

*Informe generado al cierre de la sesión de mejora MVP.*
