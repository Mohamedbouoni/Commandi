// =============================================================================
// OpenAI-Compatible AI Provider
// =============================================================================
// One implementation for every provider that speaks the OpenAI
// /chat/completions format: Groq, Google Gemini (OpenAI endpoint),
// OpenRouter, and OpenAI itself.
// =============================================================================

import type { ZodType } from "zod";
import type { AIProvider, ChatMessage, ProviderResult, TokenUsage } from "../provider";
import { EMPTY_USAGE, textOnly } from "../provider";
import { extractJson } from "../validate";
import { logger } from "@/lib/logging/logger";

export interface OpenAICompatibleConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** Send response_format: json_object. Disable for models that reject it. */
  jsonMode?: boolean;
  /** Whether the model accepts image content parts (otherwise images are dropped). */
  supportsImages?: boolean;
  extraHeaders?: Record<string, string>;
}

interface CompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

// One retry when the model returns malformed / off-schema JSON
const MAX_GENERATION_ATTEMPTS = 2;

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.name = `${config.name}:${config.model}`;
    this.config = config;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  generateStructured<T>(messages: ChatMessage[], schema: ZodType<T>): Promise<ProviderResult<T>> {
    return this.structured(messages, (text) => schema.parse(extractJson(text)));
  }

  /** Completes in JSON mode and parses, retrying once on malformed or off-schema output. */
  private async structured<T>(
    messages: ChatMessage[],
    parse: (text: string) => T
  ): Promise<ProviderResult<T>> {
    const usage: TokenUsage = { ...EMPTY_USAGE };
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      const completion = await this.complete(messages, this.config.jsonMode ?? true);
      usage.promptCount += completion.usage.promptCount;
      usage.completionCount += completion.usage.completionCount;

      try {
        const data = parse(completion.text);
        return { data, usage, providerName: this.name };
      } catch (err) {
        lastError = err;
        logger.warn("Model output failed validation", {
          provider: this.name,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    throw new Error(
      `${this.name} returned invalid output: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  async chat(messages: ChatMessage[]): Promise<ProviderResult<string>> {
    const completion = await this.complete(messages, false);
    return { data: completion.text, usage: completion.usage, providerName: this.name };
  }

  private async complete(
    messages: ChatMessage[],
    jsonMode: boolean
  ): Promise<{ text: string; usage: TokenUsage }> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...this.config.extraHeaders,
      },
      body: JSON.stringify({
        model: this.config.model,
        // Text-only models reject image parts, so flatten them to plain text
        messages: this.config.supportsImages
          ? messages
          : messages.map((m) => ({ ...m, content: textOnly(m.content) })),
        // Extraction wants faithful copies, not creativity
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 45000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`${this.name} API error (${response.status}): ${errorText.slice(0, 300)}`);
    }

    const data = (await response.json()) as CompletionResponse;
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`${this.name} returned an empty response.`);
    }

    return {
      text,
      usage: {
        promptCount: data.usage?.prompt_tokens ?? 0,
        completionCount: data.usage?.completion_tokens ?? 0,
      },
    };
  }
}
