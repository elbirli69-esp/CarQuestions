# CarQuestions

Tasador, comparador y asistente para comprar coches de segunda mano.

Este repositorio contiene el **MVP**. La interfaz y el motor de valoración están listos para Vercel. Las fuentes de anuncios reales todavía no están conectadas: los comparables se generan con proveedores mock claramente identificados.

## Qué hay ahora

- Formulario de vehículo (datos básicos y opcionales)
- Campo de URL de anuncio preparado para extracción futura
- `POST /api/vehicle/analyze` con valoración, scores, comparables, análisis y preguntas al vendedor
- Motor de valoración por distribución de precios (mínimo, P25, mediana, P75, máximo) + ajustes solo si el usuario aporta el dato
- Chat sobre el coche concreto
- Capa `SourceProvider` modular (coches.net, AutoScout24, Wallapop, etc. como mocks)
- Capa `AIProvider` intercambiable: en Vercel usa **AI Gateway + DeepSeek** con OIDC (igual que el resto de proyectos). Fuera de Vercel puede usar la clave DeepSeek en `OPENAI_API_KEY` o el asistente de demostración.
- Documentos `VehicleDocument` e índice RAG con **base vectorial TF-IDF** (`data/knowledge/`)
- Corpus curado de fiabilidad/mantenimiento por marca, modelo, año y combustible
- Diseño mobile-first con Next.js, TypeScript, Tailwind y shadcn/ui

## Qué no hace todavía

- No scrapea portales ni incumple términos de uso
- No consulta DGT, ITV ni fichas oficiales reales
- No presenta precios de demostración como datos de mercado reales
- No persiste análisis (el almacén en memoria no sobrevive en Vercel)

## Arranque local

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Sin claves de IA, el chat usa el asistente de demostración.

En Vercel no hace falta copiar `OPENAI_API_KEY`: el runtime inyecta `VERCEL_OIDC_TOKEN` y CarQuestions llama a DeepSeek por **AI Gateway**, igual que el resto de proyectos.

En local, o bien `vercel env pull .env.local`, o bien la clave DeepSeek:

```
OPENAI_API_KEY=<la misma clave DeepSeek>
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # compilación de producción
npm run start    # servir el build
npm run lint     # eslint
npm run rag:ingest  # regenerar data/knowledge/vector-index.json tras editar chunks
```

## Variables de entorno

Ver `.env.example`. Las claves de API nunca se exponen al navegador: las rutas viven en `app/api`.

## Despliegue en Vercel

1. Importa el repositorio (framework: Next.js, Production Branch: `main`).
2. No hace falta copiar `OPENAI_API_KEY`. En el deploy, Vercel inyecta OIDC y la app usa AI Gateway con `deepseek/deepseek-v4-flash`.
3. Comprueba que AI Gateway está activo en el equipo (el mismo que usan los otros proyectos).
4. Tras mergear este cambio a `main`, Vercel redespliega solo. No hace falta base de datos.

Opcional: `AI_GATEWAY_MODEL=deepseek/deepseek-v4-pro` si quieres el modelo más capaz.

## Base de conocimiento RAG

- Corpus editable: `data/knowledge/chunks.json`
- Enriquecimientos (síntomas, preguntas, inspección): `data/knowledge/enrichments.json`
- Metodología de fuentes: `data/knowledge/SOURCES.md`
- Índice vectorial (TF-IDF): `data/knowledge/vector-index.json` (generado con `npm run rag:ingest`)
- Recuperación híbrida: filtros por vehículo + similitud coseno + documentos dinámicos del análisis
- Integrado en fiabilidad, mantenimiento, preguntas al vendedor y chat

Para añadir un modelo: crea chunks con `brands`, `models`, `yearFrom`/`yearTo`, `fuels`, `type` (`issue`, `maintenance`, `inspection`, `recall`) y vuelve a ejecutar `npm run rag:ingest`.

## Arquitectura

```
app/            páginas y API routes
components/     UI (formulario, valoración, chat, fuentes)
lib/            valoración, fuentes, RAG, validación
providers/      AIProvider y registro de fuentes
types/          Vehicle, VehicleListing, VehicleDocument, VehicleContext
```

Para añadir un portal real: implementa `SourceProvider`, registra el conector en `lib/sources/registry.ts` y deja el motor de valoración intacto.

Para búsqueda en lenguaje natural (“BMW X1 por debajo de 20.000 €”) existe el esqueleto `lib/agent/search-agent.ts`.
