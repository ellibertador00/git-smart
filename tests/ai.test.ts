import { beforeEach, describe, expect, it } from "vitest";

import { __clearSuggestionCache, buildPrompt, generateCommitSuggestion } from "../src/lib/ai";
import { CommitMessageProvider } from "../src/providers";
import { DiffSummary, ResolvedConfig } from "../src/types";
import { DEFAULT_CONFIG } from "../src/lib/config";

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
  beforeEach(() => {
    __clearSuggestionCache();
  });

  it("defaults to plain commit messages", () => {
    expect(DEFAULT_CONFIG.conventionalCommits).toBe(false);
  });

  it("builds a structured prompt with commit rules", () => {
    const prompt = buildPrompt({
      diff,
      files: ["src/lib/ai.ts"],
      branch: "main",
      config: baseConfig,
    });

    expect(prompt.system).toContain("Return exactly one line");
    expect(prompt.system).toContain("If your first draft is vague, rewrite it before responding.");
    expect(prompt.user).toContain("Rules:");
    expect(prompt.user).toContain("- Return one commit message only.");
    expect(prompt.user).toContain("- Use imperative mood.");
    expect(prompt.user).toContain("- Prefer specific verbs like align, clarify, streamline, tune, cover, or document.");
    expect(prompt.user).toContain("- Summarize intent and outcome, not just touched files.");
    expect(prompt.user).toContain("Diff:\n");
  });

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

  it("rewrites low-signal ai output using file context", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "feat(ai): enhance",
    };

    const suggestion = await generateCommitSuggestion({
      diff,
      files: ["src/lib/ai.ts"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe("feat(ai): clarify commit prompt guidance");
    expect(suggestion.source).toBe("ai");
  });

  it("rewrites truncated short subjects using file context", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "feat(ai): rewrite low",
    };

    const suggestion = await generateCommitSuggestion({
      diff: {
        ...diff,
        limited: "diff --git a/src/lib/ai.ts b/src/lib/ai.ts\n+function improveLowSignalMessage() {}\n+heuristic",
      },
      files: ["src/lib/ai.ts"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe("feat(ai): expand low-signal commit heuristics");
    expect(suggestion.source).toBe("ai");
  });

  it("rewrites weak ai messages based on prompt changes", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "feat(ai): refine low",
    };

    const suggestion = await generateCommitSuggestion({
      diff: {
        ...diff,
        limited: "diff --git a/src/lib/ai.ts b/src/lib/ai.ts\n+Rules:\n+- Use imperative mood.\n+Return exactly one line.",
      },
      files: ["src/lib/ai.ts"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe("feat(ai): clarify commit prompt guidance");
    expect(suggestion.source).toBe("ai");
  });

  it("rewrites weak push messages using command context", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "fix(push): improve",
    };

    const suggestion = await generateCommitSuggestion({
      diff,
      files: ["src/commands/push.ts"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe("fix(push): streamline smart push behavior");
    expect(suggestion.source).toBe("ai");
  });

  it("rewrites weak docs messages using file context", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "docs(readme): update",
    };

    const suggestion = await generateCommitSuggestion({
      diff,
      files: ["README.md"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe("docs(readme): polish project documentation");
    expect(suggestion.source).toBe("ai");
  });

  it("keeps descriptive ai output unchanged", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "fix(push): auto stage pending changes before push",
    };

    const suggestion = await generateCommitSuggestion({
      diff,
      files: ["src/commands/push.ts"],
      branch: "main",
      config: baseConfig,
      provider,
    });

    expect(suggestion.message).toBe("fix(push): auto stage pending changes before push");
    expect(suggestion.source).toBe("ai");
  });

  it("strips conventional prefixes in plain mode", async () => {
    const provider: CommitMessageProvider = {
      name: "openai",
      generateCommitMessage: async () => "feat(ai): expand low-signal commit heuristics",
    };

    const suggestion = await generateCommitSuggestion({
      diff,
      files: ["src/lib/ai.ts"],
      branch: "main",
      config: {
        ...baseConfig,
        conventionalCommits: false,
      },
      provider,
    });

    expect(suggestion.message).toBe("expand low-signal commit heuristics");
    expect(suggestion.source).toBe("ai");
  });
});
