import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/lib/args";

describe("parseArgs", () => {
  it("returns help when no args", () => {
    const parsed = parseArgs([]);
    expect(parsed.command).toBe("help");
  });

  it("maps aliases", () => {
    expect(parseArgs(["c"]).command).toBe("commit");
    expect(parseArgs(["p"]).command).toBe("push");
    expect(parseArgs(["s"]).command).toBe("status");
    expect(parseArgs(["h"]).command).toBe("help");
  });

  it("detects help flag", () => {
    const parsed = parseArgs(["c", "--help"]);
    expect(parsed.command).toBe("help");
  });

  it("marks unknown commands", () => {
    const parsed = parseArgs(["unknown"]);
    expect(parsed.command).toBe("unknown");
  });
});
