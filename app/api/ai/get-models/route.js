import { NextResponse } from "next/server";
import { FALLBACK_MODELS } from "@/lib/ai-models";
import { getFreeModels, SAFE_FREE_MODEL_IDS } from "@/lib/free-models.mjs";

// Models that appear as "free" in the OpenRouter catalog but are known to
// fail in practice (timeout, agentic-only 403, rate-limited 429, etc.).
// We filter these out of the picker so users can't select a broken model.
const KNOWN_BROKEN_MODEL_IDS = new Set([
  "nex-agi/nex-n2.5-mini:free",          // TIMEOUT / socket hang up
  "nvidia/nemotron-3-ultra-550b-a55b:free", // TIMEOUT / socket hang up
  "thinkingmachines/inkling-small:free", // 403 agentic-only
  "thinkingmachines/inkling:free",       // 403 agentic-only
  "poolside/laguna-s-2.1:free",          // 429 consistently rate limited
  "openrouter/auto",                     // 402 needs paid credits
  "openrouter/free",                     // 402 needs paid credits
]);

export async function GET(_req) {
  try {
    const liveModels = await getFreeModels();

    // Filter out broken models from the live catalog.
    const models = Array.isArray(liveModels)
      ? liveModels.filter((m) => !KNOWN_BROKEN_MODEL_IDS.has(m.id))
      : [];

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