# Curación del corpus — quitar `isDemo` con datos fiables

Hoy **693/693** chunks tienen `isDemo: true`. Eso es correcto: el producto muestra badges «demo» y baja confianza hasta que cada ficha pasa revisión.

## Qué significa `isDemo`

| `isDemo` | En la UI / análisis |
|----------|---------------------|
| `true` | Patrón orientativo, foro o síntesis pendiente de verificación primaria |
| `false` | Fuente citada, metadatos de curación y reglas CI cumplidas |

Quitar `isDemo` **no** convierte el chunk en diagnóstico de un bastidor concreto; solo indica que la **fuente del patrón** es verificable.

## Fuentes fiables (orden de preferencia)

1. **Safety Gate UE** — alerta concreta o portal oficial + VIN  
   `https://ec.europa.eu/safety-gate`  
2. **Campaña / recall OEM** — comunicado fabricante con ID de campaña  
3. **TSB / boletín técnico OEM** — PDF o página con número de boletín  
4. **Informes ADAC / TÜV** — informe anual con año en `externalRef`  
5. **Manuales / literatura técnica** — Bosch, SAE, manual taller con URL estable  
6. **Foros técnicos** — **no bastan** con la URL de la home; hilo concreto o TSB enlazado

## Metadatos obligatorios si `isDemo: false`

```json
{
  "id": "ford-powershift-recall-pattern",
  "isDemo": false,
  "curatedAt": "2026-08-25T10:15:00.000Z",
  "verificationLevel": "oem_recall",
  "externalRef": "Ford Powershift campañas UE 2011-2016",
  "sourceUrl": "https://ec.europa.eu/safety-gate-alerts/screen/search"
}
```

### `verificationLevel`

| Valor | Uso |
|-------|-----|
| `safety_gate_alert` | URL de **alerta concreta** en Safety Gate |
| `safety_gate_portal` | Portal oficial para buscar por VIN / marca |
| `oem_recall` | Campaña fabricante (requiere `externalRef`) |
| `oem_tsb` | Boletín técnico OEM |
| `regulatory` | Normativa / administración |
| `reliability_report` | ADAC, TÜV, etc. (requiere `externalRef` con año/informe) |
| `oem_manual` | Manual de mantenimiento oficial |
| `technical_literature` | Paper / manual técnico con URL específica |

## Flujo de trabajo (recomendado)

### 1. Priorizar por mercado España

```bash
npm run rag:curate-report   # demo chunks ordenados por top ventas + qué falta
npm run rag:gaps            # modelos sin cobertura nivel A
```

### 2. Investigar fuente primaria

- Safety Gate: buscar marca/modelo/motor → copiar URL de alerta o referencia  
- OEM: web recalls del fabricante (VW, Renault, Toyota…)  
- ADAC/TÜV: enlace al informe, no solo `adac.de`  
- Foro: enlace al **hilo**, no a `bmwfaq.org/`

### 3. Aplicar curación (sin editar packs masivos)

Añadir overlay en `data/knowledge/curation.json`:

```json
{
  "id": "chunk-id-existente",
  "isDemo": false,
  "curatedAt": "2026-08-25T12:00:00.000Z",
  "verificationLevel": "safety_gate_alert",
  "externalRef": "A12/0123/24",
  "sourceUrl": "https://ec.europa.eu/safety-gate-alerts/screen/alert/..."
}
```

Los packs base pueden seguir `isDemo: true`; el overlay en `curation.json` es la auditoría de curación.

### 4. Validar y publicar

```bash
npm run rag:validate-curation   # CI: reglas de isDemo=false
npm run rag:ingest
npm test
npm run rag:eval
```

## Qué **no** hacer

- Poner `isDemo: false` en bloque en packs sin `sourceUrl` ni `verificationLevel`  
- Usar solo la home de un foro como `sourceUrl`  
- Marcar `safety_gate_alert` sin URL de alerta concreta  
- Inventar `reliabilityScore` o costes sin rango documentado

## Curación por lotes (estrategia)

| Lote | Tipo | Acción |
|------|------|--------|
| 1 | 9 `recall` + Safety Gate | Portal o alerta → `curation.json` (7 ya curados) |
| 2 | Top España Sandero/Clio/ZS… | 1–2 issues por modelo con OEM o Safety Gate |
| 3 | VAG DQ200 / PureTech | TSB OEM o alertas + hilos enlazados |
| 4 | Playbooks síntoma | Mantener demo o `technical_literature` con paper SAE |
| 5 | Universal `brands: ["*"]` | Segmento (nivel C); curar solo si hay fuente regulatoria |

## Comandos

```bash
npm run rag:curate-report      # backlog de curación
npm run rag:validate-curation  # gate CI
npm run rag:gaps               # cobertura por modelo
```
