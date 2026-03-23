import { CommitSuggestion, DiffSummary, PromptPayload, ResolvedConfig } from "../types";
import { createProvider, CommitMessageProvider } from "../providers";

const MAX_COMMIT_LENGTH = 72;
const suggestionCache = new Map<string, CommitSuggestion>();

function providerDebugEnabled(): boolean {
  return (process.env.DEBUG_GT ?? "")
    .split(",")
    .map((flag) => flag.trim().toLowerCase())
    .includes("provider");
}

function logProviderDebug(message: string): void {
  if (!providerDebugEnabled()) {
    return;
  }
  console.error(`[provider] ${message}`);
}

interface GenerateParams {
  diff: DiffSummary;
  files: string[];
  branch: string;
  config: ResolvedConfig;
  provider?: CommitMessageProvider;
}

export async function generateCommitSuggestion(params: GenerateParams): Promise<CommitSuggestion> {
  const cacheKey = buildCacheKey(params);
  const cached = suggestionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const provider = params.provider ?? createProvider(params.config.providerConfig);
  const prompt = buildPrompt(params);
  const raw = await provider.generateCommitMessage(prompt);
  logProviderDebug(`model=${params.config.providerConfig.model ?? "(none)"}`);
  logProviderDebug(`raw response: ${raw}`);
  const message = sanitizeCommitMessage(raw, params.config.fallbackMessage);
  if (message === params.config.fallbackMessage) {
    logProviderDebug("sanitized output fell back to fallback message");
  }
  const result: CommitSuggestion = {
    message,
    source: message === params.config.fallbackMessage ? "fallback" : "ai",
  };
  suggestionCache.set(cacheKey, result);
  return result;
}

function buildCacheKey({ diff, files, branch }: GenerateParams): string {
  return JSON.stringify({
    branch,
    files,
    diff: diff.limited,
  });
}

export function buildPrompt({ diff, files, branch, config }: GenerateParams): PromptPayload {
  const fileList = formatFiles(files);
  const notes: string[] = [];
  if (diff.truncated) {
    notes.push(`Diff truncated to ${diff.limited.length} bytes (omitted ${diff.omittedBytes} bytes).`);
  }
  if (hasBinaryDiff(diff.full)) {
    notes.push("Binary file content omitted. Use filenames to infer intent.");
  }

  const system = config.conventionalCommits
    ? "You are an expert engineer generating a single conventional commit message. Return exactly one line."
    : "You are an expert engineer generating a single git commit message. Return exactly one line.";

  const userSections = [
    `Branch: ${branch}`,
    `Conventional commits: ${config.conventionalCommits ? "yes" : "no"}`,
    `Files changed (${files.length}):\n${fileList}`,
    notes.length ? `Notes:\n${notes.join("\n")}` : undefined,
    `Diff:\n${redactSecrets(diff.limited)}`,
  ].filter(Boolean);

  return {
    system: `${system} Do not use quotes, markdown, commentary, or code fences. Prefer "<type>(scope): message" when confident. Keep under ${MAX_COMMIT_LENGTH} characters when possible.`,
    user: userSections.join("\n\n"),
  };
}

export function sanitizeCommitMessage(raw: string, fallback: string): string {
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return fallback;
  }

  const cleaned = firstLine
    .replace(/[`"'“”]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\-\*\s]+/, "")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const singleLine = cleaned
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!singleLine) {
    return fallback;
  }

  const withoutTrailingPeriod = singleLine.length > 1 && singleLine.endsWith(".")
    ? singleLine.slice(0, -1)
    : singleLine;

  if (withoutTrailingPeriod.length <= MAX_COMMIT_LENGTH) {
    return withoutTrailingPeriod;
  }

  return `${withoutTrailingPeriod.slice(0, MAX_COMMIT_LENGTH - 3).trimEnd()}...`;
}

function formatFiles(files: string[]): string {
  if (!files.length) return "(no filenames detected)";
  const preview = files.slice(0, 20).map((file) => `- ${file}`);
  if (files.length > 20) {
    preview.push(`- ...and ${files.length - 20} more`);
  }
  return preview.join("\n");
}

function hasBinaryDiff(diff: string): boolean {
  return /Binary files .* differ/.test(diff);
}

const SECRET_PATTERN = /(PASSWORD|SECRET|TOKEN|API_KEY|KEY|ACCESS_TOKEN)=([^\s]+)/gi;

function redactSecrets(input: string): string {
  return input.replace(SECRET_PATTERN, (_match, key) => `${key}=<redacted>`);
}
