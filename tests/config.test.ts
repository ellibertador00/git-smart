import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_CONFIG, loadConfig } from "../src/lib/config";

const tempDirs: string[] = [];
const originalEnv = { ...process.env };
const TEMP_ROOT = "/tmp";

const resetProviderEnv = () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_MODEL;
  delete process.env.GEMINI_MODEL;
  delete process.env.GT_PROVIDER;
};

beforeEach(() => {
  resetProviderEnv();
});

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
  process.env = { ...originalEnv };
});

describe("loadConfig", () => {
  it("respects config file overrides", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, ".gtrc.json"),
      JSON.stringify({ includeUntracked: false, pushRemote: "upstream" })
    );

    process.env.GT_PROVIDER = "mock";

    const config = await loadConfig(dir);
    expect(config.includeUntracked).toBe(false);
    expect(config.pushRemote).toBe("upstream");
    expect(config.providerConfig.name).toBe("mock");
  });

  it("falls back to defaults when no config", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    process.env.OPENAI_API_KEY = "test";
    const config = await loadConfig(dir);
    expect(config.provider).toBe(DEFAULT_CONFIG.provider);
    expect(config.providerConfig.name).toBe(DEFAULT_CONFIG.provider);
    expect(config.providerConfig.model).toBe("gpt-4o");
  });

  it("auto-detects openai when only OPENAI_API_KEY is set", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    process.env.OPENAI_API_KEY = "test";
    const config = await loadConfig(dir);
    expect(config.provider).toBe("openai");
    expect(config.providerConfig.name).toBe("openai");
    expect(config.providerConfig.model).toBe("gpt-4o");
  });

  it("auto-detects gemini when only GEMINI_API_KEY is set", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    process.env.GEMINI_API_KEY = "test";
    const config = await loadConfig(dir);
    expect(config.provider).toBe("gemini");
    expect(config.providerConfig.name).toBe("gemini");
    expect(config.providerConfig.model).toBe("gemini-3-flash-preview");
  });

  it("uses custom model from config when provider matches", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, ".gtrc.json"),
      JSON.stringify({ provider: "gemini", model: "custom-gemini" })
    );
    process.env.GEMINI_API_KEY = "abc123";
    const config = await loadConfig(dir);
    expect(config.provider).toBe("gemini");
    expect(config.providerConfig.model).toBe("custom-gemini");
  });

  it("ignores config model when provider differs", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, ".gtrc.json"),
      JSON.stringify({ provider: "openai", model: "gpt-4o-mini" })
    );
    process.env.GEMINI_API_KEY = "zzz";
    const config = await loadConfig(dir);
    expect(config.provider).toBe("gemini");
    expect(config.providerConfig.model).toBe("gemini-3-flash-preview");
  });

  it("honors GT_PROVIDER when multiple keys are present", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    process.env.OPENAI_API_KEY = "openai";
    process.env.GEMINI_API_KEY = "gemini";
    process.env.GT_PROVIDER = "Gemini";
    const config = await loadConfig(dir);
    expect(config.provider).toBe("gemini");
  });

  it("throws when both provider keys are present without GT_PROVIDER", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    process.env.OPENAI_API_KEY = "openai";
    process.env.GEMINI_API_KEY = "gemini";
    await expect(loadConfig(dir)).rejects.toThrow(
      "multiple providers detected — set GT_PROVIDER (openai | gemini)"
    );
  });

  it("throws when GT_PROVIDER is set but API key is missing", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    process.env.GT_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    await expect(loadConfig(dir)).rejects.toThrow("openai selected but OPENAI_API_KEY is not set.");
  });

  it("throws when no provider credentials exist", async () => {
    const dir = mkdtempSync(join(TEMP_ROOT, "gt-config-"));
    tempDirs.push(dir);
    await expect(loadConfig(dir)).rejects.toThrow("No AI provider configured");
  });
});
