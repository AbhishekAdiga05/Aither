import { NextResponse } from "next/server";
import { FALLBACK_MODELS } from "@/lib/ai-models";
import { getFreeModels } from "@/lib/free-models.mjs";

export async function GET(_req) {
  try {
    const models = await getFreeModels();

    return NextResponse.json(
      { models },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Error fetching free models:", error);

    return NextResponse.json(
      {
        models: FALLBACK_MODELS,
        fallback: true,
        error: error.message || "Failed to fetch free models",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}