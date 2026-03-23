import { loadConfig } from "../lib/config";
import {
  ensureRepo,
  getCurrentBranch,
  hasCommitsToPush,
  hasUpstreamConfigured,
  pushCurrentBranch,
  pushWithUpstream,
} from "../lib/git";
import { out } from "../lib/output";
import { CliError, GitError } from "../lib/errors";
import { autoCommit } from "./commit";

export async function runPushCommand(): Promise<void> {
  ensureRepo();
  const config = await loadConfig();
  const branch = getCurrentBranch();
  if (branch === "HEAD") {
    throw new CliError("Cannot push while HEAD is detached. Check out a branch first.");
  }
  const remote = config.pushRemote || "origin";

  const committed = await autoCommit(config, { silentWhenEmpty: true, trailingNewline: false });
  const hasUpstream = hasUpstreamConfigured();
  const aheadOfRemote = hasUpstream ? hasCommitsToPush() : false;
  const needsPush = Boolean(committed) || !hasUpstream || aheadOfRemote;

  if (!needsPush) {
    out.info("nothing to push");
    return;
  }

  out.step(`pushing ${branch} → ${remote}`);

  try {
    if (hasUpstream) {
      pushCurrentBranch();
    } else {
      out.step("setting upstream...");
      pushWithUpstream(remote, branch);
    }
  } catch (error) {
    if (error instanceof GitError) {
      throw new GitError(formatPushError(error.stderr), error.stderr);
    }
    throw error;
  }

  out.success("pushed");
}

function formatPushError(stderr?: string): string {
  const trimmed = (stderr ?? "").trim();
  if (!trimmed) {
    return "Push failed.";
  }
  if (/Permission denied|Authentication failed|fatal: Authentication/i.test(trimmed)) {
    return `auth failed\n${trimmed}\nCheck SSH keys or credentials and retry.`;
  }
  if (/non-fast-forward|rejected/i.test(trimmed)) {
    return `rejected, pull first\n${trimmed}\nPull or rebase before pushing again.`;
  }
  return `push failed\n${trimmed}`;
}
