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
- [ ] **Database backups — there are none. Verified 2026-08-25: `D:\EcoCharge\backups\mysql` is empty and no backup task exists.** The only copy of every user, credit balance and deposit is one Docker volume on one desktop. A disk failure loses the entire system of record and, with it, every credit a user has earned. **This is the single largest non-safety risk in the project.**
  - [ ] Scheduled `mysqldump` (daily minimum) with the `/RU SYSTEM` Task-Scheduler pattern that is already proven on this host
  - [ ] Copies stored **off that machine** — a backup on the same disk as the database is not a backup
  - [ ] **A restore actually performed from a backup**, at least once. An untested backup is a hope.

### Reliability
- [ ] **Fix the startup crash-loop: the API treats "MySQL not ready" as fatal.** Verified 2026-08-25 from real logs — `restarts.log` holds **29,746 restart lines**, and on 2026-08-24 the API restarted every ~8 s for an extended period with `P1017: Server has closed the connection` from `prisma migrate deploy`. It recovered only because the `.bat` loop kept retrying. `startup.ts` already self-heals P3005/P3009/P3018; **P1017 is a transient readiness error and should be retried with backoff, not treated as fatal.** Add a DB-readiness wait before migrations.
- [ ] **Log rotation.** Verified 2026-08-25: `stdout.log` 43.6 MB, `stderr.log` 18.5 MB, `restarts.log` 1.6 MB, all growing without bound. Disk has 641 GB free so this is not urgent, but it is unbounded, and `restarts.log` is the file that would have made the crash-loop obvious months earlier if anyone had been able to read it.
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
- [ ] **Credit enforcement test: spend more than balance → 400.** Untested. This is money-like logic.
- [ ] **Confidence threshold boundary test** at exactly 0.5 — the line where a real user's bottle is refused.
- [ ] **Charging port-conflict (409) and insufficient-balance paths** — not directly tested.
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

The three findings from 2026-08-25 worth repeating, because none of them were in any checklist before today: **zero database backups**, **unbounded logs**, and **an API that treats a not-yet-ready database as a fatal error** and crash-looped 29,746 times without anyone noticing.
