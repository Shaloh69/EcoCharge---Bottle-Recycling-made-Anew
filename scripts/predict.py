"""
EcoCharge - YOLO26 Bottle Detection + Deep Learning Attribute Prediction
=========================================================================
Two-stage inference pipeline:
  1. YOLO26 detects plastic bottle bounding boxes
  2. CNN classifier predicts brand, volume, and condition from each crop

Usage:
    python scripts/predict.py --source path/to/image.jpg
    python scripts/predict.py --source path/to/directory/
    python scripts/predict.py --source 0                          # Webcam
    python scripts/predict.py --source image.jpg --classify       # + attribute prediction
    python scripts/predict.py --source image.jpg --save --classify
"""

import argparse
import json
import sys
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WEIGHTS = PROJECT_ROOT / "runs" / "detect" / "ecocharge_bottle_det" / "weights" / "best.pt"
CLASSIFIER_WEIGHTS = PROJECT_ROOT / "runs" / "classifier" / "best_classifier.pt"
LABEL_MAPS_PATH = PROJECT_ROOT / "runs" / "classifier" / "label_maps.json"


def parse_args():
    parser = argparse.ArgumentParser(
        description="EcoCharge YOLO26 bottle detection + attribute prediction"
    )
    parser.add_argument(
        "--source", type=str, required=True,
        help="Image, directory, video, or webcam (0)",
    )
    parser.add_argument(
        "--weights", type=str, default=str(DEFAULT_WEIGHTS),
        help="Path to YOLO26 weights (default: best.pt from training)",
    )
    parser.add_argument(
        "--classify", action="store_true",
        help="Enable attribute classification (brand, volume, condition)",
    )
    parser.add_argument(
        "--classifier-weights", type=str, default=str(CLASSIFIER_WEIGHTS),
        help="Path to classifier weights",
    )
    parser.add_argument(
        "--conf", type=float, default=0.25,
        help="Confidence threshold (default: 0.25)",
    )
    parser.add_argument(
        "--iou", type=float, default=0.45,
        help="NMS IoU threshold (default: 0.45)",
    )
    parser.add_argument(
        "--imgsz", type=int, default=640,
        help="YOLO inference image size (default: 640)",
    )
    parser.add_argument("--save", action="store_true", help="Save annotated results")
    parser.add_argument("--show", action="store_true", help="Display results in a window")
    parser.add_argument("--device", type=str, default="", help="Device: '' auto, 'cpu', '0' GPU")
    return parser.parse_args()


def load_classifier(weights_path, device):
    """Load the trained bottle attribute classifier."""
    from train_bottle_classifier import BottleAttributeNet

    checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
    label_maps = checkpoint["label_maps"]
    backbone = checkpoint.get("backbone", "efficientnet_b0")
    imgsz = checkpoint.get("imgsz", 224)

    # Invert label maps for decoding
    inv_maps = {}
    for key, mapping in label_maps.items():
        inv_maps[key] = {v: k for k, v in mapping.items()}

    model = BottleAttributeNet(
        num_brands=len(label_maps["brand"]),
        num_volumes=len(label_maps["volume"]),
        num_conditions=len(label_maps["condition"]),
        backbone=backbone,
    ).to(device)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((imgsz, imgsz)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return model, inv_maps, transform


@torch.no_grad()
def classify_crop(crop_img, model, inv_maps, transform, device):
    """Classify a cropped bottle image."""
    img_tensor = transform(crop_img).unsqueeze(0).to(device)
    outputs = model(img_tensor)

    brand_idx = outputs["brand"].argmax(dim=1).item()
    volume_idx = outputs["volume"].argmax(dim=1).item()
    condition_idx = outputs["condition"].argmax(dim=1).item()

    brand_conf = torch.softmax(outputs["brand"], dim=1).max().item()
    vol_conf = torch.softmax(outputs["volume"], dim=1).max().item()
    cond_conf = torch.softmax(outputs["condition"], dim=1).max().item()

    return {
        "brand": inv_maps["brand"][brand_idx],
        "brand_conf": brand_conf,
        "volume_ml": inv_maps["volume"][volume_idx],
        "volume_conf": vol_conf,
        "condition": inv_maps["condition"][condition_idx],
        "condition_conf": cond_conf,
    }


def predict(args):
    from ultralytics import YOLO

    weights_path = Path(args.weights)
    if not weights_path.exists():
        print(f"ERROR: YOLO weights not found at {weights_path}")
        print("Train first: python scripts/train_yolo.py")
        sys.exit(1)

    # Device
    if args.device:
        device = torch.device(args.device)
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")

    print("=" * 60)
    print("EcoCharge - YOLO26 Bottle Detection Pipeline")
    print("=" * 60)
    print(f"  YOLO weights: {args.weights}")
    print(f"  Source:        {args.source}")
    print(f"  Confidence:    {args.conf}")
    print(f"  Classify:      {args.classify}")
    print(f"  Device:        {device}")
    print()

    # Load YOLO26 detection model
    yolo_model = YOLO(args.weights)

    # Load classifier if requested
    classifier = None
    inv_maps = None
    cls_transform = None
    if args.classify:
        cls_weights = Path(args.classifier_weights)
        if cls_weights.exists():
            print("Loading bottle attribute classifier...")
            classifier, inv_maps, cls_transform = load_classifier(cls_weights, device)
            print("  Classifier loaded successfully")
        else:
            print(f"WARNING: Classifier weights not found at {cls_weights}")
            print("  Run: python scripts/train_bottle_classifier.py")
            print("  Proceeding with detection only...")
            args.classify = False
    print()

    # Run YOLO26 detection
    results = yolo_model.predict(
        source=args.source,
        conf=args.conf,
        iou=args.iou,
        imgsz=args.imgsz,
        save=args.save,
        show=args.show,
        device=args.device if args.device else None,
        project=str(PROJECT_ROOT / "runs" / "predict"),
        name="ecocharge",
        exist_ok=True,
    )

    # Process results
    total_bottles = 0
    for result in results:
        boxes = result.boxes
        n_bottles = len(boxes)
        total_bottles += n_bottles

        source_name = Path(result.path).name if result.path else "frame"
        print(f"{source_name}: {n_bottles} bottle(s) detected")

        for i, box in enumerate(boxes):
            conf = box.conf[0].item()
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            info = f"  Bottle {i+1}: conf={conf:.2f}, bbox=[{x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}]"

            # Classify the cropped bottle
            if args.classify and classifier is not None:
                orig_img = Image.open(result.path).convert("RGB") if result.path else None
                if orig_img:
                    pad = 5
                    crop = orig_img.crop((
                        max(0, int(x1) - pad),
                        max(0, int(y1) - pad),
                        min(orig_img.width, int(x2) + pad),
                        min(orig_img.height, int(y2) + pad),
                    ))
                    attrs = classify_crop(crop, classifier, inv_maps, cls_transform, device)
                    info += (
                        f"\n           Brand: {attrs['brand']} ({attrs['brand_conf']:.0%})"
                        f"\n           Volume: {attrs['volume_ml']}ml ({attrs['volume_conf']:.0%})"
                        f"\n           Condition: {attrs['condition']} ({attrs['condition_conf']:.0%})"
                    )

            print(info)

    print(f"\nTotal: {total_bottles} bottle(s) detected")

    if args.save:
        print(f"Results saved to: {PROJECT_ROOT}/runs/predict/ecocharge/")


if __name__ == "__main__":
    args = parse_args()
    predict(args)
