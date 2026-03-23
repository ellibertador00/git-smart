import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { runCommitCommand } from "../../src/commands/commit";

const TEMP_ROOT = "/tmp";
const repoRoot = () => mkdtempSync(join(TEMP_ROOT, "gt-it-"));

describe("integration: commit flow", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(() => {
    cwd = repoRoot();
    originalCwd = process.cwd();
    process.chdir(cwd);

    exec("git", ["init"]);
    exec("git", ["config", "user.name", "Test User"]);
    exec("git", ["config", "user.email", "test@example.com"]);

    writeFileSync(
      join(cwd, ".gtrc.json"),
      JSON.stringify(
        {
          provider: "mock",
          model: "mock",
          conventionalCommits: true,
          maxDiffBytes: 120000,
          includeUntracked: true,
          fallbackMessage: "chore: fallback",
          pushRemote: "origin",
        },
        null,
        2
      )
    );
  });

  afterEach(() => {
    if (originalCwd) {
      process.chdir(originalCwd);
    }
    if (cwd) {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("commits staged changes using mock provider", async () => {
    writeFileSync(join(cwd, "README.md"), "hello world\n");
    await runCommitCommand();
    const log = exec("git", ["log", "-1", "--pretty=%s"]);
    expect(log.trim().length).toBeGreaterThan(0);
  });
});

function exec(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { cwd: process.cwd(), encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}\n${result.stderr ?? ""}`);
  }
  return result.stdout ?? "";
}
