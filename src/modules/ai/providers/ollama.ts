// =============================================================================
// Local Ollama AI Provider
// =============================================================================

import type { ZodType } from "zod";
import type { AIProvider, ChatMessage, ProviderResult } from "../provider";
import { textOnly } from "../provider";
import { extractJson } from "../validate";

interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  readonly name: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.1";
    this.name = `ollama:${this.model}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  chat(messages: ChatMessage[]): Promise<ProviderResult<string>> {
    return this.request(messages, false);
  }

  async generateStructured<T>(messages: ChatMessage[], schema: ZodType<T>): Promise<ProviderResult<T>> {
    const result = await this.request(messages, true);
    return { ...result, data: schema.parse(extractJson(result.data)) };
  }

  private async request(
    messages: ChatMessage[],
    jsonMode: boolean
  ): Promise<ProviderResult<string>> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ ...m, content: textOnly(m.content) })),
        stream: false,
        ...(jsonMode ? { format: "json" } : {}),
        options: { temperature: 0.2, top_p: 0.9 },
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout for local inference
    }).catch((err: unknown) => {
      throw new Error(
        `Ollama is not reachable at ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const text = data.message?.content;
    if (!text) {
      throw new Error("Ollama returned an empty response.");
    }

    return {
      data: text,
      usage: {
        promptCount: data.prompt_eval_count ?? 0,
        completionCount: data.eval_count ?? 0,
      },
      providerName: this.name,
    };
  }
}
