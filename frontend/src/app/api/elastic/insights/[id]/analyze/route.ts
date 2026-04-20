import { diagnose, suggestFix } from "@/lib/elastic/analyzer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const insightId = parseInt(id, 10);

  try {
    // Run diagnosis first, then suggest fix
    await diagnose(insightId);
    const result = await suggestFix(insightId);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
