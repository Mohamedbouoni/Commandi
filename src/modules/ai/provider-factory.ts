// =============================================================================
// AI Provider Factory
// =============================================================================
// Builds a fallback chain of free hosted LLMs from whichever keys are set:
//   Groq        — fastest, generous free tier (Llama models)
//   Gemini      — best Arabic quality on the free tier (OpenAI-compatible API)
//   OpenRouter  — ":free" community models as a last free resort
//   OpenAI      — optional paid fallback
// Free-plan users get the small/fast model tier to stay inside free quotas;
// paid plans get the larger "quality" models.
// =============================================================================

import type { AIProvider } from "./provider";
import { FallbackProvider } from "./providers/fallback";
import { MockDevProvider } from "./providers/mock";
import { OllamaProvider } from "./providers/ollama";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

export type ModelTier = "fast" | "quality";

export interface ProviderOptions {
  tier: ModelTier;
  /** "auto" when the language is unknown (e.g. a pasted chat). */
  language: "en" | "ar" | "auto";
  /** Prefer providers that can see images (screenshots). */
  needsImages?: boolean;
}

export class AIConfigurationError extends Error {
  constructor() {
    super(
      "No AI provider is configured. Set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY."
    );
    this.name = "AIConfigurationError";
  }
}

type ProviderKey = "groq" | "gemini" | "openrouter" | "openai";

function pickModel(tier: ModelTier, fastEnv: string, qualityEnv: string, fastDefault: string, qualityDefault: string) {
  return tier === "fast"
    ? process.env[fastEnv] || fastDefault
    : process.env[qualityEnv] || qualityDefault;
}

function buildProvider(key: ProviderKey, tier: ModelTier): AIProvider | null {
  switch (key) {
    case "groq": {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return null;
      return new OpenAICompatibleProvider({
        name: "groq",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey,
        model: pickModel(tier, "GROQ_MODEL_FAST", "GROQ_MODEL_QUALITY", "llama-3.1-8b-instant", "llama-3.3-70b-versatile"),
        timeoutMs: 30000,
      });
    }
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      return new OpenAICompatibleProvider({
        name: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey,
        model: pickModel(tier, "GEMINI_MODEL_FAST", "GEMINI_MODEL_QUALITY", "gemini-flash-lite-latest", "gemini-flash-latest"),
        timeoutMs: 45000,
        supportsImages: true,
      });
    }
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return null;
      return new OpenAICompatibleProvider({
        name: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey,
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        timeoutMs: 60000,
        // Not every free model supports response_format; validate.ts copes with plain text JSON
        jsonMode: false,
        extraHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Commandi",
        },
      });
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null;
      return new OpenAICompatibleProvider({
        name: "openai",
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        apiKey,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        supportsImages: true,
      });
    }
  }
}

export function getAIProvider(options: ProviderOptions): AIProvider {
  // Explicit local mode for offline development
  if (process.env.AI_PROVIDER?.toLowerCase() === "ollama") {
    return new OllamaProvider();
  }

  // Gemini first for Arabic and for images (it sees screenshots, Groq Llama does not),
  // Groq first otherwise (fastest)
  const order: ProviderKey[] =
    options.language === "ar" || options.needsImages
      ? ["gemini", "groq", "openrouter", "openai"]
      : ["groq", "gemini", "openrouter", "openai"];

  const providers = order
    .map((key) => buildProvider(key, options.tier))
    .filter((p): p is AIProvider => p !== null);

  const [first, ...rest] = providers;
  if (!first) {
    if (process.env.NODE_ENV === "development") {
      return new MockDevProvider();
    }
    throw new AIConfigurationError();
  }

  return rest.length === 0 ? first : new FallbackProvider(providers);
}
