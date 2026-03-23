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
const PROVIDER_DEFAULT_MODELS: Record<Exclude<ProviderName, "mock">, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-pro",
};

export const DEFAULT_CONFIG: AppConfig = {
  provider: "openai",
  model: PROVIDER_DEFAULT_MODELS.openai,
  conventionalCommits: true,
  maxDiffBytes: 120_000,
  includeUntracked: true,
  fallbackMessage: "chore: update project files",
  pushRemote: "origin",
};

export async function loadConfig(cwd: string = process.cwd()): Promise<ResolvedConfig> {
  const fileConfig = await readConfigFile(cwd);
  const merged: AppConfig = { ...DEFAULT_CONFIG, ...fileConfig };
  const provider = resolveProvider(merged);
  const providerConfig = resolveProviderConfig(provider, merged);
  return { ...merged, provider, providerConfig };
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
    return {
      name: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: process.env.GEMINI_BASE_URL,
      model: resolveModel("gemini", config, process.env.GEMINI_MODEL),
    };
  }

  return {
    name: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: resolveModel("openai", config, process.env.OPENAI_MODEL),
  };
}

function resolveModel(
  provider: Exclude<ProviderName, "mock">,
  config: AppConfig,
  envOverride?: string
): string {
  if (envOverride) {
    return envOverride;
  }
  if (config.provider === provider && config.model) {
    return config.model;
  }
  return PROVIDER_DEFAULT_MODELS[provider];
}
