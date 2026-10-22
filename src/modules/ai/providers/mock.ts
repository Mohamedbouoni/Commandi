// =============================================================================
// Mock Dev Provider
// =============================================================================
// Offline provider for local development when no LLM key is configured.
// Never used in production (see provider-factory.ts).
// =============================================================================

import type { ZodType } from "zod";
import type { AIProvider, ChatMessage, ProviderResult, StructuredOptions } from "../provider";
import { EMPTY_USAGE } from "../provider";

export class MockDevProvider implements AIProvider {
  readonly name = "mock-dev";

  async generateStructured<T>(
    _messages: ChatMessage[],
    schema: ZodType<T>,
    options?: StructuredOptions<T>
  ): Promise<ProviderResult<T>> {
    if (!options?.mock) {
      throw new Error("Mock provider has no sample data for this request.");
    }
    // Validate the sample too, so a stale mock fails loudly in development
    return { data: schema.parse(options.mock()), usage: EMPTY_USAGE, providerName: this.name };
  }

  async chat(): Promise<ProviderResult<string>> {
    return {
      data: "(Dev mode) Add GROQ_API_KEY or GEMINI_API_KEY to get real answers.",
      usage: EMPTY_USAGE,
      providerName: this.name,
    };
  }
}
