import { describe, expect, it } from "vitest";
import { createProvider } from "../src/providers";

const baseConfig = {
  apiKey: "test",
  model: "demo",
  baseUrl: "https://example.com",
} as const;

describe("createProvider", () => {
  it("creates openai provider", () => {
    const provider = createProvider({ name: "openai", ...baseConfig });
    expect(provider.name).toBe("openai");
  });

  it("creates gemini provider", () => {
    const provider = createProvider({ name: "gemini", ...baseConfig });
    expect(provider.name).toBe("gemini");
  });

  it("creates mock provider", () => {
    const provider = createProvider({ name: "mock" });
    expect(provider.name).toBe("mock");
  });
});
