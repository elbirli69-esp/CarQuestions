import { notFound } from "next/navigation";
import { AnalyzeApp } from "@/components/analyze-app";
import { getAnalysis } from "@/lib/store/vehicle-store";

export const dynamic = "force-dynamic";

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) {
    notFound();
  }

  return (
    <main className="flex-1">
      <AnalyzeApp initialAnalysis={analysis} />
    </main>
  );
}
