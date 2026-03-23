export type ProviderName = "openai" | "gemini" | "mock";

export interface AppConfig {
  provider: ProviderName;
  model?: string;
  conventionalCommits: boolean;
  maxDiffBytes: number;
  includeUntracked: boolean;
  fallbackMessage: string;
  pushRemote: string;
}

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface ResolvedConfig extends AppConfig {
  providerConfig: ProviderConfig;
}

export interface RepoContext {
  branch: string;
  files: string[];
}

export interface DiffSummary {
  full: string;
  limited: string;
  truncated: boolean;
  omittedBytes: number;
}

export interface CommitSuggestion {
  message: string;
  source: "ai" | "fallback";
  note?: string;
}

export interface PromptPayload {
  system: string;
  user: string;
}

export interface CommitMessageInput {
  diff: DiffSummary;
  files: string[];
  branch: string;
  conventionalCommits: boolean;
}
