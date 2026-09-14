const fallbackModelId =
  process.env.OPENROUTER_DEFAULT_MODEL ?? "nex-agi/nex-n2.5-mini:free";

const DEFAULT_MODEL_NAME = {
  "openrouter/free": "OpenRouter Free",
  "openrouter/auto": "OpenRouter Auto",
  "nex-agi/nex-n2.5-mini:free": "Nex N2.5 Mini",
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
