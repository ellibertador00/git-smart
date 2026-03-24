import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { AppConfig, ProviderConfig, ProviderName, ResolvedConfig } from "../types";
import { ConfigError } from "./errors";

const CONFIG_FILES = [".gtrc.json", "gt.config.json"] as const;
const MULTI_PROVIDER_ERROR = "multiple providers detected — set GT_PROVIDER (openai | gemini)";
const PROVIDER_KEYS: Record<Exclude<ProviderName, "mock">, string> = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};
const GEMINI_FALLBACK_MODEL = "gemini-3-flash-preview";
const OPENAI_FALLBACK_MODEL = "gpt-4o";

export const DEFAULT_CONFIG: AppConfig = {
  provider: "openai",
  conventionalCommits: false,
  maxDiffBytes: 120_000,
  includeUntracked: true,
  fallbackMessage: "update project files",
  pushRemote: "origin",
};

export async function loadConfig(cwd: string = process.cwd()): Promise<ResolvedConfig> {
  await loadEnvFiles(cwd);
  const fileConfig = await readConfigFile(cwd);
  const merged: AppConfig = { ...DEFAULT_CONFIG, ...fileConfig };
  const provider = resolveProvider(merged);
  const providerConfig = resolveProviderConfig(provider, merged);
  return { ...merged, provider, providerConfig };
}

async function loadEnvFiles(cwd: string): Promise<void> {
  const shellEnvKeys = new Set(Object.keys(process.env));
  const path = join(cwd, ".env");
  if (!existsSync(path)) return;

  const text = await readFile(path, "utf-8");
  const parsed = parseEnvFile(text);

  for (const [key, value] of Object.entries(parsed)) {
    if (shellEnvKeys.has(key)) continue;
    process.env[key] = value;
  }
}

async function readConfigFile(cwd: string): Promise<Partial<AppConfig>> {
  for (const file of CONFIG_FILES) {
    const path = join(cwd, file);
    if (!existsSync(path)) continue;
    try {
      const text = await readFile(path, "utf-8");
      return JSON.parse(text);
    } catch (error) {
      throw new ConfigError(`Failed to parse ${file}`, error);
    }
  }
  return {};
}

function resolveProvider(config: AppConfig): ProviderName {
  const envSelection = normalizeProvider(process.env.GT_PROVIDER);
  if (envSelection) {
    ensureApiKey(envSelection);
    return envSelection;
  }

  if (config.provider === "mock") {
    return "mock";
  }

  const detected = detectProvidersFromEnv();
  if (detected.length === 1) {
    ensureApiKey(detected[0]);
    return detected[0];
  }

  if (detected.length > 1) {
    throw new ConfigError(MULTI_PROVIDER_ERROR);
  }

  throw new ConfigError("No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.");
}

function detectProvidersFromEnv(): ProviderName[] {
  return (Object.entries(PROVIDER_KEYS) as [Exclude<ProviderName, "mock">, string][])
    .filter(([, key]) => Boolean(process.env[key]))
    .map(([provider]) => provider);
}

function normalizeProvider(value?: string | null): ProviderName | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "openai" || normalized === "gemini" || normalized === "mock") {
    return normalized;
  }
  throw new ConfigError(`Unsupported provider "${value}". Use openai, gemini, or mock.`);
}

function ensureApiKey(provider: ProviderName): void {
  if (provider === "mock") {
    return;
  }

  const keyName = PROVIDER_KEYS[provider];
  if (!process.env[keyName]) {
    throw new ConfigError(`${provider} selected but ${keyName} is not set.`);
  }
}

function resolveProviderConfig(provider: ProviderName, config: AppConfig): ProviderConfig {
  if (provider === "mock") {
    return {
      name: "mock",
      model: config.model,
    };
  }

  if (provider === "gemini") {
    const geminiModel =
      process.env.GEMINI_MODEL ?? getConfigModelForProvider("gemini", config) ?? GEMINI_FALLBACK_MODEL;
    return {
      name: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: process.env.GEMINI_BASE_URL,
      model: geminiModel,
    };
  }

  const openaiModel =
    process.env.OPENAI_MODEL ?? getConfigModelForProvider("openai", config) ?? OPENAI_FALLBACK_MODEL;
  return {
    name: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: openaiModel,
  };
}

function getConfigModelForProvider(provider: ProviderName, config: AppConfig): string | undefined {
  return config.provider === provider ? config.model : undefined;
}

function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equals = line.indexOf("=");
    if (equals <= 0) continue;

    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}
