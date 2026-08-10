// Runs before any integration test file's own imports resolve (vitest
// setupFiles semantics) — a plain top-level dotenv.config() inside the test
// file itself does NOT work here, because ESM import hoisting means
// `import prisma from "../prisma"` (which transitively triggers config.ts's
// own dotenv.config()) executes before any in-file statement regardless of
// source order. This file is the actual fix for that.
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

if (!process.env.DATABASE_URL?.includes("ecocharge_test")) {
  throw new Error(
    "Refusing to run integration tests: DATABASE_URL doesn't point at " +
      "ecocharge_test. Check server_main/.env.test exists — this guard " +
      "exists specifically to prevent ever running this suite against the " +
      "live database.",
  );
}
