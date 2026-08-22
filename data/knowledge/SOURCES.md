# Fuentes del corpus RAG

Este corpus **no scrapea portales de venta** ni consulta DGT/ITV en tiempo real. Cada chunk es un resumen curado a partir de patrones públicos y conocimiento técnico habitual.

## Estructura

| Ruta | Contenido |
|------|-----------|
| `data/knowledge/chunks.json` | Corpus base histórico del MVP |
| `data/knowledge/packs/*.json` | Packs temáticos ampliados (playbooks, marcas, papers) |
| `data/knowledge/enrichments.json` | Overlays de síntomas / preguntas / inspección |
| `data/knowledge/vector-index.json` | Índice TF-IDF generado con `npm run rag:ingest` |

Los packs se fusionan automáticamente al cargar. IDs únicos en todo el corpus.

## Tipos de fuente usados

| Tipo | Ejemplos | Uso en CarQuestions |
|------|----------|---------------------|
| **Foros técnicos** | BMWFAQ, AudiSport, GolfMK7, TDIClub, ClubToyota, PriusChat, PureTech/BlueHDi communities, BenzWorld, Ford EcoBoost forums, Honda-Tech, Nicoclub, Tesla Motors Club | Patrones de avería repetidos por motor/generación + síntomas |
| **Manuales de mantenimiento** | Intervalos aceite, correa/cadena, AdBlue, DSG/ZF/EAT, Haldex, CVT | Bloques `maintenance` |
| **Campañas / recalls públicos** | Safety Gate (UE), NHTSA, comunicados de fabricantes | Bloques `recall` y avisos de campañas |
| **Informes de fiabilidad** | ADAC Breakdown Statistics, TÜV Report | Priorizar fallos frecuentes por edad/segmento |
| **Literatura técnica** | Papers/SAE sobre DPF, degradación Li-ion, desgaste de cadenas; manuales Bosch/Delphi post-tratamiento | Playbooks síntoma→causa→solución |
| **Checklists de taller** | Inspección precompra independiente | Bloques `inspection` |

## Playbooks síntoma → solución

Los packs `01-symptom-playbooks.json` y afines documentan:

1. **Síntoma** observable (ruido, aviso, vibración…)
2. **Causas probables** por sistema (distribución, FAP, bimasa…)
3. **Qué preguntar al vendedor**
4. **Qué revisar en taller**
5. **Coste orientativo** cuando hay rango habitual

Marca `"brands": ["*"]` = aplicable a cualquier vehículo (tras filtros de combustible/año).

## Qué NO es

- No es un informe de este bastidor concreto.
- No sustituye una inspección mecánica ni la consulta de recalls por VIN en fuentes oficiales.
- Los chunks están marcados `isDemo: true` hasta revisión uno a uno con documentación primaria o mecánico.

## Cómo ampliar

1. Identifica motor + generación + años (no solo "Golf").
2. Añade un chunk en `chunks.json` **o** en un pack `data/knowledge/packs/*.json`.
3. Opcional: enriquece con `symptoms`, `askSeller`, `inspectSteps` (en el propio chunk o en `enrichments.json`).
4. Contrasta el patrón en foro técnico + manual + recall si existe.
5. Redacta un chunk atómico con `source` y `sourceUrl` cuando haya enlace estable.
6. Ejecuta `npm run rag:ingest` (o `npm run rag:generate-packs` si regeneras packs desde el script).

```bash
npm run rag:generate-packs   # regenera packs desde scripts/generate-knowledge-packs.ts
npm run rag:ingest           # reconstruye vector-index.json
```
