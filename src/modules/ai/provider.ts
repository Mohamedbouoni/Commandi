// =============================================================================
// AI Provider Interface
// =============================================================================
// All AI providers must implement this interface. This abstraction allows
// switching between free hosted providers (Groq, Gemini, OpenRouter), Ollama
// (local dev) and paid providers without changing application code.
// =============================================================================

import type { ZodType } from "zod";

export interface TokenUsage {
  promptCount: number;
  completionCount: number;
}

export interface ProviderResult<T> {
  data: T;
  usage: TokenUsage;
  /** Name of the provider that actually served the request. */
  providerName: string;
}

/** OpenAI-style multimodal content; image URLs may be base64 data URLs. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

/** Plain-text version of a message, for providers that cannot see images. */
export function textOnly(content: ChatMessage["content"]): string {
  return typeof content === "string"
    ? content
    : content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
}

export interface StructuredOptions<T> {
  /** Offline sample result, used by the mock provider in development. */
  mock?: () => T;
}

export interface AIProvider {
  readonly name: string;

  /** Free-form conversation. */
  chat(messages: ChatMessage[]): Promise<ProviderResult<string>>;

  /** JSON output validated against any Zod schema (one retry on invalid output). */
  generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodType<T>,
    options?: StructuredOptions<T>
  ): Promise<ProviderResult<T>>;

  /**
   * Optional health check — verifies the provider is reachable.
   */
  healthCheck?(): Promise<boolean>;
}

export const EMPTY_USAGE: TokenUsage = { promptCount: 0, completionCount: 0 };
