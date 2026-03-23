import { ProviderError } from "../lib/errors";
import { PromptPayload, ProviderConfig, ProviderName } from "../types";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";

export interface ProviderGenerateOptions {
  onToken?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface CommitMessageProvider {
  name: ProviderName;
  generateCommitMessage(prompt: PromptPayload, options?: ProviderGenerateOptions): Promise<string>;
}

export function createProvider(config: ProviderConfig): CommitMessageProvider {
  switch (config.name) {
    case "openai":
      return new OpenAIProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    case "mock":
      return new MockProvider();
    default:
      throw new ProviderError(`Unsupported provider: ${config.name}`);
  }
}
