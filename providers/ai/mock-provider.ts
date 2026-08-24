import type { AIAnswer, AIProvider, ChatMessage, VehicleContext } from "@/types/ai";
import { classifyQuestionIntent } from "@/lib/rag/query/expand";
import { formatAlternativeComparisonAnswer } from "@/lib/valuation/compare-alternatives";
import { formatEuro, formatKm, formatPercent } from "@/lib/utils/format";

function contextSummary(context: VehicleContext): string {
  const v = context.vehicle;
  const m = context.marketData;
  const market = context.market;
  const hasMarket =
    (market?.status === "observed" && market.estimatedPrice != null) ||
    (m.comparableCount >= 3 && m.origin === "observed" && m.estimatedPrice > 0);
  const marketNote = hasMarket
    ? `Valor estimado: ${formatEuro(market?.estimatedPrice ?? m.estimatedPrice)} (${formatEuro(m.low)} – ${formatEuro(m.high)}). Comparables: ${market?.comparableCount ?? m.comparableCount}.`
    : `Sin mercado comparable observado. No inventamos un precio de mercado.`;

  return [
    `${v.brand} ${v.model} ${v.version ?? ""} ${v.year}, ${formatKm(v.mileage)}, ${v.fuel}.`,
    v.advertisedPrice ? `Precio anunciado: ${formatEuro(v.advertisedPrice)}.` : "Sin precio anunciado.",
    marketNote,
    m.percentDifference != null && hasMarket
      ? `Desviación: ${formatPercent(m.percentDifference)}. Valoración: ${m.verdictLabel}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function knowledgeSnippets(context: VehicleContext, limit = 4): string[] {
  return (context.retrievedDocuments ?? [])
    .filter((item) => item.document.id.startsWith("knowledge_"))
    .slice(0, limit)
    .map(
      (item) =>
        `- ${item.document.content.slice(0, 320)}${item.document.content.length > 320 ? "…" : ""} (${item.document.source})`,
    );
}

export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly name = "Asistente CarQuestions";
  readonly isConfigured = true;

  async answerQuestion(
    question: string,
    context: VehicleContext,
    history: ChatMessage[],
  ): Promise<AIAnswer> {
    void history;
    const v = context.vehicle;
    const m = context.marketData;
    const market = context.market;
    const identity = context.identity;
    const hasMarket =
      (market?.status === "observed" && market.estimatedPrice != null) ||
      (m.comparableCount >= 3 && m.origin === "observed" && m.estimatedPrice > 0);
    const intent = classifyQuestionIntent(question);
    const snippets = knowledgeSnippets(context);
    const retrievedIds = (context.retrievedDocuments ?? []).map((item) => item.document.id);
    let text = "";

    if (identity && !identity.safeForTechnicalKnowledge) {
      text = [
        "Los datos que has introducido se contradicen (marca, modelo, versión o combustible).",
        ...identity.issues
          .filter((issue) => issue.severity === "blocking")
          .map((issue) => `- ${issue.message}`),
        "Corrige el formulario antes de preguntar por averías o precio. No invento conocimiento técnico para un vehículo incoherente.",
      ].join("\n");
      return {
        text,
        provider: this.name,
        isDemo: true,
        origin: "ai_estimate",
        usedDocuments: retrievedIds,
        disclaimer:
          "Identidad del vehículo inválida. Las respuestas técnicas y de mercado están bloqueadas hasta corregir los datos.",
      };
    }

    if (intent === "price") {
      text = [
        contextSummary(context),
        m.advertisedPrice
          ? hasMarket
            ? `Según los comparables observados, el anuncio está catalogado como «${m.verdictLabel}».`
            : `Sin anuncios reales conectados, solo puedo comparar con una referencia orientativa: «${m.verdictLabel}». Confirma en portales antes de decidir.`
          : "No hay precio anunciado, así que no se puede decir si es barato o caro.",
        m.advertisedPrice && hasMarket
          ? `Como techo prudente con estos comparables, estaría cerca de ${formatEuro(m.low)}.`
          : m.advertisedPrice
            ? "Sin anuncios comparables suficientes no propongo un techo de negociación numérico."
            : "",
        snippets.length ? `Contexto técnico a tener en cuenta al negociar:\n${snippets.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (intent === "reliability") {
      if (context.reliabilityData.knownIssues.length === 0 && snippets.length === 0) {
        text = `No hay una ficha de problemas conocidos suficientemente específica para ${v.brand} ${v.model} en la base de conocimiento. No invento averías. Conviene buscar boletines del fabricante y un informe de un taller especialista.`;
      } else {
        text = [
          `Para un ${v.brand} ${v.model} ${v.year} ${v.fuel}, el conocimiento técnico curado (foros/manuales/recalls) señala:`,
          ...context.reliabilityData.knownIssues.map((issue) => `- ${issue.title}: ${issue.detail}`),
          snippets.length ? `Fragmentos RAG adicionales:\n${snippets.join("\n")}` : "",
          "No significa que este coche concreto las tenga. Hay que contrastarlo con historial y una inspección.",
        ]
          .filter(Boolean)
          .join("\n");
      }
    } else if (intent === "maintenance") {
      text = context.maintenanceData.available
        ? [
            context.maintenanceData.notes.join(" "),
            context.maintenanceData.upcoming.length
              ? `Próximas revisiones a vigilar:\n${context.maintenanceData.upcoming.map((item) => `- ${item}`).join("\n")}`
              : "",
            context.maintenanceData.estimatedYearlyCost
              ? `Coste anual orientativo del segmento: ${formatEuro(context.maintenanceData.estimatedYearlyCost)}. No es una factura real de este coche.`
              : "",
            snippets.length ? `Detalle técnico:\n${snippets.join("\n")}` : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : snippets.length
          ? `No hay ficha de mantenimiento dedicada, pero el RAG recuperó:\n${snippets.join("\n")}`
          : "No hay ficha de mantenimiento específica para este vehículo. No estimo un coste para no inventarlo.";
    } else if (intent === "consumption") {
      text =
        "No hay datos de consumo homologado ni de usuarios conectados para este anuncio. No invento litros/100 km. Revisa la ficha del fabricante o una prueba de una revista especializada.";
    } else if (intent === "comparison") {
      text = [
        formatAlternativeComparisonAnswer(context),
        snippets.length ? `Riesgos técnicos del modelo analizado:\n${snippets.slice(0, 2).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (intent === "inspection") {
      text = [
        "Antes de comprar yo revisaría:",
        "- Historial y distribución / caja automática si aplica.",
        "- Carrocería, interiores, neumáticos y posibles fugas.",
        "- Prueba en caliente, ruidos y electrónica.",
        context.reliabilityData.knownIssues[0]
          ? `- En este modelo, especialmente: ${context.reliabilityData.knownIssues[0].title}.`
          : "",
        snippets.length ? `Checklist técnico del corpus:\n${snippets.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      text = [
        `Puedo hablar de este ${v.brand} ${v.model} ${v.year} concreto con la base de conocimiento técnica.`,
        contextSummary(context),
        snippets.length
          ? `Lo más relevante del RAG para tu pregunta:\n${snippets.join("\n")}`
          : "No he recuperado fragmentos extra suficientemente cercanos a la pregunta.",
        "Si no hay un dato, lo digo. No invento precios de mercado ni averías.",
      ].join("\n\n");
    }

    // Reglas puntuales de depreciación / km año sobre el intent general
    const q = question.toLowerCase();
    if ((q.includes("3 años") || q.includes("depreci") || q.includes("valer")) && hasMarket) {
      const base = market?.estimatedPrice ?? m.estimatedPrice;
      const future = Math.round(base * Math.pow(0.9, 3));
      text = `Una regla orientativa (no predicción) sería perder en torno a un 10 % anual: ${formatEuro(base)} → unos ${formatEuro(future)} dentro de 3 años, si el mercado y el kilometraje se mantienen razonables. Confirma con anuncios reales del segmento.`;
    } else if ((q.includes("3 años") || q.includes("depreci") || q.includes("valer")) && !hasMarket) {
      text =
        "Sin comparables de mercado observados no puedo estimar depreciación numérica. Busca anuncios equivalentes en el portal y compara al menos cinco precios.";
    } else if (q.includes("30.000") || q.includes("30000") || q.includes("km al año")) {
      text = [
        v.fuel === "diesel"
          ? "Con 30.000 km al año un diésel bien mantenido puede tener sentido si hay carretera de por medio. Aun así, hay que mirar FAP, distribución y el coste de mantenimiento de esta unidad concreta."
          : "Con 30.000 km al año importa más la fiabilidad y el coste por kilómetro que el precio de compra. Sin datos reales de consumo y averías de esta unidad, no se puede cerrar la recomendación.",
        snippets.length ? `Patrones técnicos a vigilar:\n${snippets.slice(0, 3).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    return {
      text,
      provider: this.name,
      isDemo: true,
      origin: hasMarket ? "observed" : "ai_estimate",
      usedDocuments: retrievedIds,
      disclaimer:
        "Respuesta basada en los datos que has introducido y la base de conocimiento curada (foros/manuales/recalls). No sustituye tasación oficial ni inspección mecánica.",
    };
  }
}
