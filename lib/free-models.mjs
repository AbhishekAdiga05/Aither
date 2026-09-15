// Shared, cached OpenRouter FREE-model catalog.
// Used by /api/ai/get-models for the picker AND by /api/chat to enforce that
// only zero-cost models can be invoked — a client-supplied `model` can never
// burn money on the app's OpenRouter key.

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Safety-net snapshot of OpenRouter's free, text-chat-usable models.
// Used ONLY when the live catalog is unreachable, so chat keeps working
// without ever expanding cost. Audio-authoring models (e.g. Lyria) excluded.
export const SAFE_FREE_MODEL_IDS = [
  "inclusionai/ling-3.0-flash-vl:free",
  "nex-agi/nex-n2.5-mini:free",
  "nex-agi/nex-n2.5-pro:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "dots-studio/dots-3-note-preview:free",
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "thinkingmachines/inkling-small:free",
  "poolside/laguna-s-2.1:free",
  "thinkingmachines/inkling:free",
  "poolside/laguna-xs-2.1:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3.5-content-safety:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/free",
];

const cache = { data: null, fetchedAt: 0, inFlight: null };

async function fetchFreeModelsCatalog() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models = Array.isArray(data?.data) ? data.data : [];

    return models
      .filter((model) => {
        const promptPrice = parseFloat(model.pricing?.prompt || "0");
        const completionPrice = parseFloat(model.pricing?.completion || "0");
        const outputModalities = model.architecture?.output_modalities ?? [];
        // Free (0/0 pricing) AND usable as a text chat model (no audio output).
        return (
          promptPrice === 0 &&
          completionPrice === 0 &&
          !outputModalities.includes("audio")
        );
      })
      .map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length,
        architecture: model.architecture,
        pricing: model.pricing,
        top_provider: model.top_provider,
      }));
  } finally {
    clearTimeout(timer);
  }
}

export async function getFreeModels() {
  const now = Date.now();
  const isStale = !cache.fetchedAt || now - cache.fetchedAt > CACHE_TTL_MS;

  // 🚀 Stale-While-Revalidate: if we have ANY cached data, return it
  // immediately and kick off a background refresh. This means callers
  // (including /api/chat) never block on the OpenRouter network round-trip
  // after the very first load — fixing the primary "AI is slow" symptom.
  if (cache.data && isStale && !cache.inFlight) {
    cache.inFlight = fetchFreeModelsCatalog()
      .then((models) => {
        cache.data = models;
        cache.fetchedAt = Date.now();
        return models;
      })
      .catch(() => {
        // Background refresh failed — keep serving the stale data.
      })
      .finally(() => {
        cache.inFlight = null;
      });
  }

  // If we have data (fresh or stale), return it immediately.
  if (cache.data) {
    return cache.data;
  }

  // First-ever load: no data yet, must wait for the initial fetch.
  if (!cache.inFlight) {
    cache.inFlight = fetchFreeModelsCatalog()
      .then((models) => {
        cache.data = models;
        cache.fetchedAt = Date.now();
        return models;
      })
      .finally(() => {
        cache.inFlight = null;
      });
  }

  return cache.inFlight;
}

// Fail-safe: returns live free model ids, or the static snapshot on failure.
export async function getAllowedFreeModelIds() {
  try {
    const models = await getFreeModels();
    if (Array.isArray(models) && models.length > 0) {
      return models.map((model) => model.id);
    }
  } catch {
    // Fall through to the safety-net snapshot.
  }
  return SAFE_FREE_MODEL_IDS;
}