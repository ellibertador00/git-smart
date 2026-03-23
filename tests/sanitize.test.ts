import { describe, expect, it } from "vitest";
import { sanitizeCommitMessage } from "../src/lib/ai";

describe("sanitizeCommitMessage", () => {
  it("strips wrapping quotes and whitespace", () => {
    const result = sanitizeCommitMessage('"feat(api): add users"', "fallback");
    expect(result).toBe("feat(api): add users");
  });

  it("falls back when message empty", () => {
    const result = sanitizeCommitMessage("   \n", "fallback");
    expect(result).toBe("fallback");
  });

  it("collapses multiline output to single line", () => {
    const result = sanitizeCommitMessage("feat: add user\n\nextra context", "fallback");
    expect(result).toBe("feat: add user");
  });

  it("truncates overly long messages", () => {
    const long = "feat: " + "x".repeat(100);
    const result = sanitizeCommitMessage(long, "fallback");
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(72);
  });
});
