import { describe, expect, it } from "vitest";

import { generateCommitSuggestion } from "../src/lib/ai";
import { CommitMessageProvider } from "../src/providers";
import { DiffSummary, ResolvedConfig } from "../src/types";

const diff: DiffSummary = {
  full: "diff --git a/file b/file\n+line",
  limited: "diff --git a/file b/file\n+line",
  truncated: false,
  omittedBytes: 0,
};

const baseConfig: ResolvedConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  conventionalCommits: true,
  maxDiffBytes: 120000,
  includeUntracked: true,
  fallbackMessage: "chore: fallback",
  pushRemote: "origin",
  providerConfig: {
    name: "openai",
    apiKey: "test",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
  },
};

describe("generateCommitSuggestion", () => {
  it("uses fallback when provider returns empty text", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "   ",
    };

    const suggestion = await generateCommitSuggestion({
      diff,
      files: ["src/index.ts"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe(baseConfig.fallbackMessage);
    expect(suggestion.source).toBe("fallback");
  });
});
