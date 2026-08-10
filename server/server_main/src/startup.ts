import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

import { log } from "./logger";

const execAsync = promisify(exec);

// ── Auto-migrate ───────────────────────────────────────────────────────────────
export async function runMigrations() {
  log.migration("Connecting to database…");

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const { stdout, stderr } = await execAsync("npx prisma migrate deploy");
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      log.migration("All migrations applied ✔");
      return;
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const combined = (e.stdout ?? "") + (e.stderr ?? "") + (e.message ?? "");

      // P3009 — previous deploy left a failed migration record.
      // Roll it back first (clears the failure), then mark it applied.
      if (combined.includes("P3009")) {
        const match = combined.match(
          /The `(\S+)` migration started at .+ failed/,
        );
        if (match) {
          const name = match[1];
          log.migration(`Failed record found: "${name}" (P3009)`);
          log.migration(
            "Clearing failure → rolling back then marking applied…",
          );
          await execAsync(`npx prisma migrate resolve --rolled-back ${name}`);
          await execAsync(`npx prisma migrate resolve --applied ${name}`);
          log.migration(
            `Resolved "${name}" — retrying… (attempt ${attempt + 1})`,
          );
          continue;
        }
      }

      // P3005 — schema already exists with no recorded migration history
      // (e.g. bootstrapped via `prisma db push` instead of `migrate deploy`,
      // as this repo's own historical migration set requires — see
      // docs/planning/03-revamp-master.md §1.3). Baseline every migration
      // as already-applied so future `migrate deploy` calls just no-op
      // against them instead of crash-looping on every startup.
      if (combined.includes("P3005")) {
        const migrationsDir = path.join(
          __dirname,
          "..",
          "prisma",
          "migrations",
        );
        const names = fs
          .readdirSync(migrationsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        log.migration(
          `Unbaselined schema (P3005) — marking ${names.length} migration(s) as applied…`,
        );
        for (const name of names) {
          await execAsync(`npx prisma migrate resolve --applied ${name}`);
        }
        log.migration(`Baselined — retrying… (attempt ${attempt + 1})`);
        continue;
      }

      // P3018 — column/table already exists from a prior db push.
      if (combined.includes("P3018")) {
        const match = combined.match(/Migration name:\s*(\S+)/);
        if (match) {
          const name = match[1];
          log.migration(
            `Schema drift on "${name}" (P3018) — marking as applied…`,
          );
          await execAsync(`npx prisma migrate resolve --applied ${name}`);
          log.migration(
            `Resolved "${name}" — retrying… (attempt ${attempt + 1})`,
          );
          continue;
        }
      }

      log.error("Migration", combined || String(err));
      throw new Error("migrate deploy failed");
    }
  }

  throw new Error("Migration loop exceeded max attempts");
}

// ── AI Server health check ─────────────────────────────────────────────────────
export async function pingAIServer() {
  const url = (process.env.AI_SERVER_URL ?? "").replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY ?? "";

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} chars)`
    : "(not set)";

  if (!url) {
    log.aiWarn("AI_SERVER_URL not set — AI classification disabled");
    log.aiWarn(`AI_API_KEY configured as: ${maskedKey}`);
    return;
  }

  log.ai(`AI server URL  : ${url}`);
  log.ai(`AI_API_KEY     : ${maskedKey}`);

  log.ai("Step 1 — Checking reachability (/health)…");
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      log.ai(`Step 1 ✔ reachable — ${JSON.stringify(body)}`);
    } else {
      log.aiWarn(
        `Step 1 ✖ /health returned ${res.status} — server may be starting up`,
      );
    }
  } catch (err) {
    log.aiError(`Step 1 ✖ unreachable — ${(err as Error).message}`);
    log.aiError("Skipping auth check — fix network/tunnel first");
    return;
  }

  log.ai("Step 2 — Testing API key auth (/api/detect with empty form)…");
  try {
    const form = new FormData();
    const res = await fetch(`${url}/api/detect`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 401) {
      let detail = "";
      try {
        detail = JSON.stringify(await res.json());
      } catch {
        /* ignore */
      }
      log.aiError("Step 2 ✖ AUTH FAILED (401) — key mismatch!");
      log.aiError(
        `  Node server sends : Bearer ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
      );
      log.aiError(`  AI server replied : ${detail}`);
      log.aiError(
        "  → Check AI_API_KEY on both Render services matches the AI server .env",
      );
    } else if (res.status === 400 || res.status === 422) {
      log.ai(
        `Step 2 ✔ AUTH OK (${res.status} = auth passed, empty body rejected as expected)`,
      );
      log.ai("AI server fully operational ✔");
    } else if (res.ok) {
      log.ai(`Step 2 ✔ AUTH OK — server returned ${res.status}`);
    } else {
      log.aiWarn(
        `Step 2 ? unexpected status ${res.status} — check AI server logs`,
      );
    }
  } catch (err) {
    log.aiError(`Step 2 ✖ fetch error — ${(err as Error).message}`);
  }
}
