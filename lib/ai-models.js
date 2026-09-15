// Default model + static fallback catalog.
//
// ⚠️  The default model MUST be one verified to work reliably — see
// lib/free-models.mjs SAFE_FREE_MODEL_IDS for the full verified list with
// test results. The /api/chat route also uses this list as an automatic
// fallback chain when a requested model errors or hangs.
const fallbackModelId =
  process.env.OPENROUTER_DEFAULT_MODEL ?? "liquid/lfm-2.5-2.6b:free";

const MODEL_NAMES = {
  "liquid/lfm-2.5-2.6b:free": "LFM 2.5 2.6B",
  "nvidia/nemotron-3-super-120b-a12b:free": "Nemotron Super 120B",
  "nvidia/nemotron-3.5-lightning:free": "Nemotron Lightning",
  "google/gemma-4-26b-a4b-it:free": "Gemma 4 26B",
  "inclusionai/ling-3.0-flash-fin:free": "Ling 3.0 Flash (FIN)",
  "inclusionai/ling-3.0-flash-sante:free": "Ling 3.0 Flash (Santé)",
  "poolside/laguna-xs-2.1:free": "Laguna XS 2.1",
  "nvidia/nemotron-3.5-content-safety:free": "Nemotron Content Safety",
  "nex-agi/nex-n2.5-pro:free": "Nex N2.5 Pro",
  "inclusionai/ling-3.0-flash-vl:free": "Ling 3.0 Flash VL",
  "dots-studio/dots-3-note-preview:free": "Dots 3",
  "cohere/north-mini-code:free": "Cohere North Mini Code",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": "Nemotron Nano Omni 30B",
};

// Static snapshot of the verified free, text-chat-usable models. Used ONLY
// when the live OpenRouter catalog is unreachable so the model picker and
// chat keep working. Kept in sync with SAFE_FREE_MODEL_IDS in free-models.mjs.
const STATIC_MODEL_IDS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  fallbackModelId,
  "nvidia/nemotron-3.5-lightning:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "google/gemma-4-26b-a4b-it:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3.5-content-safety:free",
  "nex-agi/nex-n2.5-pro:free",
  "inclusionai/ling-3.0-flash-vl:free",
  "dots-studio/dots-3-note-preview:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

export const FALLBACK_MODELS = STATIC_MODEL_IDS.map((id) => ({
  id,
  name: MODEL_NAMES[id] ?? id,
  description:
    "Fallback free model used when the live OpenRouter catalog is unavailable.",
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
}));

export const DEFAULT_MODEL_ID = fallbackModelId;