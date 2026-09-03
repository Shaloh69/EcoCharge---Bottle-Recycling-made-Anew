import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    setupFiles: ["./src/__tests__/setup.ts"],
    // Real HTTP + DB round-trips per test — the default unit-test timeout is
    // far too tight for this suite. Raised from 20s to 120s on 2026-09-03: the
    // happy-path test takes ~30s on its own (it walks register -> deposit ->
    // telemetry -> charge -> completion against a real database), so it failed
    // on a timeout rather than on a defect. A suite that fails spuriously stops
    // being read, which is worse than a slow one.
    testTimeout: 120000,
  },
});
