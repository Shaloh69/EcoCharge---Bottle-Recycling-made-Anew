"""
EcoCharge - Bottle Detection & Attribute Prediction
====================================================
Runs the trained YOLO model on images/video and optionally predicts
bottle attributes (brand, volume, condition).

Usage:
    python scripts/predict.py --source path/to/image.jpg
    python scripts/predict.py --source path/to/directory/
    python scripts/predict.py --source 0                     # Webcam
    python scripts/predict.py --source path/to/video.mp4
    python scripts/predict.py --source image.jpg --save      # Save annotated output
"""

import argparse
import pickle
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WEIGHTS = PROJECT_ROOT / "runs" / "detect" / "ecocharge_bottle_det" / "weights" / "best.pt"
CLASSIFIER_PATH = PROJECT_ROOT / "runs" / "classifier" / "bottle_attribute_models.pkl"


def parse_args():
    parser = argparse.ArgumentParser(
        description="EcoCharge bottle detection and attribute prediction"
    )
    parser.add_argument(
        "--source",
        type=str,
        required=True,
        help="Image, directory, video, or webcam (0)",
    )
    parser.add_argument(
        "--weights",
        type=str,
        default=str(DEFAULT_WEIGHTS),
        help="Path to YOLO weights (default: best.pt from training)",
    )
    parser.add_argument(
        "--conf", type=float, default=0.25, help="Confidence threshold (default: 0.25)"
    )
    parser.add_argument(
        "--iou", type=float, default=0.45, help="NMS IoU threshold (default: 0.45)"
    )
    parser.add_argument(
        "--imgsz", type=int, default=640, help="Inference image size (default: 640)"
    )
    parser.add_argument(
        "--save", action="store_true", help="Save annotated results"
    )
    parser.add_argument(
        "--show", action="store_true", help="Display results in a window"
    )
    parser.add_argument(
        "--device", type=str, default="", help="Device: '' auto, 'cpu', '0' GPU"
    )
    return parser.parse_args()


def load_attribute_models():
    """Load bottle attribute classifiers if available."""
    if CLASSIFIER_PATH.exists():
        with open(CLASSIFIER_PATH, "rb") as f:
            models = pickle.load(f)
        print("Loaded bottle attribute classifiers")
        return models
    return None


def predict(args):
    from ultralytics import YOLO

    weights_path = Path(args.weights)
    if not weights_path.exists():
        print(f"ERROR: Weights not found at {weights_path}")
        print("Train first: python scripts/train_yolo.py")
        sys.exit(1)

    print("=" * 60)
    print("EcoCharge - Bottle Detection")
    print("=" * 60)
    print(f"  Weights: {args.weights}")
    print(f"  Source:  {args.source}")
    print(f"  Conf:    {args.conf}")
    print()

    model = YOLO(args.weights)
    attr_models = load_attribute_models()

    results = model.predict(
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
        print(f"\n{source_name}: {n_bottles} bottle(s) detected")

        for i, box in enumerate(boxes):
            conf = box.conf[0].item()
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            w = x2 - x1
            h = y2 - y1
            print(f"  Bottle {i+1}: conf={conf:.2f}, bbox=[{x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}], size={w:.0f}x{h:.0f}")

    print(f"\nTotal: {total_bottles} bottle(s) detected across all inputs")

    if args.save:
        print(f"Results saved to: {PROJECT_ROOT}/runs/predict/ecocharge/")


if __name__ == "__main__":
    args = parse_args()
    predict(args)
