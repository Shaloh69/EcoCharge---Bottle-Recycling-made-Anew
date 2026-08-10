import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    setupFiles: ["./src/__tests__/setup.ts"],
    // Real HTTP + DB round-trips per test — the default unit-test timeout
    // is too tight for this suite.
    testTimeout: 20000,
  },
});
