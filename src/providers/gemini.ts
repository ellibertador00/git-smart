import { ProviderError } from "../lib/errors";
import { PromptPayload, ProviderConfig } from "../types";
import { CommitMessageProvider, ProviderGenerateOptions } from "./index";

export class GeminiProvider implements CommitMessageProvider {
  readonly name = "gemini";

  constructor(private readonly config: ProviderConfig) {}

  async generateCommitMessage(prompt: PromptPayload, options?: ProviderGenerateOptions): Promise<string> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new ProviderError("Gemini API key is not configured");
    }

    const baseUrl = (this.config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const model = this.config.model;
    if (!model) {
      throw new ProviderError("Gemini model is not configured");
    }
    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt.user }] }],
        systemInstruction: { parts: [{ text: prompt.system }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 120,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ProviderError(`Gemini request failed: ${errorBody}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      throw new ProviderError("Gemini returned an empty response");
    }

    const trimmed = text.trim();
    options?.onToken?.(trimmed);
    return trimmed;
  }
}
