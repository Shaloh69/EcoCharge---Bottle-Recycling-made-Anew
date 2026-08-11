# EcoCharge — AI Inference Server

The two-stage bottle detection & classification service the kiosk calls (via `client/kiosk_web`'s server-side proxy — this service is never called directly by a client).

## Pipeline

1. **YOLO26 detector** (`models/best_detector.pt`, confidence threshold 0.40, env-overridable via `CONF_THRESHOLD`) localizes the bottle in the frame; the highest-confidence box wins.
2. Crop (+5px pad) → **`BottleAttributeNet`** (`app/model_arch.py`): an EfficientNet-B0 backbone with three heads — brand, volume (mL), condition — each with its own softmax confidence, loaded from `models/best_classifier.pt`.

Full request/response shape and the actual pipeline code walkthrough: `app/inference.py`, `app/main.py`.

## Stack

Python + FastAPI + PyTorch/Ultralytics. GPU used when available (`torch.cuda.is_available()`), CPU fallback.

## Running

```bash
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Requires `AI_API_KEY`, `YOLO_WEIGHTS`, `CLASSIFIER_WEIGHTS`, `CONF_THRESHOLD` — see `.env.example`. Full training-from-scratch and self-hosting-behind-a-tunnel walkthrough: `../../docs/planning/12-self-hosting-guide.md`.

## Auth

`X-Api-Key` header (with `Authorization: Bearer` fallback, since Cloudflare tunnels can strip `Authorization` on multipart bodies). `GET /health` is unauthenticated.

## A known detection-quality issue

There's a real, diagnosed problem with bottles not being reliably detected while still moving/positioned on the conveyor — the root cause traces to the kiosk-side capture timing and the training dataset's size/domain match, not this service's inference code. Full diagnosis, dataset-expansion plan with real candidate sources, and prioritized fixes: `../../docs/planning/07-ai-detection-improvements.md`.
