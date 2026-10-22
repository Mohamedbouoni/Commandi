// =============================================================================
// Fallback AI Provider
// =============================================================================
// Free tiers have tight per-minute/per-day limits, so one provider being
// rate-limited (429), down (5xx), slow (timeout) or returning bad JSON is
// expected. Try each configured provider in order until one succeeds.
// =============================================================================

import type { ZodType } from "zod";
import type { AIProvider, ChatMessage, ProviderResult, StructuredOptions } from "../provider";
import { logger } from "@/lib/logging/logger";

export class FallbackProvider implements AIProvider {
  readonly name: string;
  private readonly providers: AIProvider[];

  constructor(providers: AIProvider[]) {
    if (providers.length === 0) {
      throw new Error("FallbackProvider needs at least one provider.");
    }
    this.providers = providers;
    this.name = `fallback(${providers.map((p) => p.name).join(" > ")})`;
  }

  chat(messages: ChatMessage[]): Promise<ProviderResult<string>> {
    return this.tryEach((provider) => provider.chat(messages));
  }

  generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodType<T>,
    options?: StructuredOptions<T>
  ): Promise<ProviderResult<T>> {
    return this.tryEach((provider) => provider.generateStructured(messages, schema, options));
  }

  private async tryEach<T>(
    call: (provider: AIProvider) => Promise<ProviderResult<T>>
  ): Promise<ProviderResult<T>> {
    const failures: string[] = [];

    for (const provider of this.providers) {
      try {
        const result = await call(provider);
        if (failures.length > 0) {
          logger.info("AI request served by fallback provider", {
            provider: result.providerName,
            skipped: failures.length,
          });
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${provider.name}: ${message}`);
        logger.warn("AI provider failed, trying next", { provider: provider.name, error: message });
      }
    }

    throw new Error(`All AI providers failed. ${failures.join(" | ")}`);
  }
}
