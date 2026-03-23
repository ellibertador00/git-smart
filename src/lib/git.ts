import { spawnSync } from "node:child_process";

import { CliError, GitError } from "./errors";
import { DiffSummary } from "../types";

interface GitRunOptions {
  allowFail?: boolean;
  trimStdout?: boolean;
}

export interface GitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

type GitExecutor = (args: string[]) => GitResult;

function defaultExecutor(args: string[]): GitResult {
  const result = spawnSync("git", args, { encoding: "utf-8" });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 0,
  };
}

let executor: GitExecutor = defaultExecutor;

export function __setGitExecutor(custom?: GitExecutor) {
  executor = custom ?? defaultExecutor;
}

function runGit(args: string[], options: GitRunOptions = {}): GitResult {
  const result = executor(args);
  if (result.exitCode !== 0 && !options.allowFail) {
    throw new GitError(`git ${args.join(" ")} failed`, result.stderr.trim());
  }

  return {
    ...result,
    stdout: options.trimStdout === false ? result.stdout : result.stdout.trim(),
  };
}

export function ensureRepo(): void {
  try {
    runGit(["rev-parse", "--is-inside-work-tree"]);
  } catch (error) {
    throw new CliError("Not inside a git repository", error);
  }
}

export function hasAnyChanges(): boolean {
  const result = runGit(["status", "--porcelain"], { trimStdout: false });
  return result.stdout.trim().length > 0;
}

export function stageAll(includeUntracked: boolean): void {
  const args = includeUntracked ? ["add", "--all"] : ["add", "-u"];
  runGit(args);
}

export function getStagedDiff(maxBytes: number): DiffSummary {
  const diff = runGit(["diff", "--cached", "--unified=3", "--no-color"], { trimStdout: false }).stdout;
  const limitedBytes = Math.max(maxBytes, 2000);
  if (!diff.trim()) {
    return { full: diff, limited: diff, truncated: false, omittedBytes: 0 };
  }

  if (diff.length <= limitedBytes) {
    return { full: diff, limited: diff, truncated: false, omittedBytes: 0 };
  }

  const half = Math.floor(limitedBytes / 2);
  const head = diff.slice(0, half);
  const tail = diff.slice(diff.length - half);
  const limited = `${head}\n...\n${tail}`;
  return {
    full: diff,
    limited,
    truncated: true,
    omittedBytes: diff.length - limitedBytes,
  };
}

export function getStagedFiles(): string[] {
  const result = runGit(["diff", "--cached", "--name-only"], { trimStdout: false }).stdout;
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getCurrentBranch(): string {
  try {
    return runGit(["symbolic-ref", "--short", "HEAD"]).stdout;
  } catch {
    return runGit(["rev-parse", "--abbrev-ref", "HEAD"]).stdout;
  }
}

export function commitWithMessage(message: string): void {
  runGit(["commit", "-m", message]);
}

export function hasUpstreamConfigured(): boolean {
  const result = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFail: true,
  });
  return result.exitCode === 0;
}

export function hasCommitsToPush(): boolean {
  const status = runGit(["status", "--short", "--branch"], { trimStdout: false }).stdout;
  const firstLine = status.split("\n")[0] ?? "";
  const aheadMatch = firstLine.match(/ahead (\d+)/i);
  if (!aheadMatch) {
    return false;
  }
  return Number.parseInt(aheadMatch[1], 10) > 0;
}

export function pushCurrentBranch(): GitResult {
  return runGit(["push"], { allowFail: false });
}

export function pushWithUpstream(remote: string, branch: string): GitResult {
  return runGit(["push", "-u", remote, branch], { allowFail: false });
}

export function getStatusLines(): string[] {
  const result = runGit(["status", "--short", "--branch"], { trimStdout: false }).stdout;
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
