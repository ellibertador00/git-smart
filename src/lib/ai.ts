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
  const message = sanitizeCommitMessage(raw, params);
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
  const primaryArea = describePrimaryArea(files);
  const notes: string[] = [];
  if (diff.truncated) {
    notes.push(`Diff truncated to ${diff.limited.length} bytes (omitted ${diff.omittedBytes} bytes).`);
  }
  if (hasBinaryDiff(diff.full)) {
    notes.push("Binary file content omitted. Use filenames to infer intent.");
  }

  const system = config.conventionalCommits
    ? "You are a senior engineer writing high-signal Conventional Commit messages from staged git changes."
    : "You are a senior engineer writing high-signal git commit messages from staged git changes.";

  const userSections = [
    "Write one commit message for these staged changes.",
    `Branch: ${branch}`,
    `Conventional commits: ${config.conventionalCommits ? "yes" : "no"}`,
    `Primary area: ${primaryArea}.`,
    `Files changed (${files.length}):\n${fileList}`,
    notes.length ? `Notes:\n${notes.join("\n")}` : undefined,
    `Diff:\n${redactSecrets(diff.limited)}`,
    [
      "Rules:",
      "- Return one commit message only.",
      "- Use imperative mood.",
      "- Prefer a single summary line.",
      "- Keep the subject concise; aim for 50 characters and stay under 72.",
      "- Summarize intent and outcome, not just touched files.",
      "- Mention the main module or behavior when it is clear.",
      "- If the diff suggests motivation, include that motivation briefly.",
      "- Prefer specific verbs like align, clarify, streamline, tune, cover, or document.",
      "- Avoid vague verbs like improve, enhance, refine, update, or fix by themselves.",
      "- Avoid placeholders, unfinished phrases, and clipped endings.",
      "- Avoid quotes, markdown, bullet points, file lists, and explanations.",
      config.conventionalCommits
        ? "- Follow Conventional Commits when confident: <type>(scope): subject."
        : "- Return plain commit text with no prefix labels.",
    ].join("\n"),
  ].filter(Boolean);

  return {
    system: [
      system,
      "Return exactly one line.",
      "Describe what changed and why when the diff makes the reason clear.",
      "Be specific, concise, and technically accurate.",
      "If your first draft is vague, rewrite it before responding.",
      'Good examples: "feat(config): align provider fallback defaults", "fix(push): auto stage pending changes".',
    ].join(" "),
    user: userSections.join("\n\n"),
  };
}

export function sanitizeCommitMessage(raw: string, fallbackOrParams: string | GenerateParams): string {
  const params = typeof fallbackOrParams === "string" ? undefined : fallbackOrParams;
  const fallbackMessage = typeof fallbackOrParams === "string"
    ? fallbackOrParams
    : fallbackOrParams.config.fallbackMessage;
  const conventionalCommits = params?.config.conventionalCommits ?? false;
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return fallbackMessage;
  }

  const cleaned = firstLine
    .replace(/[`"'“”]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\-\*\s]+/, "")
    .trim();

  if (!cleaned) {
    return fallbackMessage;
  }

  const singleLine = cleaned
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!singleLine) {
    return fallbackMessage;
  }

  const withoutTrailingPeriod = singleLine.length > 1 && singleLine.endsWith(".")
    ? singleLine.slice(0, -1)
    : singleLine;

  const normalizedStyle = normalizeCommitStyle(withoutTrailingPeriod, conventionalCommits);
  const improved = improveLowSignalMessage(
    normalizedStyle,
    params?.files ?? [],
    params?.diff.limited ?? "",
    conventionalCommits
  );

  if (improved.length <= MAX_COMMIT_LENGTH) {
    return improved;
  }

  return `${improved.slice(0, MAX_COMMIT_LENGTH - 3).trimEnd()}...`;
}

function describePrimaryArea(files: string[]): string {
  if (!files.length) return "general";
  const primary = files[0].toLowerCase();
  if (primary.includes("config")) return "configuration";
  if (primary.includes("doc") || primary.includes("readme")) return "documentation";
  if (primary.includes("test")) return "tests";
  if (primary.includes("provider") || primary.includes("ai")) return "AI integration";
  if (primary.includes("commands") || primary.includes("cli")) return "CLI commands";
  if (primary.includes("scripts") || primary.includes("build")) return "build tooling";
  if (primary.includes("lib") || primary.includes("core")) return "core logic";
  return "general";
}

function improveLowSignalMessage(
  message: string,
  files: string[],
  diff: string,
  conventionalCommits: boolean
): string {
  const parsed = parseConventionalMessage(message);
  const subject = parsed?.subject ?? message;
  if (!isLowSignalSubject(subject)) {
    return message;
  }

  const improvedSubject = describeChangeFromFiles(files, diff);
  if (parsed) {
    return `${parsed.type}(${parsed.scope}): ${improvedSubject}`;
  }

  if (conventionalCommits) {
    const scope = inferScope(files);
    return `refactor(${scope}): ${improvedSubject}`;
  }

  return improvedSubject;
}

function normalizeCommitStyle(message: string, conventionalCommits: boolean): string {
  if (conventionalCommits) {
    return message;
  }

  const parsed = parseConventionalMessage(message);
  if (!parsed) {
    return message;
  }

  return parsed.subject;
}

function parseConventionalMessage(message: string): { type: string; scope: string; subject: string } | null {
  const match = message.match(/^([a-z]+)\(([^)]+)\):\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    type: match[1].toLowerCase(),
    scope: match[2].toLowerCase(),
    subject: match[3].trim(),
  };
}

function isLowSignalSubject(subject: string): boolean {
  const normalized = subject.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const genericSubjects = new Set([
    "enhance",
    "refine",
    "improve",
    "update",
    "cleanup",
    "polish",
    "adjust",
    "tweak",
    "strengthen",
    "simplify",
    "fix",
    "docs",
    "rewrite",
    "rework",
    "clean",
  ]);
  const descriptiveStartWords = new Set([
    "add",
    "align",
    "clarify",
    "cover",
    "document",
    "handle",
    "prevent",
    "remove",
    "rename",
    "streamline",
    "support",
    "tune",
  ]);

  if (words.length <= 1) {
    return true;
  }

  if (words.length < 4 && !descriptiveStartWords.has(words[0])) {
    return true;
  }

  if (words.length <= 3 && genericSubjects.has(words[0])) {
    return true;
  }

  if (normalized === "system prompt" || normalized === "commit message") {
    return true;
  }

  return false;
}

function describeChangeFromFiles(files: string[], diff: string): string {
  const primary = files[0]?.toLowerCase() ?? "";

  if (primary.endsWith("src/lib/ai.ts") || primary.includes("/lib/ai")) {
    return describeAiChange(diff);
  }
  if (primary.includes("/lib/config") || primary.includes("config")) {
    return "align provider configuration defaults";
  }
  if (primary.includes("/lib/git")) {
    return "tighten git command handling";
  }
  if (primary.includes("/lib/help") || primary.includes("/help.ts")) {
    return "polish the CLI help output";
  }
  if (primary.includes("/lib/output")) {
    return "refine terminal output styling";
  }
  if (primary.includes("/index.ts")) {
    return "streamline CLI command routing";
  }
  if (primary.includes("/commands/push")) {
    return "streamline smart push behavior";
  }
  if (primary.includes("/commands/commit")) {
    return "streamline commit command flow";
  }
  if (primary.includes("/commands/status")) {
    return "tighten status command output";
  }
  if (primary.includes("/providers/openai") || primary.includes("/providers/gemini")) {
    return "tune AI provider request handling";
  }
  if (primary.includes("/providers/index")) {
    return "streamline provider selection";
  }
  if (primary.includes("/types")) {
    return "align shared CLI types";
  }
  if (primary.includes("package.json") || primary.includes("package-lock.json")) {
    return "update package metadata and tooling";
  }
  if (primary.includes("tsconfig") || primary.includes("tsup.config")) {
    return "refine TypeScript build configuration";
  }
  if (primary.includes("/scripts/")) {
    return "refine release build scripts";
  }
  if (primary.includes("readme") || primary.includes("contributing") || primary.includes("/docs/")) {
    return "polish project documentation";
  }
  if (primary.includes("license")) {
    return "update project licensing metadata";
  }
  if (primary.includes("/test") || primary.includes(".test.")) {
    return "cover the updated command behavior";
  }
  if (primary.includes("vitest.config")) {
    return "stabilize the test runner setup";
  }
  if (primary.includes(".github/workflows")) {
    return "adjust release workflow setup";
  }

  return `improve ${describePrimaryArea(files)} behavior`;
}

function describeAiChange(diff: string): string {
  const normalized = diff.toLowerCase();

  if (normalized.includes("heuristic") || normalized.includes("lowsignal") || normalized.includes("low-signal")) {
    return "expand low-signal commit heuristics";
  }
  if (normalized.includes("rules:") || normalized.includes("imperative mood") || normalized.includes("return exactly one line")) {
    return "clarify commit prompt guidance";
  }
  if (normalized.includes("sanitizecommitmessage") || normalized.includes("fallbackmessage")) {
    return "tighten commit message sanitizing";
  }
  if (normalized.includes("providerdebugenabled") || normalized.includes("logproviderdebug")) {
    return "improve provider debug output";
  }

  return "clarify commit prompt guidance";
}

function inferScope(files: string[]): string {
  const primary = files[0]?.toLowerCase() ?? "";
  if (primary.includes("/providers/")) return "provider";
  if (primary.includes("/commands/")) return "cli";
  if (primary.includes("config")) return "config";
  if (primary.includes("readme") || primary.includes("/docs/")) return "docs";
  if (primary.includes("/test") || primary.includes(".test.")) return "tests";
  if (primary.includes("/lib/ai")) return "ai";
  return "core";
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
