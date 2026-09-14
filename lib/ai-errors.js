// Shared error classification for AI provider (OpenRouter) errors.
// Used by both the API route and server actions so users always see
// actionable, human-readable messages instead of raw SDK errors.

/**
 * Classify an error thrown by the AI SDK / OpenRouter provider into a
 * user-friendly object: { status, message, code }.
 *
 * @param {unknown} error
 * @returns {{ status: number, message: string, code: string }}
 */
export function classifyAiError(error) {
  const raw = extractRaw(error);

  // --- HTTP-level errors surfaced by the SDK ---------------------------
  if (raw.status === 404 || /not\s*found/i.test(raw.message)) {
    return {
      status: 404,
      message:
        "This model is currently unavailable on OpenRouter. Try a different model.",
      code: "MODEL_NOT_FOUND",
    };
  }

  if (raw.status === 402 || /insufficient.*credits/i.test(raw.message)) {
    return {
      status: 402,
      message:
        "This model requires credits on OpenRouter. Choose a free model instead.",
      code: "INSUFFICIENT_CREDITS",
    };
  }

  if (raw.status === 429 || /rate.?limit/i.test(raw.message)) {
    return {
      status: 429,
      message: "Too many requests. Please wait a moment and try again.",
      code: "RATE_LIMITED",
    };
  }

  if (raw.status === 403 || /content.?policy|moderation|safety/i.test(raw.message)) {
    return {
      status: 403,
      message:
        "Your message was blocked by the model's content policy. Try rephrasing.",
      code: "CONTENT_POLICY",
    };
  }

  if (raw.status === 400 && /invalid|malformed|bad\s*request/i.test(raw.message)) {
    return {
      status: 400,
      message:
        "The request was rejected by the model. Try a shorter or simpler message.",
      code: "BAD_REQUEST",
    };
  }

  // --- Network / timeout errors ----------------------------------------
  if (
    /timeout|abort|ECONNREFUSED|ENOTFOUND|fetch failed|network/i.test(
      raw.message,
    )
  ) {
    return {
      status: 503,
      message:
        "Could not reach the AI provider. Check your connection and try again.",
      code: "NETWORK_ERROR",
    };
  }

  // --- Model-specific incompatibilities (e.g. vision model + text-only) -
  if (/modalit|image|vision|unsupported.*content/i.test(raw.message)) {
    return {
      status: 422,
      message:
        "This model does not support the current input format. Try a different model.",
      code: "UNSUPPORTED_MODALITY",
    };
  }

  // --- Fallback --------------------------------------------------------
  return {
    status: 500,
    message: raw.message || "Something went wrong with the AI. Please try again.",
    code: "UNKNOWN",
  };
}

/** Safely extract a message + status from an unknown thrown value. */
function extractRaw(err) {
  if (err && typeof err === "object") {
    // AI SDK HTTPError / APICallError shape
    const status =
      err.status ??
      err.statusCode ??
      err.response?.status ??
      err.cause?.status ??
      undefined;

    const message =
      err.message ??
      err.error?.message ??
      err.cause?.message ??
      String(err);

    return { status, message };
  }

  return { status: undefined, message: String(err) };
}
