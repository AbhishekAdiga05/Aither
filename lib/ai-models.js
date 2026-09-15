// The default model used when no model is specified by the client.
// ⚠️  Must be a model verified to work reliably — see lib/free-models.mjs
// SAFE_FREE_MODEL_IDS for the full verified list with test results.
const fallbackModelId =
  process.env.OPENROUTER_DEFAULT_MODEL ?? "liquid/lfm-2.5-2.6b:free";

const DEFAULT_MODEL_NAME = {
  "liquid/lfm-2.5-2.6b:free": "LFM 2.5 2.6B",
  "nvidia/nemotron-3-super-120b-a12b:free": "Nemotron Super 120B",
  "nvidia/nemotron-3.5-lightning:free": "Nemotron Lightning",
  "google/gemma-4-26b-a4b-it:free": "Gemma 4 26B",
};

export const FALLBACK_MODELS = [
  {
    id: fallbackModelId,
    name: DEFAULT_MODEL_NAME[fallbackModelId] ?? fallbackModelId,
    description:
      "Fallback model used when the live OpenRouter catalog is unavailable.",
    context_length: 128000,
    architecture: {
      modality: "text->text",
      tokenizer: "unknown",
      input_modalities: ["text"],
      output_modalities: ["text"],
    },
    pricing: {
      prompt: "0",
      completion: "0",
      request: "0",
    },
    top_provider: {
      is_moderated: false,
      max_completion_tokens: 4096,
    },
  },
];

export const DEFAULT_MODEL_ID = FALLBACK_MODELS[0].id;
