import type { AIAnswer, AIProvider, ChatMessage, VehicleContext } from "@/types/ai";
import { issueToDocument, listingToDocument, vehicleSummaryDocument } from "@/lib/rag/documents";
import { retrieveDocuments } from "@/lib/rag/index";
import { formatAlternativeComparisonAnswer } from "@/lib/valuation/compare-alternatives";
import { formatEuro, formatKm, formatPercent } from "@/lib/utils/format";

function contextSummary(context: VehicleContext): string {
  const v = context.vehicle;
  const m = context.marketData;
  return [
    `${v.brand} ${v.model} ${v.version ?? ""} ${v.year}, ${formatKm(v.mileage)}, ${v.fuel}.`,
    v.advertisedPrice ? `Precio anunciado: ${formatEuro(v.advertisedPrice)}.` : "Sin precio anunciado.",
    `Valor estimado de demostración: ${formatEuro(m.estimatedPrice)} (${formatEuro(m.low)} – ${formatEuro(m.high)}).`,
    m.percentDifference != null ? `Desviación: ${formatPercent(m.percentDifference)}. Valoración: ${m.verdictLabel}.` : "",
    `Comparables de demostración: ${m.comparableCount}. Confianza: ${m.confidence} %.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly name = "Asistente de demostración";
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
    let text = "";

    if (q.includes("precio") || q.includes("barato") || q.includes("caro") || q.includes("pagar")) {
      const maxPay = m.low;
      text = [
        contextSummary(context),
        m.advertisedPrice
          ? `Según el motor de valoración de este MVP, el anuncio está catalogado como «${m.verdictLabel}».`
          : "No hay precio anunciado, así que no se puede decir si es barato o caro.",
        `Si preguntas cuánto pagar como máximo, un techo prudente con estos comparables de demostración estaría cerca de ${formatEuro(maxPay)}, siempre por debajo de ${formatEuro(m.estimatedPrice)}.`,
        "Esto no es una tasación oficial: los anuncios usados ahora mismo son simulados.",
      ].join("\n\n");
    } else if (q.includes("problema") || q.includes("aver") || q.includes("fiab")) {
      if (context.reliabilityData.knownIssues.length === 0) {
        text = `No hay una ficha de problemas conocida para ${v.brand} ${v.model} en la base de demostración. No invento averías. Conviene buscar boletines del fabricante y un informe de un taller especialista.`;
      } else {
        text = [
          `Para un ${v.brand} ${v.model} ${v.year} ${v.fuel} hay estas alertas en la base de demostración:`,
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
              ? `Coste anual orientativo de demostración: ${formatEuro(context.maintenanceData.estimatedYearlyCost)}. No es una factura real de este coche.`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : "No hay ficha de mantenimiento específica para este vehículo. No estimo un coste para no inventarlo.";
    } else if (q.includes("consum")) {
      text = "No hay datos de consumo homologado ni de usuarios conectados para este anuncio. No invento litros/100 km. Revisa la ficha del fabricante o una prueba de una revista especializada.";
    } else if (q.includes("3 años") || q.includes("depreci") || q.includes("valer")) {
      const future = Math.round(m.estimatedPrice * Math.pow(0.9, 3));
      text = `Una regla grosera de demostración (no una predicción) sería perder en torno a un 10 % anual: ${formatEuro(m.estimatedPrice)} → unos ${formatEuro(future)} dentro de 3 años, si el mercado y el kilometraje se mantienen razonables. Es una estimación de modelo, no un dato observado.`;
    } else if (q.includes("30.000") || q.includes("30000") || q.includes("km al año")) {
      text =
        v.fuel === "diesel"
          ? "Con 30.000 km al año un diésel bien mantenido puede tener sentido si hay carretera de por medio. Aun así, hay que mirar FAP, distribución y el coste de mantenimiento de esta unidad concreta."
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
        "Si no hay un dato, lo digo. Este asistente de demostración no inventa precios de mercado reales.",
      ].join("\n\n");
    }

    return {
      text,
      provider: this.name,
      isDemo: true,
      origin: "demo_model",
      usedDocuments: retrieved.map((item) => item.document.id),
      disclaimer:
        "Respuesta de demostración basada en el vehículo introducido y en comparables simulados. No sustituye una tasación ni una inspección.",
    };
  }
}
