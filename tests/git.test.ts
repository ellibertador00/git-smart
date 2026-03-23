import { afterEach, describe, expect, it } from "vitest";
import { __setGitExecutor, getStagedDiff, hasUpstreamConfigured } from "../src/lib/git";

afterEach(() => {
  __setGitExecutor();
});

describe("git helpers", () => {
  it("truncates large diffs", () => {
    const largeDiff = "a".repeat(5000);
    __setGitExecutor((args) => {
      if (args[0] === "diff") {
        return { stdout: largeDiff, stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const summary = getStagedDiff(1000);
    expect(summary.truncated).toBe(true);
    expect(summary.limited.length).toBeLessThan(largeDiff.length);
  });

  it("detects missing upstream", () => {
    __setGitExecutor((args) => {
      if (args[0] === "rev-parse") {
        return { stdout: "", stderr: "", exitCode: 1 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    expect(hasUpstreamConfigured()).toBe(false);
  });
});
