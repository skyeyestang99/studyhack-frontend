import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

const frontendDir = path.resolve(__dirname, "..");

describe("Build smoke tests", () => {
  it("TypeScript compiles without errors", () => {
    expect(() => {
      execSync("npx tsc --noEmit", {
        cwd: frontendDir,
        timeout: 60_000,
        stdio: "pipe",
      });
    }).not.toThrow();
  });

  it("remark-math is importable", async () => {
    const mod = await import("remark-math");
    expect(mod.default).toBeDefined();
  });

  it("rehype-katex is importable", async () => {
    const mod = await import("rehype-katex");
    expect(mod.default).toBeDefined();
  });

  it("react-markdown is importable", async () => {
    const mod = await import("react-markdown");
    expect(mod.default).toBeDefined();
  });
});
