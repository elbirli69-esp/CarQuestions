import type { AnalysisDiagnostics } from "@/types/analysis";

export class AnalysisTimer {
  private readonly started = Date.now();
  private readonly stages: AnalysisDiagnostics["stages"] = [];

  mark(stage: string, detail?: string): void {
    const ms = Date.now() - this.started;
    this.stages.push({ stage, ms, detail });
    if (process.env.NODE_ENV !== "production") {
      console.info(`[analyze] ${stage}${detail ? `: ${detail}` : ""} (+${ms}ms)`);
    }
  }

  finish(partial: Omit<AnalysisDiagnostics, "durationMs" | "stages">): AnalysisDiagnostics {
    return {
      durationMs: Date.now() - this.started,
      stages: this.stages,
      ...partial,
    };
  }
}
