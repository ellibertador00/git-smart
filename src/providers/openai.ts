import { ProviderError } from "../lib/errors";
import { PromptPayload, ProviderConfig } from "../types";
import { CommitMessageProvider, ProviderGenerateOptions } from "./index";

export class OpenAIProvider implements CommitMessageProvider {
  readonly name = "openai";

  constructor(private readonly config: ProviderConfig) {}

  async generateCommitMessage(prompt: PromptPayload, options?: ProviderGenerateOptions): Promise<string> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new ProviderError("OpenAI API key is not configured");
    }

    const baseUrl = (this.config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const url = `${baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.4,
        max_tokens: 200,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new ProviderError(`OpenAI request failed: ${errorBody}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    if (!message || typeof message !== "string") {
      throw new ProviderError("OpenAI returned an empty response");
    }

    const trimmed = message.trim();
    options?.onToken?.(trimmed);
    return trimmed;
  }
}

async function safeJson(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return JSON.stringify(payload);
  } catch {
    return response.statusText;
  }
}
