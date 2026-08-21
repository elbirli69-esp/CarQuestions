import type { AIAnswer, AIProvider, ChatMessage, VehicleContext } from "@/types/ai";
import { issueToDocument, listingToDocument, vehicleSummaryDocument } from "@/lib/rag/documents";
import { retrieveDocuments } from "@/lib/rag/index";
import { formatAlternativeComparisonAnswer } from "@/lib/valuation/compare-alternatives";
import { formatEuro, formatKm, formatPercent } from "@/lib/utils/format";

function contextSummary(context: VehicleContext): string {
  const v = context.vehicle;
  const m = context.marketData;
  const marketNote =
    m.comparableCount > 0
      ? `Valor estimado: ${formatEuro(m.estimatedPrice)} (${formatEuro(m.low)} – ${formatEuro(m.high)}). Comparables: ${m.comparableCount}.`
      : `Referencia orientativa (sin anuncios reales): ${formatEuro(m.estimatedPrice)} (${formatEuro(m.low)} – ${formatEuro(m.high)}). Confianza baja (${m.confidence} %).`;

  return [
    `${v.brand} ${v.model} ${v.version ?? ""} ${v.year}, ${formatKm(v.mileage)}, ${v.fuel}.`,
    v.advertisedPrice ? `Precio anunciado: ${formatEuro(v.advertisedPrice)}.` : "Sin precio anunciado.",
    marketNote,
    m.percentDifference != null ? `Desviación: ${formatPercent(m.percentDifference)}. Valoración: ${m.verdictLabel}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
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
    const documents = [
      vehicleSummaryDocument(context.vehicle),
      ...context.comparableListings.slice(0, 8).map(listingToDocument),
      ...context.reliabilityData.knownIssues.map((issue) => issueToDocument(context.vehicle, issue)),
    ];
    const retrieved = await retrieveDocuments(
      {
        text: question,
        vehicle: {
          brand: v.brand,
          model: v.model,
          year: v.year,
          fuel: v.fuel,
          version: v.version,
        },
        limit: 8,
      },
      documents,
    );
    const q = question.toLowerCase();
    const m = context.marketData;
    const hasMarket = m.comparableCount > 0;
    let text = "";

    if (q.includes("precio") || q.includes("barato") || q.includes("caro") || q.includes("pagar")) {
      const maxPay = m.low;
      text = [
        contextSummary(context),
        m.advertisedPrice
          ? hasMarket
            ? `Según los comparables observados, el anuncio está catalogado como «${m.verdictLabel}».`
            : `Sin anuncios reales conectados, solo puedo comparar con una referencia orientativa: «${m.verdictLabel}». Confirma en portales antes de decidir.`
          : "No hay precio anunciado, así que no se puede decir si es barato o caro.",
        m.advertisedPrice && hasMarket
          ? `Como techo prudente con estos comparables, estaría cerca de ${formatEuro(maxPay)}.`
          : m.advertisedPrice
            ? `Como referencia prudente sin anuncios reales, un techo orientativo podría rondar ${formatEuro(maxPay)}, pero hay que contrastarlo con anuncios actuales.`
            : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (q.includes("problema") || q.includes("aver") || q.includes("fiab")) {
      if (context.reliabilityData.knownIssues.length === 0) {
        text = `No hay una ficha de problemas conocidos para ${v.brand} ${v.model} en la base de conocimiento. No invento averías. Conviene buscar boletines del fabricante y un informe de un taller especialista.`;
      } else {
        text = [
          `Para un ${v.brand} ${v.model} ${v.year} ${v.fuel}, la base de conocimiento curada señala:`,
          ...context.reliabilityData.knownIssues.map((issue) => `- ${issue.title}: ${issue.detail}`),
          "No significa que este coche concreto las tenga. Hay que contrastarlo con historial y una inspección.",
        ].join("\n");
      }
    } else if (q.includes("manten") || q.includes("distribuci") || q.includes("itv")) {
      text = context.maintenanceData.available
        ? [
            context.maintenanceData.notes.join(" "),
            context.maintenanceData.upcoming.length
              ? `Próximas revisiones a vigilar:\n${context.maintenanceData.upcoming.map((item) => `- ${item}`).join("\n")}`
              : "",
            context.maintenanceData.estimatedYearlyCost
              ? `Coste anual orientativo del segmento: ${formatEuro(context.maintenanceData.estimatedYearlyCost)}. No es una factura real de este coche.`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : "No hay ficha de mantenimiento específica para este vehículo. No estimo un coste para no inventarlo.";
    } else if (q.includes("consum")) {
      text = "No hay datos de consumo homologado ni de usuarios conectados para este anuncio. No invento litros/100 km. Revisa la ficha del fabricante o una prueba de una revista especializada.";
    } else if (q.includes("3 años") || q.includes("depreci") || q.includes("valer")) {
      const future = Math.round(m.estimatedPrice * Math.pow(0.9, 3));
      text = `Una regla orientativa (no predicción) sería perder en torno a un 10 % anual: ${formatEuro(m.estimatedPrice)} → unos ${formatEuro(future)} dentro de 3 años, si el mercado y el kilometraje se mantienen razonables. Confirma con anuncios reales del segmento.`;
    } else if (q.includes("30.000") || q.includes("30000") || q.includes("km al año")) {
      text =
        v.fuel === "diesel"
          ? "Con 30.000 km al año un diésel bien mantenido puede tener sentido si hay carretera de por medio. Aun así, hay que mirar FAP, distribución y el coste de mantenimiento de esta unidad concreto."
          : "Con 30.000 km al año importa más la fiabilidad y el coste por kilómetro que el precio de compra. Sin datos reales de consumo y averías de esta unidad, no se puede cerrar la recomendación.";
    } else if (
      q.includes("cuál comprar") ||
      q.includes("cual comprar") ||
      q.includes("equivalente") ||
      q.includes("mejor") ||
      q.includes("compar") ||
      q.includes("alternativ")
    ) {
      text = formatAlternativeComparisonAnswer(context);
    } else if (q.includes("revis")) {
      text = [
        "Antes de comprar yo revisaría:",
        "- Historial y distribución / caja automática si aplica.",
        "- Carrocería, interiores, neumáticos y posibles fugas.",
        "- Prueba en caliente, ruidos y electrónica.",
        context.reliabilityData.knownIssues[0]
          ? `- En este modelo, especialmente: ${context.reliabilityData.knownIssues[0].title}.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      text = [
        `Puedo hablar de este ${v.brand} ${v.model} ${v.year} concreto, no solo del modelo genérico.`,
        contextSummary(context),
        retrieved[0] ? `Contexto recuperado: ${retrieved[0].document.content}` : "No he recuperado documentos extra para esta pregunta.",
        "Si no hay un dato, lo digo. No invento precios de mercado ni averías.",
      ].join("\n\n");
    }

    return {
      text,
      provider: this.name,
      isDemo: false,
      origin: hasMarket ? "observed" : "ai_estimate",
      usedDocuments: retrieved.map((item) => item.document.id),
      disclaimer:
        "Respuesta basada en los datos que has introducido y la base de conocimiento curada. No sustituye tasación oficial ni inspección mecánica.",
    };
  }
}
