# CarQuestions — informe MVP

Fecha: 2026-08-23  
Rama: `cursor/mvp-trust-coherence-e479`

## 1. Estado inicial

El MVP ya tasaba, buscaba comparables en coches.net, recuperaba un corpus RAG y generaba preguntas. Transmitía más certeza de la que podía defender.

El fallo más grave era de **identidad + recuperación**:

- El formulario aceptaba cualquier versión libre (p. ej. `sDrive18d` sobre un Ebro S800 eléctrico).
- El RAG trataba chunks universales (`brands: ["*"]`) como conocimiento del modelo.
- La consulta de fiabilidad se expandía con sinónimos genéricos (CKP, CMP, SOH, heat pump…).
- El resultado presentaba sensores ICE, P0118, octovalve o batería HV como si fueran de ese coche.

Eso rompe la confianza del producto. Un copiloto de compra no puede inventar ficha técnica.

## 2. Problemas encontrados

| Área | Problema |
| --- | --- |
| Identidad | Sin validador marca ↔ modelo ↔ versión ↔ combustible ↔ potencia |
| RAG | `brands: ["*"]` y modelos vacíos pasaban el filtro |
| RAG | Query expandida con jerga genérica contaminaba el ranking TF-IDF |
| RAG | Issues de xDrive se atribuían a un sDrive18d |
| Precio | Referencia de segmento se leía como mediana de mercado |
| Confianza | Cifra precisa con confianza baja (~16 %) |
| Score | Depreciación y mantenimiento se inventaban con heurística |
| Preguntas | Hasta 12, con fugas EV↔ICE |
| Anuncio | “Calidad” era un % de campos, no una evaluación útil |
| Observabilidad | Difícil ver por qué una tasación salió mal |

## 3. Cambios realizados

- Contrato canónico de vehículo con procedencia (`source`, `confidence`, `verified`).
- `VehicleConsistencyValidator`: no repara en silencio; marca INVALID / SUSPICIOUS y explica.
- RAG por niveles de evidencia A/B/C/D. Solo A/B pueden ser “problema conocido”.
- Filtro de combustible y de tracción (sDrive ≠ xDrive).
- Si la identidad es inválida, **se bloquea el RAG técnico**.
- Mercado honesto: 0 anuncios → «sin mercado comparable»; 1 anuncio → confianza muy baja; muchos → P10–P90.
- Score: no hay nota global si faltan demasiadas dimensiones. Depreciación/mantenimiento ya no se inventan.
- Calidad del anuncio 0–100 con lo que falta.
- Preguntas 5–8, priorizadas y filtradas por combustible.
- Checklist por fases (antes / frío / prueba / caliente / pagar), adaptada al tipo.
- “Para mejorar la valoración necesito…” con impacto.
- UI: veredicto de compra primero, luego precio, mercado, diferencia y confianza.
- Logging estructurado: validación, mercado, RAG, bloqueos.

## 4. Arquitectura modificada

```
formulario / API
    → VehicleConsistencyValidator
    → búsqueda de mercado (versión descartada si es incoherente)
    → lookupKnowledge (bloqueado si INVALID)
         → KnowledgeVectorStore (solo A/B, fuel + drivetrain)
    → valueVehicle (observed | insufficient | none)
    → listing quality + missing data + questions + checklist
    → purchase verdict
```

Nuevos módulos clave:

- `lib/vehicles/identity.ts`
- `lib/vehicles/consistency.ts`
- `lib/vehicles/canonical.ts`
- `lib/rag/evidence.ts`
- `lib/valuation/confidence.ts`
- `lib/valuation/listing-quality.ts`
- `lib/valuation/inspection.ts`
- `lib/valuation/purchase-verdict.ts`
- `lib/observability/log.ts`

El corpus no se ha reescrito. Se ha cambiado **quién puede usarlo y cómo se etiqueta**.

## 5. Tests creados

- `lib/vehicles/__tests__/consistency.test.ts`
- `lib/rag/__tests__/retrieval-strictness.test.ts`
- `lib/valuation/__tests__/seller-questions.test.ts`
- `lib/valuation/__tests__/engine.test.ts`
- `lib/valuation/__tests__/mvp-adversarial.test.ts` (casos 1–10)
- `scripts/smoke-mvp-coherence.ts` (Ebro incoherente + BMW X1 real)

## 6. Tests ejecutados

| Suite | Resultado |
| --- | --- |
| MVP adversarial + consistencia + RAG + preguntas + precio | 27/27 PASS |
| Scraping fixtures (existente) | 6/6 PASS |
| `npx next build` | OK |
| `tsx scripts/smoke-mvp-coherence.ts` | OK |

Prueba real del caso crítico:

```
Ebro S800 + sDrive18d + eléctrico + 220 CV + 29.000 €
→ INVALID
→ "La versión sDrive18d no parece corresponder con el Ebro S800."
→ RAG bloqueado, 0 issues, contaminated=false
→ veredicto: No compraría sin investigar más
```

BMW X1 sDrive18d 2019 diésel:

```
→ VALID
→ 11 comparables reales de coches.net
→ evidencia nivel A (EGR/FAP, cadena N47/B47)
→ preguntas diésel, sin bomba de calor
```

## 7. Bugs corregidos

- Contaminación RAG de chunks universales (CKP/CMP, ECT, EV genérico).
- Combinaciones imposibles aceptadas en silencio.
- xDrive atribuido a sDrive.
- Precio de segmento presentado como mercado.
- Preguntas de batería HV / heat pump en gasolina o diésel.
- Score de depreciación/mantenimiento inventado.
- Tesla ausente del catálogo suplementario (añadido Model 3/Y/S/X).

## 8. Limitaciones actuales

- coches.net a veces devuelve antibot/página vacía. En ese caso **no se inventan anuncios**.
- No hay DGT, ITV oficial, recalls conectadas ni VIN decoder.
- El corpus no tiene ficha específica del Ebro S800. Eso es correcto: se dice que no hay evidencia.
- El RAG sigue siendo TF-IDF, no embeddings.
- La calidad del anuncio no ve fotos reales; usa formulario + URL.
- El chat depende del proveedor de IA configurado.
- No se ha podido hacer QA visual en un teléfono físico en este entorno.

## 9. Funcionalidades que siguen pendientes

- Fuentes oficiales (DGT, fabricante, recalls).
- Generaciones y códigos de motor en catálogo (no solo marca/modelo).
- Packs curados para NEV recientes (Ebro, etc.) **solo con fuentes reales**.
- Scraping de ficha individual más robusto.
- Comparables de más portales (hoy stubs).
- UI de evidencia en el chat (nivel A/B visible en cada cita).
- Persistencia de la validación en el formulario antes de enviar (hoy hay aviso, el análisis es la fuente de verdad).

## 10. Recomendaciones para la siguiente iteración

1. Añadir generaciones y `engine_code` al catálogo; validar año ↔ generación.
2. Revisar a mano los packs `brands: ["*"]` y etiquetarlos como segmento, nunca como issue de modelo.
3. Si coches.net falla, reintentar con backoff y mostrar “fuente no disponible” en la cabecera, no solo en notas.
4. Conectar un informe de bastidor **real** o no ofrecer el campo.
5. QA móvil en dispositivo: formulario, veredicto, preguntas y checklist.
6. Evaluar el RAG con una batería de “no debe recuperar” además del recall actual.

---

## MVP SCORE

| Dimensión | Nota | Comentario |
| --- | --- | --- |
| UX | 8.0 | Empieza por la decisión de compra; menos ruido |
| Datos | 8.5 | Identidad validada y con procedencia |
| Mercado | 7.5 | Honesto; sigue dependiendo del scrape |
| Precio | 8.0 | No finge mediana; distribución cuando hay muestra |
| RAG | 8.5 | Ya no contamina; peca de silencio, que es correcto |
| Fiabilidad | 8.0 | Solo A/B; Ebro sin ficha específica |
| Preguntas | 8.5 | Cortas, priorizadas, filtradas por combustible |
| Inspección | 8.0 | Checklist por fases, adaptada |
| Transparencia | 9.0 | Evidencia, fuentes, “no lo sabemos” |
| Mobile | 7.5 | Mobile-first; sin prueba en dispositivo |
| Performance | 7.0 | El scrape de mercado sigue siendo el cuello de botella |

**Valoración global: 8.1 / 10**

Criterio de producto: ¿confiaría en esta app para decidir si voy a ver el coche?

- **Sí, como filtro previo**: coherencia, huecos, preguntas y (cuando hay anuncios) un rango de mercado.
- **No, como peritaje**: sigue haciendo falta VIN, papeles e inspección real. El sistema ahora lo dice.

## Criterio final (Ebro incoherente)

El sistema detecta la inconsistencia **antes** de generar conocimiento técnico. No intenta “arreglar” sDrive18d. No aparecen CKP/CMP, P0118, discos EV, octovalve ni SOH como problemas del Ebro S800.
