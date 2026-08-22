# Plan de mejoras CarQuestions

Orden de ejecución (prioridad = confianza del precio y del flujo de compra).

## 1. Más comparables y más precisos (coches.net) — HECHO
- Pedir más páginas SSR (3) con fetches en paralelo.
- Preferir anuncios con misma versión / CV cercana cuando hay suficientes.
- Ventana de km blanda; ampliar año solo si faltan datos.
- Notas claras cuando la muestra es pequeña.

## 2. Autorelleno desde URL del anuncio — HECHO
- Parsear slug de coches.net (marca, modelo, versión, combustible, año, provincia, id).
- Buscar el anuncio en resultados SSR por `ad-id` para recuperar precio/km/CV.
- En el formulario: al pegar URL, llamar a `/api/listings/extract` y rellenar campos.

## 3. Persistencia de análisis — HECHO
- Integrado el trabajo del PR #8 (Upstash Redis en Vercel / ficheros en local).
- Chat y `/vehicle/[id]` dejan de romperse tras cold start.

## 4. Corpus RAG técnico — HECHO
- Integrado el trabajo del PR #7 (packs de conocimiento + chat orientado).
- Mejora “¿es fiable?” / averías / preguntas al vendedor.

## Criterio de hecho por punto
1. ≥12–24 anuncios brutos en modelos comunes; filtros estrechos si hay masa; nota si la muestra es baja.
2. Pegar URL de coches.net rellena al menos marca/modelo/año/combustible (y precio/km si el anuncio aparece en listados).
3. Tras `analyze`, `GET /api/vehicle/[id]` responde en un proceso nuevo (`smoke:store` PASS).
4. Chat/fiabilidad usan corpus ampliado; build OK.

