import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

const frontendDir = path.resolve(__dirname, "..");

describe("Build smoke tests", () => {
  // The execSync call already allowed 60s, but vitest's own 5s default was the
  // real limit. A full typecheck now takes ~9s as the project has grown, so this
  // was failing on duration rather than on a type error.
  it(
    "TypeScript compiles without errors",
    () => {
      expect(() => {
        execSync("npx tsc --noEmit", {
          cwd: frontendDir,
          timeout: 60_000,
          stdio: "pipe",
        });
      }).not.toThrow();
    },
    90_000,
  );

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
