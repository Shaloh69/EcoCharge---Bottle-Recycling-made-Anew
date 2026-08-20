"""
EcoCharge inference module.

Wraps the two-stage pipeline (YOLO26 detection → CNN attribute classification)
into a single callable used by the FastAPI service.

Models are loaded once at startup; `run()` is safe to call from multiple requests.
"""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

from .model_arch import BottleAttributeNet

logger = logging.getLogger("ecocharge.inference")

# ---------------------------------------------------------------------------
# Paths (override via env vars for flexibility on RunPod)
# ---------------------------------------------------------------------------
_BASE = Path(__file__).resolve().parent.parent
YOLO_WEIGHTS = Path(os.environ.get("YOLO_WEIGHTS", str(_BASE / "models" / "best_detector.pt")))
CLASSIFIER_WEIGHTS = Path(
    os.environ.get("CLASSIFIER_WEIGHTS", str(_BASE / "models" / "best_classifier.pt"))
)
# 0.50 since 2026-08-20 (was 0.40): reconciled with the kiosk's accept floor by
# explicit user decision — one agreed number. Detections the kiosk would reject
# anyway are no longer returned at all. Keep equal to the kiosk's
# ACCEPT_CONFIDENCE (client/kiosk_web/app/session/deposit/page.tsx).
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", "0.50"))

# ---------------------------------------------------------------------------
# Internal state (populated on first load)
# ---------------------------------------------------------------------------
_yolo = None
_classifier = None
_inv_maps: dict | None = None
_cls_transform = None
_device: torch.device | None = None


def _get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_models():
    """Load YOLO and classifier into memory. Called once at app startup."""
    global _yolo, _classifier, _inv_maps, _cls_transform, _device

    from ultralytics import YOLO

    _device = _get_device()
    logger.info(f"Using device: {_device}")
    logger.info(f"YOLO weights   : {YOLO_WEIGHTS}")
    logger.info(f"Classifier     : {CLASSIFIER_WEIGHTS}")
    logger.info(f"Conf threshold : {CONF_THRESHOLD}")

    if not YOLO_WEIGHTS.exists():
        logger.error(f"YOLO weights NOT FOUND: {YOLO_WEIGHTS}")
        raise FileNotFoundError(f"YOLO weights not found: {YOLO_WEIGHTS}")

    t0 = time.perf_counter()
    _yolo = YOLO(str(YOLO_WEIGHTS))
    logger.info(f"YOLO loaded in {int((time.perf_counter()-t0)*1000)}ms")

    if not CLASSIFIER_WEIGHTS.exists():
        logger.error(f"Classifier weights NOT FOUND: {CLASSIFIER_WEIGHTS}")
        raise FileNotFoundError(f"Classifier weights not found: {CLASSIFIER_WEIGHTS}")

    t0 = time.perf_counter()
    checkpoint = torch.load(str(CLASSIFIER_WEIGHTS), map_location=_device, weights_only=False)
    label_maps: dict = checkpoint["label_maps"]
    backbone: str = checkpoint.get("backbone", "efficientnet_b0")
    imgsz: int = checkpoint.get("imgsz", 224)
    logger.info(
        f"Classifier checkpoint loaded in {int((time.perf_counter()-t0)*1000)}ms | "
        f"backbone={backbone} imgsz={imgsz} "
        f"brands={len(label_maps['brand'])} volumes={len(label_maps['volume'])} conditions={len(label_maps['condition'])}"
    )

    _inv_maps = {key: {v: k for k, v in mapping.items()} for key, mapping in label_maps.items()}

    model = BottleAttributeNet(
        num_brands=len(label_maps["brand"]),
        num_volumes=len(label_maps["volume"]),
        num_conditions=len(label_maps["condition"]),
        backbone=backbone,
    ).to(_device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    _classifier = model
    logger.info("Classifier model ready ✔")

    _cls_transform = transforms.Compose([
        transforms.Resize((imgsz, imgsz)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


@torch.no_grad()
def _classify_crop(crop: Image.Image) -> dict:
    t0 = time.perf_counter()
    tensor = _cls_transform(crop).unsqueeze(0).to(_device)
    outputs = _classifier(tensor)

    brand_idx     = outputs["brand"].argmax(dim=1).item()
    volume_idx    = outputs["volume"].argmax(dim=1).item()
    condition_idx = outputs["condition"].argmax(dim=1).item()

    brand     = _inv_maps["brand"][brand_idx]
    volume    = int(_inv_maps["volume"][volume_idx])
    condition = _inv_maps["condition"][condition_idx]
    brand_conf  = round(torch.softmax(outputs["brand"], dim=1).max().item(), 4)
    vol_conf    = round(torch.softmax(outputs["volume"], dim=1).max().item(), 4)
    cond_conf   = round(torch.softmax(outputs["condition"], dim=1).max().item(), 4)

    ms = int((time.perf_counter() - t0) * 1000)
    logger.info(
        f"Classifier {ms}ms | brand={brand}({brand_conf:.0%}) "
        f"vol={volume}mL({vol_conf:.0%}) cond={condition}({cond_conf:.0%})"
    )

    return {
        "brand": brand,
        "brand_confidence": brand_conf,
        "volume_ml": volume,
        "volume_confidence": vol_conf,
        "condition": condition,
        "condition_confidence": cond_conf,
    }


def run(image: Image.Image) -> dict:
    """Run the full two-stage pipeline on a PIL image."""
    if _yolo is None:
        raise RuntimeError("Models not loaded. Call load_models() first.")

    w, h = image.size
    logger.info(f"[Stage 3a] YOLO detection — image {w}x{h}px conf_threshold={CONF_THRESHOLD}")

    t0 = time.perf_counter()
    results = _yolo.predict(
        source=image,
        conf=CONF_THRESHOLD,
        verbose=False,
        device=str(_device),
    )
    yolo_ms = int((time.perf_counter() - t0) * 1000)

    result = results[0]
    boxes  = result.boxes
    logger.info(f"[Stage 3a] YOLO done {yolo_ms}ms — {len(boxes)} detection(s)")

    if len(boxes) == 0:
        logger.info("[Stage 3a] No bottle detected → returning detected=False")
        return {
            "detected": False,
            "confidence": None,
            "bounding_box": None,
            "brand": None,
            "brand_confidence": None,
            "volume_ml": None,
            "volume_confidence": None,
            "condition": None,
            "condition_confidence": None,
        }

    best_idx = int(boxes.conf.argmax())
    conf = float(boxes.conf[best_idx].item())
    x1, y1, x2, y2 = [float(v) for v in boxes.xyxy[best_idx].tolist()]
    logger.info(
        f"[Stage 3a] Best detection conf={conf:.4f} bbox=[{x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}]"
    )

    pad  = 5
    crop = image.crop((
        max(0, int(x1) - pad), max(0, int(y1) - pad),
        min(w, int(x2) + pad), min(h, int(y2) + pad),
    ))
    logger.info(f"[Stage 3b] Classifier — crop size {crop.size}")

    attrs = _classify_crop(crop)

    final = {
        "detected": True,
        "confidence": round(conf, 4),
        "bounding_box": [round(x1), round(y1), round(x2), round(y2)],
        **attrs,
    }
    logger.info(
        f"[Stage 3b] Pipeline complete | detected=True conf={conf:.2%} "
        f"brand={attrs['brand']} vol={attrs['volume_ml']}mL cond={attrs['condition']}"
    )
    return final
