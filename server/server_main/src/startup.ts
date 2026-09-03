import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

import { log } from "./logger";

const execAsync = promisify(exec);

// ── Auto-migrate ───────────────────────────────────────────────────────────────
// 12 attempts with capped exponential backoff covers roughly 2.5 minutes of
// the database being unavailable before giving up. Deliberately not longer:
// past that, something is genuinely wrong and a human should see a clear
// failure rather than a process that waits silently forever.
const MAX_MIGRATION_ATTEMPTS = 12;
const TOTAL_WAIT_DESCRIPTION = "2.5 minutes";

export async function runMigrations() {
  log.migration("Connecting to database…");

  for (let attempt = 1; attempt <= MAX_MIGRATION_ATTEMPTS; attempt++) {
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

      // ── Connection-class errors: the database simply is not up YET ────────
      //
      // These are transient READINESS failures, not schema problems, and they
      // must not be fatal. Found the hard way twice:
      //   2026-08-24  P1017 "Server has closed the connection"
      //   2026-09-03  P1001 "Can't reach database server at 127.0.0.1:13306"
      //               - the host rebooted at 11:48 but Docker Desktop only
      //                 started at 13:53 (it launches at USER LOGIN, not at
      //                 boot), so MySQL did not exist for over two hours.
      //
      // The old code threw on the first such error, so this loop never
      // actually retried for them: the process died, the .bat relaunched it
      // ~5s later, and it died again. That produced 71,423 logged restarts and
      // a 100 MB stdout.log - the crash loop was the only thing keeping the
      // service alive, and it made the real cause almost impossible to see.
      //
      // Waiting is strictly better: the API comes up on its own the moment the
      // database appears, with no restart storm and no lost log.
      const CONNECTION_ERRORS = ["P1001", "P1017", "P1002", "P2024", "ECONNREFUSED"];
      const isTransient = CONNECTION_ERRORS.some((code) => combined.includes(code));

      if (isTransient) {
        // Backoff capped at 15s: long enough not to spam, short enough that the
        // API is serving within seconds of the database becoming reachable.
        const waitMs = Math.min(1000 * 2 ** (attempt - 1), 15000);
        log.migration(
          `Database not reachable yet (attempt ${attempt}/${MAX_MIGRATION_ATTEMPTS}) - ` +
            `retrying in ${waitMs / 1000}s. This is normal shortly after a reboot.`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      log.error("Migration", combined || String(err));
      throw new Error("migrate deploy failed");
    }
  }

  // Every attempt exhausted. Still do NOT exit: on this deployment the process
  // is relaunched by a .bat loop, so exiting just restarts the same wait from
  // zero and burns another log file. Throwing here is correct only because
  // index.ts treats it as fatal - see the note there.
  throw new Error(
    `Database unreachable after ${MAX_MIGRATION_ATTEMPTS} attempts (~${TOTAL_WAIT_DESCRIPTION}). ` +
      "Check that the MySQL container is running - on desktop-gklhcri, Docker Desktop " +
      "starts at user login rather than at boot, so after an unattended reboot the " +
      "database can be absent for hours.",
  );
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
