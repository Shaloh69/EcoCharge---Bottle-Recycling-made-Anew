"""
EcoCharge inference module.

Wraps the two-stage pipeline (YOLO26 detection → CNN attribute classification)
into a single callable used by the FastAPI service.

Models are loaded once at startup; `run()` is safe to call from multiple requests.
"""
from __future__ import annotations

import os
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

from .model_arch import BottleAttributeNet

# ---------------------------------------------------------------------------
# Paths (override via env vars for flexibility on RunPod)
# ---------------------------------------------------------------------------
_BASE = Path(__file__).resolve().parent.parent
YOLO_WEIGHTS = Path(os.environ.get("YOLO_WEIGHTS", str(_BASE / "models" / "best_detector.pt")))
CLASSIFIER_WEIGHTS = Path(
    os.environ.get("CLASSIFIER_WEIGHTS", str(_BASE / "models" / "best_classifier.pt"))
)
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", "0.40"))

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

    if not YOLO_WEIGHTS.exists():
        raise FileNotFoundError(f"YOLO weights not found: {YOLO_WEIGHTS}")
    _yolo = YOLO(str(YOLO_WEIGHTS))

    if not CLASSIFIER_WEIGHTS.exists():
        raise FileNotFoundError(f"Classifier weights not found: {CLASSIFIER_WEIGHTS}")

    checkpoint = torch.load(str(CLASSIFIER_WEIGHTS), map_location=_device, weights_only=False)
    label_maps: dict = checkpoint["label_maps"]
    backbone: str = checkpoint.get("backbone", "efficientnet_b0")
    imgsz: int = checkpoint.get("imgsz", 224)

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

    _cls_transform = transforms.Compose([
        transforms.Resize((imgsz, imgsz)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


@torch.no_grad()
def _classify_crop(crop: Image.Image) -> dict:
    tensor = _cls_transform(crop).unsqueeze(0).to(_device)
    outputs = _classifier(tensor)

    brand_idx = outputs["brand"].argmax(dim=1).item()
    volume_idx = outputs["volume"].argmax(dim=1).item()
    condition_idx = outputs["condition"].argmax(dim=1).item()

    return {
        "brand": _inv_maps["brand"][brand_idx],
        "brand_confidence": torch.softmax(outputs["brand"], dim=1).max().item(),
        "volume_ml": int(_inv_maps["volume"][volume_idx]),
        "volume_confidence": torch.softmax(outputs["volume"], dim=1).max().item(),
        "condition": _inv_maps["condition"][condition_idx],
        "condition_confidence": torch.softmax(outputs["condition"], dim=1).max().item(),
    }


def run(image: Image.Image) -> dict:
    """Run the full two-stage pipeline on a PIL image.

    Returns a dict:
    {
        "detected": bool,
        "confidence": float | None,
        "bounding_box": [x1, y1, x2, y2] | None,
        "brand": str | None,
        "brand_confidence": float | None,
        "volume_ml": int | None,
        "volume_confidence": float | None,
        "condition": str | None,
        "condition_confidence": float | None,
    }
    """
    if _yolo is None:
        raise RuntimeError("Models not loaded. Call load_models() first.")

    results = _yolo.predict(
        source=image,
        conf=CONF_THRESHOLD,
        verbose=False,
        device=str(_device),
    )

    result = results[0]
    boxes = result.boxes

    if len(boxes) == 0:
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

    # Use the highest-confidence detection
    best_idx = int(boxes.conf.argmax())
    conf = float(boxes.conf[best_idx].item())
    x1, y1, x2, y2 = [float(v) for v in boxes.xyxy[best_idx].tolist()]

    pad = 5
    w, h = image.size
    crop = image.crop((
        max(0, int(x1) - pad),
        max(0, int(y1) - pad),
        min(w, int(x2) + pad),
        min(h, int(y2) + pad),
    ))

    attrs = _classify_crop(crop)

    return {
        "detected": True,
        "confidence": round(conf, 4),
        "bounding_box": [round(x1), round(y1), round(x2), round(y2)],
        **attrs,
    }
