# EcoCharge — ML Evaluation Report (Detector)

Part of the thesis evidence pack (`docs/planning/08-master-checklist.md` Phase H). Covers the bottle detector only — the classifier (brand/volume/condition) was **not retrained this session**; see the note at the end.

---

## 1. What this covers

Stage 1 of the two-stage detection pipeline: YOLO26, fine-tuned to detect `plastic-bottle` (single class) against the belt/bin background the kiosk's camera actually sees. This is the model now deployed on the self-hosted AI server (`server/server_AI`, running on `desktop-gklhcri`) as `models/best_detector.pt`.

## 2. Dataset

- Source: Roboflow, `hubssoftdev/ecocharge` v1, CC BY 4.0 (`scripts/dataset/Eco-Charge.v1/data.yaml`).
- 1 class: `plastic-bottle`.
- Split used for this run: 465 train / 81 valid / 79 test images, all image/label pairs matched. The validation split was rebuilt this session (`scripts/split_validation.py`) — the checked-out copy on the training machine had grown to 546 train images since the dataset was first added, but `valid/images` was empty, which would have silently broken validation during training.

## 3. Training configuration

Real values from the run's own `args.yaml`, not recalled from memory:

| Parameter | Value |
|---|---|
| Epochs | 80 (completed in full, not early-stopped) |
| Patience | 50 |
| Batch size | 16 |
| Image size | 640 |
| Optimizer | auto |
| Initial LR | 0.01 |
| Warmup epochs | 3.0 |
| Device | CPU (`desktop-gklhcri` — AMD GPU, no CUDA) |

Run directory: `runs/detect/ecocharge_bottle_det/` on `desktop-gklhcri` (`D:\EcoCharge\EcoCharge\runs\detect\ecocharge_bottle_det\`). **Not copied into this repo** — `scripts/runs/` is gitignored by design (binary ML artifacts don't belong in git history); pulling the actual PNGs (confusion matrix, PR curves, val prediction/label comparison images — all present in that directory) onto whichever machine assembles the final thesis document is a real, manual follow-up step, not done as part of this report.

## 4. Results

**Held-out test set** (79 images, never seen during training or validation):

| Metric | Value |
|---|---|
| mAP50 | **0.9950** |
| mAP50-95 | **0.9447** |
| Precision | **0.9988** |
| Recall | **1.0000** |

**Final-epoch validation set** (from `results.csv`, epoch 80/80 — reported separately since it's a different split from the test-set numbers above, not a discrepancy):

| Metric | Value |
|---|---|
| Precision | 0.9994 |
| Recall | 1.0000 |
| mAP50 | 0.995 |
| mAP50-95 | 0.916 |

Both splits agree closely on precision/recall/mAP50; the test-set mAP50-95 (0.9447) is meaningfully higher than the final validation epoch's (0.916) — expected sample-to-sample variance on a fairly small held-out set (79 images), not a red flag.

## 5. Interpretation, plainly

Precision/recall this high on a single-class detector against a fairly constrained, consistent capture setup (fixed kiosk camera angle, one object class) is a real, credible result — not automatically suspicious the way it might be for a much harder multi-class problem. The honest caveats:

- **Small test set** (79 images) — confidence intervals on these numbers are wide; treat 0.995 as "very strong on this dataset," not as a guarantee against real-world conditions the dataset doesn't cover (unusual bottle shapes/labels, lighting the kiosk's camera hasn't seen, partial occlusion mid-drop).
- **Single source dataset** — no cross-dataset validation was done (the `magical-nightingale` dataset from a collaborator was found but never pulled in — see `memory.md`, 2026-08-10 — and the "search for external Roboflow/Kaggle sources" plan in `07-ai-detection-improvements.md` was explicitly dropped by user instruction in favor of relying on YOLO's built-in augmentation). A model this strong on one dataset's test split is a real result but not the same claim as "generalizes to bottles this dataset never saw."
- **This is the detector only.** End-to-end system reliability also depends on the classifier stage (brand/volume/condition — unretrained, still the original weights) and the physical/firmware pipeline (camera framing, conveyor timing, the best-of-N frame selection added 2026-08-11).

## 6. What's not in this report

- **Classifier evaluation** — `best_classifier.pt` is the original (April 2026) training run, not retrained this session. No fresh eval numbers exist for it. If the thesis needs classifier metrics, that's a separate, not-yet-done training + evaluation pass (`scripts/train_bottle_classifier.py`).
- **Real-world / field accuracy** — everything above is against the Roboflow test split, not live kiosk usage. Phase H's "pilot deployment findings" item is separate and blocked on hardware access.
- **A/B or ablation comparisons** — this is a single fine-tuning run's result, not a comparison against a baseline or alternative hyperparameters.
