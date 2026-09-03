# EcoCharge — Production Readiness Checklist

**Created 2026-08-25.** One ordered list of everything that must be true before EcoCharge runs unattended, with mains power, in front of real users at UC Lapu-Lapu and Mandaue.

**How this differs from the other checklists.** `08-master-checklist.md` tracks *what has been built*. This file tracks *what production needs*, which is not the same list — it includes things nobody has built yet because they were never features (backups, log rotation, electrical safety), and it excludes finished work that doesn't affect going live. Where the two overlap, `08` holds the evidence and this file holds the priority.

**Status key:** `[ ]` not done · `[~]` partially done · `[x]` done and verified · `[!]` needs a decision or an action only the user can take

**Everything marked as verified below was checked against the real system on 2026-08-25**, not inferred from another document. Everything not checked says so.

---

## What "production" means here

A pilot deployment at UC Lapu-Lapu and Mandaue: a physical kiosk switching **real mains power** to four charging ports, unattended, used by students who are not the development team, holding balances that behave like money to the people earning them.

That framing sets the bar for what counts as a blocker. **A bug that wastes a user's bottle is bad; a bug that energises a relay incorrectly is dangerous.** They are not the same priority.

---

## P0 — Blockers. Do not deploy without these.

### Electrical and physical safety
- [ ] **Mains wiring inspected and signed off by someone competent.** Four relay-switched AC outlets, a breaker, an exhaust fan. This is the one category where a mistake injures somebody. Nobody on this project has stated any electrical qualification, and no inspection has happened.
- [ ] **Overcurrent trip verified on real hardware, all four ports.** `CURRENT_OVERCURRENT_AMPS = 15.0 A` with a 2 s hold. **Never tested with a real load.** Until it is, treat the number as a guess in a config file, not a protection.
- [ ] **Verify the 3600 s relay watchdog actually cuts power.** It runs as an independent firmware task and is the last line of defence if the server misbehaves. Code-reviewed, never exercised.
- [ ] **Confirm relays fail OFF on ESP32 reset, brownout, and power loss.** `relay_control.c:43` is written to do this and was verified by reading code — not by pulling power on a live board.
- [ ] **Enclosure: earthing, strain relief, mains/logic separation, ventilation.** Not documented anywhere.
- [ ] **Sensor calibration.** `VOLTAGE_SCALE 75.76`, `CURRENT_SENSOR_SENSITIVITY 0.100`, `CURRENT_SENSOR_VOFFSET 1.65` are **unverified constants**. The overcurrent trip is only as trustworthy as these. Calibrate against a known load and a meter.

### Data safety
- [x] **Database backups — BUILT AND RESTORE-TESTED 2026-09-03.** Was the single largest non-safety risk; there were literally zero backups.
  - [x] `D:\EcoCharge\backup_mysql.ps1` — `mysqldump --single-transaction` (consistent snapshot, no table locks, so it cannot block a live deposit). **The root password never leaves the container**: the script passes `MYSQL_PWD` from the container's own environment, so the credential appears in no file, no command line and no Task Scheduler entry.
  - [x] Scheduled `EcoChargeBackup`, daily 03:30, **`/RU SYSTEM`, Logon Mode confirmed `Interactive/Background`** — the August lesson applied so it actually fires unattended.
  - [x] **Guards against a backup that only looks like one:** fails if the dump is under 2 KB or contains no `CREATE TABLE`, and deletes the bad file rather than keeping it. Retention is 14 days and **time-based, not count-based**, so a burst of runs cannot evict older good backups.
  - [x] **A real restore was performed** — `D:\EcoCharge\restore_test.ps1` restores the newest dump into a scratch database, compares **every table's `COUNT(*)`** against live (not `information_schema.table_rows`, which is only an estimate on InnoDB), then drops the scratch copy. Result: **all 10 tables matched exactly.** Re-run this after any change to the backup script.
  - [x] **Second-disk mirror added 2026-09-03.** Each backup is now copied to `E:\EcoCharge-Backups` and the copy is **size-verified** before being kept. `E:` is a separate physical device from the `D:` HDD that holds both the database and the primary backups (confirmed via `Get-PhysicalDisk`: different DiskNumber, Samsung SSD vs Toshiba HDD), so a single drive failure no longer loses everything. A failed mirror logs but does **not** fail the backup — the primary copy matters more than the redundancy.
  - [ ] **Still not off-*machine*, and the attempt was deliberately backed out.** The mirror protects against a dead disk — not a dead machine, a fire, or ransomware.
    - The kiosk PC came back online 2026-09-03 and an `scp` push was built and tested. It **does not work reliably**: server→kiosk SSH authenticates (`Server accepts key`) then dies at `[preauth]` with `Connection reset`, and a plain `ssh` from the server **hangs** rather than failing fast. The kiosk had also been offline for the 8 days immediately prior.
    - **Removed rather than left in**, because a hanging `scp` inside the backup script would stall the backup — and the backup is a P0 control that currently works. An unproven extra copy must not be able to take down the proven one.
    - **Groundwork is done, so re-enabling is small once the path is fixed:** a passphrase-free ed25519 key exists in SYSTEM's profile on the server (verified with `ssh-keygen -y -P ""`), its public key is authorised on the kiosk with correct ownership, and `C:\EcoCharge-OffboxBackups` exists there.
    - **Real bug found and fixed on the way:** appending a key to `authorized_keys` when the file lacks a trailing newline silently glues it onto the previous line, where it becomes part of that key's **comment field**. The file looks correct and the new key simply does not exist. Always write that file as an array, one key per line.

### Reliability
- [x] **Startup crash-loop — FIXED AND PROVEN LIVE 2026-09-03.** `startup.ts` now treats `P1001` / `P1017` / `P1002` / `P2024` / `ECONNREFUSED` as **transient readiness errors** and retries with capped exponential backoff (12 attempts, ~2.5 min) instead of throwing. The 10-attempt loop already existed but every unrecognised error hit the `throw` on attempt 1, so it had **never actually retried for connection failures**.
  - **How bad it had got:** restart lines went **29,746 → 71,423** between 2026-08-25 and 2026-09-03 — **41,677 restarts in nine days.**
  - **Proven, not assumed:** MySQL was deliberately stopped, the API restarted, and left with no database for 25 seconds. **The restart count did not move** (71,423 before and after; the old behaviour produced roughly one restart every 8 s), the log showed `Database not reachable yet (attempt 1/12) - retrying in 1s`, and when MySQL came back the API recovered on its own with `All migrations applied ✔` — no restart, no intervention.
- [x] **Log rotation — BUILT 2026-09-03.** By then the files had reached **`stdout.log` 103.8 MB and `stderr.log` 44.4 MB**. Size was never the real problem (641 GB free); the problem was that the evidence of a two-hour crash loop sat in a file too large for anyone to casually open, which is how the fault stayed invisible for nine days.
  - `D:\EcoCharge\rotate_logs.ps1`, scheduled `EcoChargeLogRotate` daily 03:45, `/RU SYSTEM`, Logon Mode confirmed. Rotates only files over 10 MB, archives them zipped, keeps 21 days.
  - **Real constraint found while building it:** the launcher `.bat` files redirect with `>>`, which opens the log **without write-sharing**, so in-place truncation fails with "being used by another process". The script therefore stops the owning service, rotates, and restarts it — but **only for a file that has actually exceeded the threshold**, which after the crash-loop fix should be rare.
  - First run: 148 MB of logs archived down to **2.4 MB compressed**.
- [~] **Docker Desktop startup — improved by the user 2026-09-03, one gap remains.** Staying on Docker was chosen deliberately over migrating to the native `MySQL80` service (which is already installed and already `Automatic`); that migration was proposed, planned and **not executed** — no data was moved.
  - **What was wrong:** the host rebooted at **11:48** on 2026-09-03 and Docker Desktop did not start until **13:53:51**, when a human logged in. MySQL therefore did not exist for **2 h 05 m**. `AutoStart` was `False`.
  - **What the user fixed:** `AutoStart` is now **`True`** (verified). Docker Desktop now starts reliably **whenever someone signs in**, which it did not do before.
  - **The remaining gap, stated precisely so nobody mistakes it for solved:** `AutoAdminLogon` is **not set** (verified), so a reboot where *nobody signs in* still leaves the database absent and the backend down. This matters for a kiosk left running unattended; it does not matter while someone is around to log in after a restart.
  - **Partially mitigated** by the crash-loop fix above: the API now waits ~2.5 minutes for the database instead of restarting thousands of times, which comfortably covers Docker starting a little after login. It does not cover nobody logging in at all.
  - **If this needs closing later**, the two routes are Windows auto-login (fast, stores a credential, leaves a logged-in desktop) or the already-installed native `MySQL80` service (no credential stored, starts at true boot — a dedicated `ecocharge` database and user, restored from the verified backup).
- [ ] **Hardware validation end to end**, on the real kiosk: A↔B UART link wired and streaming; relays clicking; conveyor forward/reverse; all three ultrasonics reading real distances; a real bottle producing a real credit. **None of this has happened** — both ESP32s were flashed standalone on a bench 2026-08-20 with nothing attached.
- [ ] **Flash and verify the two paused FSM fixes** (`SCANNING` timeout, `CONFIRMING` bin re-check). Implemented in source since 2026-08-11, never on hardware.
- [ ] **Physically press the WiFi reset button.** Init logs correctly on GPIO22, but a 3 s hold → NVS erase → AP reboot has never been exercised. It is the only field recovery path for a wrong-network kiosk, so it must work before the kiosk leaves the bench.

---

## P1 — Required before real users, not strictly before power-on

### Security
- [x] **Both API keys rotated** (2026-08-12), old values verified dead in both directions.
- [x] **Secrets out of `config.h`** — replaced with `SET_AT_BUILD_TIME` placeholders (2026-08-20).
- [x] **Login rate limiting** — 10/15 min/IP, verified 2026-08-20 with a genuine two-external-IP test through the live tunnel.
- [x] **Kiosk endpoints require auth** — re-verified live 2026-08-20 (all three return 401 without a token).
- [!] **Delete the old GitHub repo.** Its pre-rewrite objects are still fetchable by SHA. Both leaked keys are dead, so this is about the plaintext content, not access. **User's action.**
- [ ] **Rotate the seeded admin password** (`admin@ecocharge.ph`). It has existed since the first seed and lives in the host `.env`. Change it before anyone outside the team can reach the console.
- [ ] **Review JWT lifetime and the refresh path.** `JWT_EXPIRES_IN` is 4 h with a 30 d refresh. Nobody has verified what a user actually experiences when a refresh fails — `06-must-have-app-features.md` §2 flags session-expiry UX as unverified.
- [ ] **Move the device keys into NVS provisioning on the firmware side.** The DB half is rotated; the ESP32 half still needs the provisioning path plus a flash. Until then a device key change means reflashing.
- [ ] **Decide whether the admin console should stay publicly tunnelled.** It is reachable from the open internet behind one password with no second factor. Rate-limited, but that is not the same as protected.

### Correctness the users will feel
- [ ] **Bin-full screen** (`02-design-mandate.md` §4.4). The server refuses deposits at ≥95% and the kiosk routes to `/session/bin-full`, but **the screen itself is unbuilt**. A user at a full kiosk currently hits a route with no designed content.
- [ ] **A real reject reason on the result screen.** Low-confidence and nothing-detected both show "Bottle not recognised". With the accept floor now at 0.5, users *will* be refused legitimately and deserve to know which case they are in.
- [x] **Credit enforcement — TESTED 2026-09-03.** New integration test: a freshly registered user (balance 0) requesting 5 credits gets `400 insufficient credits`. It also asserts the guard **wrote nothing** — no charging session created, balance still 0 — because a refusal that still writes rows looks correct from the outside and is worse than no guard at all.
- [ ] **Confidence threshold boundary test** at exactly 0.5 — the line where a real user's bottle is refused.
- [x] **Port-conflict — TESTED 2026-09-03.** New integration test: two *different* users (the real-world case, not one person double-clicking) reach for the same socket; the second gets `409 port already in use`, is **not** charged, and no second session exists. The test frees the port afterwards so it leaves no state behind.
- [x] **Integration suite timeout fixed.** The happy-path test takes ~30 s against a real database but the suite's `testTimeout` was 20 s, so it failed on the clock rather than on a defect. Raised to 120 s — **a suite that fails spuriously stops being read, which is worse than a slow one.** All 6 integration tests now pass.
- [ ] **Re-verify the kiosk screens that need real hardware state**: `/session/deposit`, `/session/charging`, `/session/result`, both receipts, `/auth/linked`. A browser cannot fake these.

### Operations
- [x] **Service persistence across reboot** — proven by a real reboot on 2026-08-18; every service returned unaided.
- [ ] **Someone other than Claude can run the tunnel-rotation runbook.** It is written down in `08-master-checklist.md` Phase A, but has only ever been executed by an agent. Have a human do it once, from the document alone.
- [ ] **Monitoring that reaches a person.** The admin console shows offline kiosks and a sticky alert strip, but nothing pages anyone. A kiosk that dies at 22:00 stays dead until someone opens a browser.
- [ ] **Crash reporting in the Flutter app** — confirmed absent.
- [ ] **Decide the tunnel topology for a real pilot.** Quick tunnels rotate on every restart; that has already caused two outages of client connectivity. The ESP32 no longer cares (NVS), but the web and mobile clients still need rebuilds. A named tunnel on a free domain ends this permanently. Declined once (2026-08-12) — worth revisiting now that a pilot date is real.

---

## P2 — Needed for a defensible thesis, not for the machine to run

- [ ] **Thesis narrative alignment.** Four real divergences the paper does not yet describe, each defensible if stated and damaging if found by a panel instead:
  - YOLO26, not YOLOv8 (decided 2026-03-15; **never confirmed in the paper itself**)
  - Node/Express/Prisma, not Flask
  - Conveyor, not a servo trapdoor
  - **Two ESP32s, not one** — and the reason (ADC2 is unusable with WiFi) is a genuinely good engineering answer
- [~] **UI screenshots.** A real deployed set exists in `docs/design-screenshots/deployed/` (12 admin pages, kiosk flow, mobile home, update-required). Missing: the hardware-dependent kiosk screens and the unbuilt bin-full screen.
- [ ] **System usability testing on the built product.** The paper's survey data measures *demand*, not usability of what was built. Different evidence, not yet collected.
- [ ] **Pilot deployment findings.** Blocked on everything in P0.
- [ ] **Refresh `docs/evidence/limitations-and-future-work.md`** once the above closes.
- [ ] **Pull the ML artifacts off the host** — confusion matrix, PR curves, val predictions live in `runs/detect/` on `desktop-gklhcri` and are gitignored by design.
- [!] **Language scope.** The designs include a language switcher; which languages beyond English was never decided. Bisaya/Cebuano is the obvious candidate for this deployment. Blocks building it as anything but decoration.
- [ ] **Mascot attribution must ship wherever the mascot appears.** The obligation attached to the "for show only" authorisation is real and currently lives only in `public/mascot/CREDITS.md`.
- [ ] **Privacy policy.** The product collects email and avatar images. There is no policy page anywhere, and `06-must-have-app-features.md` §7 flags it.

---

## P3 — Post-pilot

- [ ] Design backlog: mobile screens beyond Home; the Home balance card's **banned gradient**; Lottie scanning composite; the formal `/design-review` and `avoid-ai-design` passes.
- [ ] The dismissible `optional`-tier update nudge (computed today, deliberately ignored).
- [ ] Feedback/bug-report pipeline — absent, and its absence is why the update gate has no bug-reporter credit.
- [ ] Flutter widget tests — none exist.
- [ ] Admin audit log — no `AuditLog` table; admin actions including kiosk commands are not attributable after the fact.
- [ ] Firmware OTA. Every firmware fix currently requires physical access. For a fielded kiosk that is a real operational constraint, and it is worth stating in the thesis limitations rather than pretending otherwise.
- [ ] Decommission the two Render Next.js apps.
- [ ] Normalise the admin API's three different list-response shapes (`{items}` vs bare array) — the inconsistency is what let the `Paginated<T>` bug hide.

---

## Decisions still owed

| # | Decision | Blocks |
|---|---|---|
| 1 | Delete the old GitHub repo | Closing the leaked-plaintext item |
| 2 | Language scope beyond English | Building the language switcher |
| 3 | Thesis narrative: update the paper, or document all four divergences as design decisions | P2 evidence |
| 4 | Named tunnel vs. accepting rotation churn for the pilot | Client stability |
| 5 | Admin console: stay publicly tunnelled, or move behind the tailnet | Security posture |
| 6 | Who signs off the mains wiring | Every P0 electrical item |

---

## Honest summary

**The software is in good shape; the system is not ready.** The gap is not code quality — it is that **nothing has run on real hardware**, **there are no backups**, and **the protection that matters most (overcurrent) has never been tested with a real load**.

**All three findings from 2026-08-25 are now fixed and verified** (2026-09-03): backups exist and a real restore was proven table-by-table; logs rotate; the API waits for its database instead of dying, demonstrated live with the database deliberately stopped.

**What replaced them at the top of the list is more fundamental:** Docker Desktop starts at *user login*, not at boot, so after an unattended reboot the database simply is not there — for two hours and five minutes on 2026-09-03. That is a decision, not a bug, and it is above.

And the oldest item is still the most serious: **the overcurrent trip has never been tested with a real load.** Everything else on this page is about uptime and data. That one is about somebody getting hurt.
