"""
EcoCharge - YOLO26 Plastic Bottle Detection Training Script
============================================================
Trains a YOLO26 model to detect plastic bottles in images.
YOLO26 is Ultralytics' latest model (Jan 2026) with NMS-free end-to-end
inference, optimized for edge devices.

Usage:
    python scripts/train_yolo.py                         # Train with defaults (yolo26n)
    python scripts/train_yolo.py --model yolo26s         # Train with small model
    python scripts/train_yolo.py --model yolo26m         # Train with medium model
    python scripts/train_yolo.py --epochs 200            # Custom epoch count
    python scripts/train_yolo.py --resume runs/detect/train/weights/last.pt

Available YOLO26 models (smallest to largest):
    yolo26n  - Nano    - Fastest, ideal for edge/mobile deployment
    yolo26s  - Small   - Good balance of speed and accuracy
    yolo26m  - Medium  - Higher accuracy
    yolo26l  - Large   - High accuracy
    yolo26x  - XLarge  - Highest accuracy, slowest
"""

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "scripts" / "dataset" / "Eco-Charge.v1"
DATA_YAML = DATASET_DIR / "data.yaml"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train YOLO26 for EcoCharge plastic bottle detection"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolo26n.pt",
        help="YOLO26 model: yolo26n.pt, yolo26s.pt, yolo26m.pt, yolo26l.pt, yolo26x.pt (default: yolo26n.pt)",
    )
    parser.add_argument(
        "--epochs", type=int, default=100, help="Number of training epochs (default: 100)"
    )
    parser.add_argument(
        "--batch", type=int, default=16, help="Batch size (default: 16, fits RTX 3050 8GB)"
    )
    parser.add_argument(
        "--imgsz", type=int, default=640, help="Input image size (default: 640)"
    )
    parser.add_argument(
        "--device",
        type=str,
        default="",
        help="Device: '' for auto, 'cpu', '0' for GPU 0, '0,1' for multi-GPU",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Path to last.pt to resume training from a checkpoint",
    )
    parser.add_argument(
        "--name",
        type=str,
        default="ecocharge_bottle_det",
        help="Run name for saving results (default: ecocharge_bottle_det)",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=50,
        help="Early stopping patience in epochs (default: 50)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of data loading workers (default: 4, safe for Windows)",
    )
    return parser.parse_args()


def prepare_data_yaml():
    """
    Generate a runtime data.yaml with the correct absolute path for the
    current OS. This avoids hardcoding Linux/Windows paths in the checked-in
    data.yaml and works cross-platform.
    """
    import yaml

    if not DATA_YAML.exists():
        print(f"ERROR: data.yaml not found at {DATA_YAML}")
        sys.exit(1)

    with open(DATA_YAML) as f:
        data = yaml.safe_load(f)

    # Set the absolute path to the dataset root (works on Windows + Linux)
    data["path"] = str(DATASET_DIR.resolve())

    runtime_yaml = DATASET_DIR / "data_runtime.yaml"
    with open(runtime_yaml, "w") as f:
        yaml.dump(data, f, default_flow_style=False)

    print(f"  Runtime data.yaml: {runtime_yaml}")
    print(f"  Dataset root:      {DATASET_DIR.resolve()}")
    return runtime_yaml


def validate_dataset():
    """Verify dataset structure before training."""
    for split in ["train", "valid", "test"]:
        img_dir = DATASET_DIR / split / "images"
        lbl_dir = DATASET_DIR / split / "labels"
        if not img_dir.exists():
            print(f"ERROR: {split} images directory not found at {img_dir}")
            sys.exit(1)
        if not lbl_dir.exists():
            print(f"ERROR: {split} labels directory not found at {lbl_dir}")
            sys.exit(1)
        n_images = len(list(img_dir.glob("*.jpg")))
        n_labels = len(list(lbl_dir.glob("*.txt")))
        print(f"  {split:>6}: {n_images} images, {n_labels} labels")

    print()


def train(args):
    """Run YOLO26 training."""
    from ultralytics import YOLO

    print("=" * 60)
    print("EcoCharge - YOLO26 Bottle Detection Training")
    print("=" * 60)
    print()

    # Prepare cross-platform data.yaml and validate dataset
    print("Preparing dataset...")
    runtime_yaml = prepare_data_yaml()
    validate_dataset()

    # Load model
    if args.resume:
        print(f"Resuming training from: {args.resume}")
        model = YOLO(args.resume)
    else:
        model_name = args.model if args.model.endswith(".pt") else f"{args.model}.pt"
        print(f"Loading pretrained YOLO26 model: {model_name}")
        model = YOLO(model_name)

    # Training configuration
    train_kwargs = dict(
        data=str(runtime_yaml),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        patience=args.patience,
        name=args.name,
        project=str(PROJECT_ROOT / "runs" / "detect"),
        workers=args.workers,
        exist_ok=True,
        # Augmentation settings tuned for bottle detection
        hsv_h=0.015,       # Hue augmentation
        hsv_s=0.7,         # Saturation augmentation
        hsv_v=0.4,         # Value augmentation
        degrees=10.0,      # Rotation (+/- degrees)
        translate=0.1,     # Translation (+/- fraction)
        scale=0.5,         # Scale (+/- gain)
        flipud=0.0,        # No vertical flip (bottles have orientation)
        fliplr=0.5,        # Horizontal flip
        mosaic=1.0,        # Mosaic augmentation
        mixup=0.1,         # Mixup augmentation
        # Optimization
        optimizer="auto",
        lr0=0.01,          # Initial learning rate
        lrf=0.01,          # Final learning rate (lr0 * lrf)
        warmup_epochs=3.0,
        warmup_momentum=0.8,
        cos_lr=True,       # Cosine learning rate scheduler
        # GPU optimization (RTX 3050 / similar)
        amp=True,          # Mixed precision (FP16) - halves VRAM usage
        cache=True,        # Cache images in RAM for faster training
        # Saving
        save=True,
        save_period=10,    # Save checkpoint every 10 epochs
        plots=True,        # Generate training plots
    )

    if args.device:
        train_kwargs["device"] = args.device

    if args.resume:
        train_kwargs["resume"] = True

    print("Training configuration:")
    for k, v in train_kwargs.items():
        if k != "data":
            print(f"  {k}: {v}")
    print()

    # Train
    results = model.train(**train_kwargs)

    # Validate on test set
    print("\n" + "=" * 60)
    print("Evaluating on test set...")
    print("=" * 60)
    metrics = model.val(data=str(runtime_yaml), split="test")

    print("\nTest Results:")
    print(f"  mAP50:    {metrics.box.map50:.4f}")
    print(f"  mAP50-95: {metrics.box.map:.4f}")
    print(f"  Precision: {metrics.box.mp:.4f}")
    print(f"  Recall:    {metrics.box.mr:.4f}")

    # Print output locations
    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)
    print(f"  Best weights: {PROJECT_ROOT}/runs/detect/{args.name}/weights/best.pt")
    print(f"  Last weights: {PROJECT_ROOT}/runs/detect/{args.name}/weights/last.pt")
    print(f"  Results:      {PROJECT_ROOT}/runs/detect/{args.name}/")
    print()
    print("Next steps:")
    print("  1. Run inference:     python scripts/predict.py --source <image_or_dir>")
    print("  2. Train classifier:  python scripts/train_bottle_classifier.py")

    return results


if __name__ == "__main__":
    args = parse_args()
    train(args)
