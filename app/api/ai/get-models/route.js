import { NextResponse } from "next/server";
import { FALLBACK_MODELS } from "@/lib/ai-models";
import { filterKnownBroken, getFreeModels } from "@/lib/free-models.mjs";

export async function GET(_req) {
  try {
    const liveModels = await getFreeModels();

    // Filter out known-broken models from the live catalog so the picker
    // never offers a model that hangs or 404s.
    const models = filterKnownBroken(liveModels);

    // If the live catalog returned nothing useful, fall back to SAFE_FREE_MODEL_IDS
    // shaped into model objects so the picker always has something to show.
    if (models.length === 0) {
      return NextResponse.json(
        { models: FALLBACK_MODELS, fallback: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { models },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
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