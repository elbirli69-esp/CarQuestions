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
- Capa `AIProvider` intercambiable (asistente de demostración o OpenAI / DeepSeek / AI Gateway si hay clave)
- Documentos `VehicleDocument` e índice por palabras clave, listos para RAG/embeddings
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

Sin claves de IA, el chat usa el asistente de demostración. Si añades `OPENAI_API_KEY` (o DeepSeek / AI Gateway) en `.env.local`, el proveedor real se usará automáticamente.

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # compilación de producción
npm run start    # servir el build
npm run lint     # eslint
```

## Variables de entorno

Ver `.env.example`. Las claves de API nunca se exponen al navegador: las rutas viven en `app/api`.

## Despliegue en Vercel

1. Importa el repositorio en Vercel (framework: Next.js).
2. Añade las variables de `.env.example` que necesites.
3. Despliega. No hace falta base de datos para el MVP.

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
