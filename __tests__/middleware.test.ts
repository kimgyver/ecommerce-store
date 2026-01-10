import { describe, it, expect } from "vitest";
import { normalizeHost } from "@/app/middleware";

describe("normalizeHost", () => {
  it("strips port and lowercases host", () => {
    expect(normalizeHost("Example.COM:3000")).toBe("example.com");
  });

  it("handles empty host gracefully", () => {
    expect(normalizeHost("")).toBe("");
  });
});
