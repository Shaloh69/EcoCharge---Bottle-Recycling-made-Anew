# EcoCharge — AI Bottle Detection: System Understanding, the Conveyor Detection Problem, and Dataset Expansion

New document, 2026-08-10 — nothing before this covered the detection pipeline at this level of detail or the reported "bottles not detected properly inside the conveyor" issue. Read `docs/planning/09-system-analysis.md` §6 and §12 first for the broader system context; this document goes deeper specifically on the AI side and stays actionable rather than just descriptive.

---

## 1. Full system understanding — how a bottle actually becomes a detection result

Restating this precisely matters, because the bug below lives in the handoff between two systems (firmware timing and browser capture timing) that nothing before this document described together in one place.

1. **Physical trigger**: the entrance ultrasonic sensor on `esp/ecocharge` detects an object (< 15cm). This is what starts everything — the conveyor is not running continuously waiting for a bottle, it starts on this signal.
2. **Firmware enters `SCANNING`**: the conveyor motor nudges the bottle forward on a fixed interval (`BOTTLE_SCAN_INTERVAL_MS`, referenced in the kiosk code as 2000ms) to present fresh camera angles. Motion and capture are meant to be interleaved — nudge, pause, nudge, pause — not simultaneous.
3. **The kiosk web app (`client/kiosk_web`, running in a browser on the kiosk PC) is the actual orchestrator** — confirmed in `docs/planning/09-system-analysis.md` §3/§5, restated in `docs/planning/13-project-roadmap.md`'s Phase 5 status. It's the browser that owns the camera (via `getUserMedia`), owns the retry loop, and calls the AI server. Firmware doesn't know anything about AI results until the kiosk tells it `approve_bottle` or `reject_bottle`.
4. **Detection**: `client/kiosk_web/app/session/deposit/page.tsx`'s `runScanLoop()` captures a JPEG frame from the live camera feed and calls `POST /api/detect` (proxied to `server/server_AI`). The AI server runs YOLO26 (bottle localization, single class `plastic-bottle`, confidence threshold 0.40) then, on a hit, crops and runs the EfficientNet-B0 classifier for brand/volume/condition (`server/server_AI/app/inference.py`).
5. **Accept/reject**: the kiosk only treats a result as approved if **`result.detected && result.confidence >= 0.5`** — this is a **second, higher threshold applied client-side**, on top of the AI server's own 0.40 acceptance floor. A detection that comes back `detected: true` with confidence between 0.40 and 0.50 is silently treated as a failed attempt and retried — this exists in the code today (`deposit/page.tsx:134`) and wasn't previously documented anywhere; worth reconciling explicitly rather than leaving two different thresholds live in two different codebases (see §3.4).
6. Up to `MAX_RETRIES = 6` attempts, each preceded by a 2-second wait, before the kiosk gives up and calls `rejectBottle`.

---

## 2. The reported problem: bottles not detected properly while inside the conveyor

This is a real, verifiable design issue found by reading the actual capture code, not speculation. Several contributing causes, roughly ordered by how likely each is to matter:

### 2.1 The capture timer and the conveyor's nudge timer are not actually synchronized — the most likely root cause

`deposit/page.tsx`'s own comment states the intent plainly: *"Wait for firmware nudge cycle before capturing... We wait the same interval so each attempt sees a fresh bottle position."* But look at what actually happens:

- The **firmware's** nudge cycle starts when its FSM enters `SCANNING`, triggered by the entrance sensor, on its own internal clock.
- The **kiosk's** 2-second wait starts when it receives an SSE `bottleAtEntrance` event — which depends on when the ESP32's telemetry POST carrying that flag actually arrives and gets relayed (telemetry posts on its own schedule, per `docs/planning/09-system-analysis.md` §11).

These are **two independent timers with the same period (2000ms) but no shared start signal and no handshake** — using the same number doesn't make them synchronized, it just makes them *coincidentally* likely to be close some of the time and out of phase the rest of the time. There is no signal from firmware saying "the nudge just finished, the bottle is stationary now, it's safe to capture" — the kiosk is capturing blind, on a timer, hoping it lands in the pause between nudges rather than during the motion itself. A frame captured mid-nudge is motion-blurred, and a blurred bottle is exactly the kind of input that would make a small, undertrained detector (see §3) miss it or return low confidence — which reads exactly like "bottles not detected properly inside the conveyor."

**Fix, real and buildable, not speculative:** give the ESP32 a way to signal "nudge complete, holding position" (a telemetry flag or a dedicated SSE-relayed event) and have the kiosk capture in response to that signal instead of a fixed sleep. This is a genuine protocol addition — flag it alongside the two already-paused firmware fixes (`03-revamp-master.md` §3.2/§3.3) since it touches the same file (`bottle_fsm.c`) and the same "don't just trust a timer, get real confirmation" principle already established there.

### 2.2 No explicit camera resolution requested

`getUserMedia({ video: { facingMode: "environment" } })` requests no `width`/`height`/`frameRate` constraints — the browser negotiates whatever the connected camera's default is, which varies by device and can be lower than what the model was trained on (`docs/planning/12-self-hosting-guide.md`'s training defaults are 640px). Detection quality is currently at the mercy of camera/driver defaults rather than a deliberate choice. **Fix:** request explicit constraints matching the classifier's `imgsz` (224) and a YOLO-friendly capture size (e.g. `width: { ideal: 1280 }, height: { ideal: 960 }` — capture high, let the existing crop-and-resize pipeline downscale, rather than starting low).

### 2.3 Single-frame capture, no sharpness check

Each attempt captures exactly one frame and sends it. A cheap, real improvement: capture 2–3 frames in quick succession per attempt and either pick the sharpest client-side (a simple variance-of-Laplacian check is enough, doesn't need a new dependency) or send the best of them — cutting the odds that a single unlucky mid-motion frame is the one that gets evaluated.

### 2.4 The training data likely doesn't match the real camera/conveyor conditions

Verified from the dataset's own files: `bottle_measurements.csv` filenames follow the pattern `WIN_20260416_14_39_34_Pro.jpg` — the naming convention Windows' own Camera app uses. This strongly suggests the training images were captured with a general-purpose webcam/phone-style setup, **not through the actual camera mounted over the production conveyor**, at its real angle, height, lighting, and with the conveyor's own mechanical structure partially in-frame the way it would be in real use. A detector trained on clean, close-up, well-lit bottle photos will generalize worse to a bottle photographed at an angle, partially in motion, with conveyor rails in the frame, than a detector trained on images that actually look like that. This is very likely a second, independent contributor to the reported problem, not just the timing issue in §2.1 — the two compound (a small, non-domain-matched dataset is already fragile; feeding it motion-blurred frames on top makes it worse).

### 2.5 The two-threshold discrepancy (§1, step 5)

Worth restating as its own item: a detection landing between 0.40 and 0.50 confidence currently reads as a full miss to the user (retried, and eventually rejected if it happens 6 times running), even though the AI server itself considered it a real detection. This inflates the apparent miss rate without it necessarily being a model-quality problem — it may just be an unreconciled threshold. See §3.4 for the specific recommendation.

---

## 3. Recommended fixes, prioritized

1. **Firmware "nudge complete" signal + kiosk capture-on-signal instead of capture-on-timer** (§2.1). Highest-value, addresses the most likely root cause directly. Scope it alongside the two already-paused firmware fixes — same file, same review-before-flash discipline (`03-revamp-master.md` §3.2/§3.3).
2. **Explicit camera capture constraints** (§2.2) — a `client/kiosk_web` change only, no firmware/hardware involved, safe to do independently and immediately.
3. **Best-of-N frame capture per attempt** (§2.3) — same, kiosk-only, independent.
4. **Reconcile the 0.40/0.50 threshold split** (§2.5) — decide explicitly whether the kiosk's client-side 0.5 floor is intentional (a deliberately stricter user-facing bar than the AI server's own acceptance floor) or an accidental mismatch that should collapse to one number. This is a five-minute product decision, not a code problem, but it's currently undocumented and worth a real answer rather than leaving two numbers to drift further apart.
5. **Dataset expansion**, §4 below — necessary either way, but note it's not a substitute for fixing §2.1's timing issue; more data trains a better model, it doesn't fix a pipeline that's feeding the model blurry frames some fraction of the time.

---

## 4. Dataset expansion — real, found candidates, not invented

The existing dataset (`scripts/dataset/Eco-Charge.v1`, Roboflow project [`hubssoftdev/ecocharge`](https://universe.roboflow.com/hubssoftdev/ecocharge/dataset/1)) is small — 103 train / 30 valid / 15 test images, single class `plastic-bottle`, per `docs/planning/10-paper-vs-repo-gap.md`. That's genuinely thin for a detector expected to generalize across lighting, angle, and motion conditions.

### 4.0 Check this first, before anything below — a second dataset may already exist

Found during infrastructure recon on `desktop-gklhcri` (2026-08-10, see `memory.md`): `D:\EcoCharge\datasets\magical-nightingale\` — a **separate, already-registered** single-class (`plastic bottle`) detection dataset on Ultralytics Platform (`platform.ultralytics.com/jobert-vidad/datasets/magical-nightingale`), created 2026-04-20 by a collaborator (`jobert-vidad`) not otherwise referenced in any project doc. Real train/val/test split defined in its own `data.yaml`, ~78MB. **The images aren't downloaded locally yet** — it's a registered reference, not a merged dataset. Ask the team about this before doing any of the external-source merge work below; it may already be earmarked for exactly this purpose, and duplicating that effort by independently sourcing Roboflow sets would be wasted work if so.

**Decision (2026-08-10): abandoned, per explicit user instruction — don't chase this further.** No Ultralytics HUB credentials were found on either machine to pull the actual image files, and rather than block on getting an API key from `jobert-vidad`, the user said to skip it and train with what's already available (`Eco-Charge.v1`, relying on YOLO's built-in augmentation). If credentials become available later this is still a legitimate, class-compatible merge (same `plastic bottle` taxonomy, no remapping needed) — but it's not being actively pursued.

**What actually happened instead, 2026-08-10 — training was run for real, not just planned:**
- **Where**: `desktop-gklhcri`, per the user's explicit instruction (overriding the hardware-based recommendation to use the dev machine's GPU — see `memory.md`).
- **Dataset fixed first**: `desktop-gklhcri`'s copy of `Eco-Charge.v1` had grown to 546 train images (well past the ~103 documented in March) but `valid/images` was completely empty — would have broken validation. Fixed with the new `scripts/split_validation.py` utility (465 train / 81 valid / 79 test, all pairs matched, zero orphaned labels).
- **`scripts/train_yolo.py` gained a `--freeze` option** (freezes early backbone layers — real, current guidance for fine-tuning on CPU) and disables `amp` automatically on CPU runs.
- **Confirmed genuinely training** (not just launched): real decreasing loss values, epoch 1/80, ~29 batches/epoch, ~4-7s/iteration on CPU via a Windows Scheduled Task (the only pattern that survives the SSH session ending on this machine — plain `Start-Process` did not). Expect this to run for hours; check `schtasks /Query /TN EcoChargeTrain /FO LIST /V` or tail `D:\EcoCharge\EcoCharge\runs\logs\train_stdout.log` on `desktop-gklhcri`.

### 4.1 An important distinction before merging anything: detector data vs. classifier data are different problems

- **The YOLO detector** only needs bounding boxes around a single class (`plastic-bottle`). Any public bottle dataset can contribute here, regardless of what attributes it does or doesn't label — merging is mostly a matter of remapping every dataset's class names down to one `plastic-bottle` class and reconciling image formats/splits.
- **The EfficientNet-B0 attribute classifier** needs brand, volume (mL), and condition labels matching EcoCharge's own taxonomy (per the checkpoint: 10 brands, 11 volumes, 2 conditions) — and per `bottle_measurements.csv`'s actual columns, the raw data even carries more attributes than the classifier currently uses (`colorcap`, `colorbottle`, `label`/`withlabel`, `cap`/`withcap`) that aren't wired into a model head yet, a possible future-work item in its own right. **Public datasets essentially cannot help the classifier directly** — none of them will share EcoCharge's specific brand/volume/condition taxonomy. The highest-value new classifier data is more real photos captured and labeled the same way the existing `bottle_measurements.csv` rows were — ideally captured through the actual kiosk camera at the actual conveyor this time, closing the §2.4 domain-mismatch gap at the same time as expanding volume.

### 4.2 Detector-dataset candidates found (Roboflow Universe, verified real via search this session)

Directly on-domain — highest value, prioritize these first:
- **["Reverse vending machine"](https://universe.roboflow.com/reverse-vending-machine-lqerh/reverse-vending-machine-ogew0)** — 606 images, classes include can/PET-bottle/plastic, from an actual reverse-vending-machine context. As close to EcoCharge's real deployment scenario as a public dataset gets.
- **["Conveyor belt" (by "Plastic bottle")](https://universe.roboflow.com/plastic-bottle-lgyy9/conveyor-belt-eafpe)** — 1,740 images, bottles specifically on a conveyor belt. Directly addresses §2.4's domain-mismatch concern — this is exactly the visual context (motion, conveyor structure in-frame, that camera angle) the current dataset is missing.

General-purpose, still useful for volume/robustness:
- **["Plastic Bottles" (by YOLO)](https://universe.roboflow.com/yolo-nznfs/plastic-bottles-ip5yb-uziag)** — 1,250 images.
- **["Plastic Bottle Detection" (by dataset)](https://universe.roboflow.com/dataset-yhnan/plastic-bottle-detection-vesiu)** — 854 images, ships a pretrained model too (worth comparing its reported metrics against the current YOLO26n run as a sanity baseline, not necessarily using its weights directly).
- **["can, bottle, and pack detection"](https://universe.roboflow.com/recyclorobloai-intern/can-bottle-and-pack-detection/dataset/1)** — 688 images across can/bottle/tetra-pack — useful for teaching the detector what *isn't* a bottle (reduces false positives on cans/cartons someone might mistakenly insert), filter down to just the bottle class if only expanding positive examples.

### 4.3 Classifier-adjacent candidates (condition/defect labeling specifically)

- **[Jarvis-BITS/bottle-defect-detection](https://github.com/Jarvis-BITS/bottle-defect-detection)** (GitHub) — a bottle material + defect (crushed/cut) classifier project. Not a drop-in dataset, but worth reading its labeling approach for the `condition` head specifically, since "perfect/imperfect" condition labeling is exactly the axis EcoCharge's own classifier already has and could use more examples of.
- **[TACO — Trash Annotations in Context](http://tacodataset.org/)** — 1,500 images, 60+ litter categories, real-world outdoor contexts, COCO-format annotations. Broader than bottles specifically (general litter), lower direct value than the two on-domain Roboflow sets above, but a legitimate source of "what does a real, dirty, non-studio-lit discarded bottle look like" variety if the detector needs to be more robust to worn/dirty bottles than the current clean-photo training set covers.

### 4.4 Merge plan

1. **Prioritize the two on-domain sets (§4.2)** — download, verify actual class names/counts on inspection (Roboflow listing counts can shift as datasets are updated; confirm at download time rather than trusting the numbers above as permanently exact).
2. **Remap every source dataset's classes to the existing single `plastic-bottle` class** — `data.yaml`'s `nc: 1` stays as-is unless there's a deliberate decision to expand it (e.g. adding a `can` negative class from §4.2's third dataset would mean `nc: 2` and retraining the class head, a bigger decision than a simple data merge — flag this explicitly rather than silently changing `nc`).
3. **Dedupe and spot-check for quality** before merging — public datasets vary in annotation quality; a quick manual pass over a sample from each source catches mislabeled boxes before they poison training.
4. **Preserve train/valid/test separation properly** — merge into the existing split proportions (roughly 70/20/10 per the current 103/30/15), don't just dump everything into `train/`. Watch specifically for near-duplicate frames across a source dataset's own images ending up split across train and test, which would inflate reported accuracy without actually improving real-world performance.
5. **Re-run `scripts/train_yolo.py`** against the merged set once assembled, compare `runs/detect/` metrics against the current run before deciding the merge actually helped (a bigger dataset with more variety could, in principle, plateau or even dip mAP if merge quality control was sloppy — verify, don't assume more data is automatically better).
6. **Separately, and just as importantly:** capture a real batch of new photos through the actual production camera at the actual conveyor (per §4.1's classifier point and §2.4's domain-mismatch finding) — label them the same way `bottle_measurements.csv` already does, and fold them into both the detector and classifier training sets. This is the one improvement that directly closes the domain-mismatch gap; no public dataset can substitute for it.

---

## 5. Where this fits in the broader plan

This document is a sibling to `03-revamp-master.md`, not a replacement for anything in it. The firmware-side fix in §2.1/§3 item 1 should be proposed with exact values the same way the `SCANNING` timeout and `CONFIRMING` re-check were (`docs/planning/11-audit-findings.md`), and go through the same review-before-flash gate. The dataset and kiosk-side fixes (§2.2–§2.4, §4) don't touch hardware and can proceed independently. Track completion of both against `docs/planning/05-feature-build-checklist.md` once work starts — add a stage there rather than duplicating status tracking in a third place.
