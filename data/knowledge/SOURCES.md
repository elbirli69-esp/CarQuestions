# Fuentes del corpus RAG

Este corpus **no scrapea portales de venta** ni consulta DGT/ITV en tiempo real. Cada chunk es un resumen curado a mano a partir de fuentes públicas y conocimiento técnico habitual.

## Tipos de fuente usados

| Tipo | Ejemplos | Uso en CarQuestions |
|------|----------|---------------------|
| **Foros técnicos** | BMWFAQ, AudiSport, VAG/Cupra, ForoCoches (secciones mecánica), Motor.es | Patrones de avería repetidos por motor/generación |
| **Manuales de mantenimiento** | Intervalos oficiales de aceite, correa/cadena, AdBlue, caja automática | Bloques `maintenance` e `inspection` |
| **Campañas / recalls públicos** | Safety Gate (UE), comunicados de prensa de fabricantes | Bloques `recall` cuando la campaña es pública |
| **Informes de fiabilidad** | ADAC/TÜV Breakdown Statistics, Which? Reliability (patrones generales) | Priorizar qué problemas son frecuentes por segmento |
| **Checklists de taller** | Inspección precompra independiente | Bloques `inspection` genéricos |

## Qué NO es

- No es un informe de este bastidor concreto.
- No sustituye una inspección mecánica ni la consulta de recalls por VIN en fuentes oficiales.
- Los chunks están marcados `isDemo: true` hasta que se revisen uno a uno con un mecánico o documentación primaria.

## Cómo ampliar

1. Identifica motor + generación + años (no solo "Golf").
2. Añade o edita un chunk en `data/knowledge/chunks.json`.
3. Opcional: enriquece con `symptoms`, `askSeller`, `inspectSteps` en `data/knowledge/enrichments.json` (se fusiona al cargar).
4. Busca el patrón en foro técnico + manual + recall si existe.
5. Redacta un chunk atómico con `source` y `sourceUrl` cuando haya enlace estable.
6. Ejecuta `npm run rag:ingest`.
