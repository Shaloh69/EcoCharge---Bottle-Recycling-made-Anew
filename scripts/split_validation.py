"""
EcoCharge - carve a validation split out of train/

Real, recurring need, not a one-off: `valid/images` and `valid/labels` can end
up empty (found 2026-08-10 on the desktop-gklhcri training copy - 546
train images, 0 valid images, despite data.yaml pointing val at valid/images).
Training either fails or silently skips validation without one. This moves a
random subset of train pairs into valid rather than duplicating file-shuffle
logic inline in train_yolo.py.

Usage:
    python scripts/split_validation.py                  # default 15%, seed 42
    python scripts/split_validation.py --fraction 0.2
"""

import argparse
import random
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "scripts" / "dataset" / "Eco-Charge.v1"


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fraction",
        type=float,
        default=0.15,
        help="Fraction of train images to move into valid (default: 0.15)",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print what would move without moving anything"
    )
    return parser.parse_args()


def main():
    args = parse_args()

    train_img = DATASET_DIR / "train" / "images"
    train_lbl = DATASET_DIR / "train" / "labels"
    valid_img = DATASET_DIR / "valid" / "images"
    valid_lbl = DATASET_DIR / "valid" / "labels"

    if not train_img.exists():
        raise SystemExit(f"train/images not found at {train_img}")

    valid_img.mkdir(parents=True, exist_ok=True)
    valid_lbl.mkdir(parents=True, exist_ok=True)

    existing_valid = list(valid_img.glob("*.jpg"))
    if existing_valid:
        print(f"valid/images already has {len(existing_valid)} images - nothing to do.")
        return

    images = sorted(train_img.glob("*.jpg"))
    # Only move pairs that actually have a matching label - an image with no
    # label file would silently validate against nothing and is worth
    # surfacing rather than moving quietly.
    pairs = []
    unlabeled = []
    for img in images:
        lbl = train_lbl / f"{img.stem}.txt"
        if lbl.exists():
            pairs.append((img, lbl))
        else:
            unlabeled.append(img)

    if unlabeled:
        print(f"WARNING: {len(unlabeled)} train images have no matching label file, skipping them for the split (left in train/):")
        for u in unlabeled[:10]:
            print(f"    {u.name}")
        if len(unlabeled) > 10:
            print(f"    ...and {len(unlabeled) - 10} more")

    random.seed(args.seed)
    random.shuffle(pairs)

    n_move = max(1, int(len(pairs) * args.fraction))
    to_move = pairs[:n_move]

    print(f"train pairs: {len(pairs)} (+ {len(unlabeled)} unlabeled left as-is)")
    print(f"moving {n_move} pairs ({args.fraction:.0%}) to valid/ (seed={args.seed})")

    if args.dry_run:
        for img, lbl in to_move[:10]:
            print(f"  would move: {img.name}")
        if n_move > 10:
            print(f"  ...and {n_move - 10} more")
        return

    for img, lbl in to_move:
        shutil.move(str(img), str(valid_img / img.name))
        shutil.move(str(lbl), str(valid_lbl / lbl.name))

    print(f"done. train now has {len(pairs) - n_move} pairs, valid has {n_move} pairs.")


if __name__ == "__main__":
    main()
