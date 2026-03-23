import { loadConfig } from "../lib/config";
import {
  commitWithMessage,
  ensureRepo,
  getCurrentBranch,
  getStagedDiff,
  getStagedFiles,
  hasAnyChanges,
  stageAll,
} from "../lib/git";
import { generateCommitSuggestion } from "../lib/ai";
import { out } from "../lib/output";
import { CommitSuggestion, ResolvedConfig } from "../types";

interface AutoCommitOptions {
  silentWhenEmpty?: boolean;
  trailingNewline?: boolean;
}

export async function runCommitCommand(): Promise<void> {
  ensureRepo();
  const config = await loadConfig();
  await autoCommit(config);
}

export async function autoCommit(
  config: ResolvedConfig,
  options: AutoCommitOptions = {}
): Promise<string | null> {
  if (!hasAnyChanges()) {
    return handleEmpty(options);
  }

  out.step("staging...");
  stageAll(config.includeUntracked);

  const diff = getStagedDiff(config.maxDiffBytes);
  if (!diff.full.trim()) {
    return handleEmpty(options);
  }

  const branch = getCurrentBranch();
  const files = getStagedFiles();

  out.step("generating...");

  let suggestion: CommitSuggestion;
  try {
    suggestion = await generateCommitSuggestion({ diff, files, branch, config });
  } catch {
    out.warning("ai unavailable — using fallback");
    suggestion = {
      message: config.fallbackMessage,
      source: "fallback",
    };
  }

  console.log();
  out.preview(`✨ ${suggestion.message}`);
  out.step("commit...");
  commitWithMessage(suggestion.message);
  out.success("committed");

  if (options.trailingNewline !== false) {
    console.log();
  }

  return suggestion.message;
}

function handleEmpty(options: AutoCommitOptions): null {
  if (!options.silentWhenEmpty) {
    out.info("nothing to commit");
  }
  return null;
}
