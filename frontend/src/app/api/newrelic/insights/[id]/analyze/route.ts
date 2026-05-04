import { analyzeInsight, suggestFix } from "@/lib/newrelic/analyzer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const insightId = parseInt(id, 10);

  try {
    await analyzeInsight(insightId);
    const result = await suggestFix(insightId);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
