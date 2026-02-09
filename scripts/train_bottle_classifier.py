"""
EcoCharge - Deep Learning Bottle Attribute Classifier
======================================================
Trains a CNN-based classification head to predict bottle attributes
(brand, volume, condition) from cropped bottle images.

Architecture:
  Stage 1: YOLO26 detects bottle bounding boxes
  Stage 2: This classifier (EfficientNet-B0 backbone) predicts attributes
           from the cropped bottle region.

The model uses a shared CNN backbone with three output heads:
  - Brand head:     classifies into 10 brands (Coca-Cola, Sprite, Royal, etc.)
  - Volume head:    classifies into volume categories (190ml, 237ml, ..., 1500ml)
  - Condition head: binary classification (perfect / imperfect)

Labels come from bottle_measurements.csv which maps each image filename to
its brand, volume_ml, height_cm, and condition.

Usage:
    python scripts/train_bottle_classifier.py
    python scripts/train_bottle_classifier.py --epochs 50 --batch 16
    python scripts/train_bottle_classifier.py --backbone resnet18
"""

import argparse
import json
import os
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import models, transforms

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "scripts" / "dataset" / "Eco-Charge.v1"
CSV_PATH = DATASET_DIR / "bottle_measurements.csv"
OUTPUT_DIR = PROJECT_ROOT / "runs" / "classifier"


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

BRAND_NORMALIZE = {
    "7-Up": "7-UP",
    "Pocari-Sweat": "Pocari",
    "Nature Spring": "Natures Spring",
}


def load_and_clean_csv():
    """Load bottle_measurements.csv and clean data inconsistencies."""
    df = pd.read_csv(CSV_PATH)
    df = df.dropna(subset=["filename"]).reset_index(drop=True)
    df = df.drop_duplicates(subset=["filename"]).reset_index(drop=True)
    df["brand"] = df["brand"].replace(BRAND_NORMALIZE)
    return df


def build_label_maps(df):
    """Build label-to-index mappings for each attribute."""
    brands = sorted(df["brand"].unique().tolist())
    volumes = sorted(df["volume_ml"].unique().tolist())
    conditions = sorted(df["condition"].unique().tolist())

    label_maps = {
        "brand": {b: i for i, b in enumerate(brands)},
        "volume": {v: i for i, v in enumerate(volumes)},
        "condition": {c: i for i, c in enumerate(conditions)},
    }
    return label_maps


def find_image_path(filename, splits=("train", "valid", "test")):
    """Locate an image file across dataset splits."""
    for split in splits:
        path = DATASET_DIR / split / "images" / filename
        if path.exists():
            return path, split
    return None, None


class BottleCropDataset(Dataset):
    """
    Loads bottle images and crops them using YOLO annotation bounding boxes.
    Labels come from bottle_measurements.csv.
    """

    def __init__(self, df, label_maps, transform=None):
        self.transform = transform
        self.label_maps = label_maps
        self.samples = []

        for _, row in df.iterrows():
            img_path, split = find_image_path(row["filename"])
            if img_path is None:
                continue

            # Read corresponding YOLO label for the bounding box
            label_path = img_path.parent.parent / "labels" / (img_path.stem + ".txt")

            self.samples.append({
                "img_path": str(img_path),
                "label_path": str(label_path) if label_path.exists() else None,
                "brand": label_maps["brand"][row["brand"]],
                "volume": label_maps["volume"][row["volume_ml"]],
                "condition": label_maps["condition"][row["condition"]],
            })

        print(f"  Dataset: {len(self.samples)} samples loaded")

    def __len__(self):
        return len(self.samples)

    def _crop_bottle(self, img, label_path):
        """Crop the bottle region using the YOLO bounding box annotation."""
        if label_path is None or not Path(label_path).exists():
            return img

        w_img, h_img = img.size
        with open(label_path) as f:
            lines = f.read().strip().split("\n")

        if not lines or not lines[0].strip():
            return img

        # Use the first annotation (largest bottle if multiple)
        parts = lines[0].strip().split()
        if len(parts) < 5:
            return img

        # YOLO format: class x_center y_center width height (normalized)
        cx, cy, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

        # Convert to pixel coordinates with small padding
        pad = 0.05
        x1 = max(0, int((cx - bw / 2 - pad) * w_img))
        y1 = max(0, int((cy - bh / 2 - pad) * h_img))
        x2 = min(w_img, int((cx + bw / 2 + pad) * w_img))
        y2 = min(h_img, int((cy + bh / 2 + pad) * h_img))

        if x2 - x1 < 10 or y2 - y1 < 10:
            return img

        return img.crop((x1, y1, x2, y2))

    def __getitem__(self, idx):
        sample = self.samples[idx]

        img = Image.open(sample["img_path"]).convert("RGB")
        img = self._crop_bottle(img, sample["label_path"])

        if self.transform:
            img = self.transform(img)

        labels = {
            "brand": torch.tensor(sample["brand"], dtype=torch.long),
            "volume": torch.tensor(sample["volume"], dtype=torch.long),
            "condition": torch.tensor(sample["condition"], dtype=torch.long),
        }
        return img, labels


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class BottleAttributeNet(nn.Module):
    """
    Multi-head CNN classifier for bottle attributes.

    Shared backbone (EfficientNet-B0 or ResNet-18) extracts features,
    then three separate heads predict brand, volume, and condition.
    """

    def __init__(self, num_brands, num_volumes, num_conditions, backbone="efficientnet_b0"):
        super().__init__()

        if backbone == "efficientnet_b0":
            self.backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
            feat_dim = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Identity()
        elif backbone == "resnet18":
            self.backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
            feat_dim = self.backbone.fc.in_features
            self.backbone.fc = nn.Identity()
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")

        # Shared embedding layer
        self.shared = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
        )

        # Task-specific heads
        self.brand_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_brands),
        )

        self.volume_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_volumes),
        )

        self.condition_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_conditions),
        )

    def forward(self, x):
        features = self.backbone(x)
        shared = self.shared(features)
        return {
            "brand": self.brand_head(shared),
            "volume": self.volume_head(shared),
            "condition": self.condition_head(shared),
        }


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def get_transforms(imgsz=224):
    """Data augmentation transforms for training and validation."""
    train_tf = transforms.Compose([
        transforms.Resize((imgsz, imgsz)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((imgsz, imgsz)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


def train_one_epoch(model, loader, optimizer, criterion, device):
    model.train()
    running_loss = 0.0
    correct = {"brand": 0, "volume": 0, "condition": 0}
    total = 0

    for images, labels in loader:
        images = images.to(device)
        targets = {k: v.to(device) for k, v in labels.items()}

        optimizer.zero_grad()
        outputs = model(images)

        loss = (
            criterion(outputs["brand"], targets["brand"])
            + criterion(outputs["volume"], targets["volume"])
            + criterion(outputs["condition"], targets["condition"])
        )

        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        total += images.size(0)

        for key in correct:
            preds = outputs[key].argmax(dim=1)
            correct[key] += (preds == targets[key]).sum().item()

    avg_loss = running_loss / total
    accs = {k: v / total for k, v in correct.items()}
    return avg_loss, accs


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = {"brand": 0, "volume": 0, "condition": 0}
    total = 0

    for images, labels in loader:
        images = images.to(device)
        targets = {k: v.to(device) for k, v in labels.items()}

        outputs = model(images)

        loss = (
            criterion(outputs["brand"], targets["brand"])
            + criterion(outputs["volume"], targets["volume"])
            + criterion(outputs["condition"], targets["condition"])
        )

        running_loss += loss.item() * images.size(0)
        total += images.size(0)

        for key in correct:
            preds = outputs[key].argmax(dim=1)
            correct[key] += (preds == targets[key]).sum().item()

    avg_loss = running_loss / total
    accs = {k: v / total for k, v in correct.items()}
    return avg_loss, accs


def plot_training_history(history, output_path):
    """Plot training loss and accuracy curves."""
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("EcoCharge Bottle Classifier - Training History", fontsize=14)

    epochs = range(1, len(history["train_loss"]) + 1)

    # Loss
    axes[0, 0].plot(epochs, history["train_loss"], label="Train")
    axes[0, 0].plot(epochs, history["val_loss"], label="Val")
    axes[0, 0].set_title("Loss")
    axes[0, 0].set_xlabel("Epoch")
    axes[0, 0].legend()

    # Brand accuracy
    axes[0, 1].plot(epochs, history["train_brand_acc"], label="Train")
    axes[0, 1].plot(epochs, history["val_brand_acc"], label="Val")
    axes[0, 1].set_title("Brand Accuracy")
    axes[0, 1].set_xlabel("Epoch")
    axes[0, 1].legend()

    # Volume accuracy
    axes[1, 0].plot(epochs, history["train_volume_acc"], label="Train")
    axes[1, 0].plot(epochs, history["val_volume_acc"], label="Val")
    axes[1, 0].set_title("Volume Accuracy")
    axes[1, 0].set_xlabel("Epoch")
    axes[1, 0].legend()

    # Condition accuracy
    axes[1, 1].plot(epochs, history["train_condition_acc"], label="Train")
    axes[1, 1].plot(epochs, history["val_condition_acc"], label="Val")
    axes[1, 1].set_title("Condition Accuracy")
    axes[1, 1].set_xlabel("Epoch")
    axes[1, 1].legend()

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()


def main():
    parser = argparse.ArgumentParser(description="Train bottle attribute classifier")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs (default: 30)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate (default: 1e-3)")
    parser.add_argument("--imgsz", type=int, default=224, help="Image size for CNN (default: 224)")
    parser.add_argument(
        "--backbone",
        type=str,
        default="efficientnet_b0",
        choices=["efficientnet_b0", "resnet18"],
        help="CNN backbone (default: efficientnet_b0)",
    )
    parser.add_argument("--device", type=str, default="", help="Device (default: auto)")
    args = parser.parse_args()

    print("=" * 60)
    print("EcoCharge - Bottle Attribute Classifier (Deep Learning)")
    print("=" * 60)
    print()

    # Device
    if args.device:
        device = torch.device(args.device)
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    print(f"Device: {device}")

    # Load and prepare data
    print("\nLoading bottle_measurements.csv...")
    df = load_and_clean_csv()
    label_maps = build_label_maps(df)

    print(f"\nLabel maps:")
    print(f"  Brands ({len(label_maps['brand'])}):     {list(label_maps['brand'].keys())}")
    print(f"  Volumes ({len(label_maps['volume'])}):    {list(label_maps['volume'].keys())}")
    print(f"  Conditions ({len(label_maps['condition'])}): {list(label_maps['condition'].keys())}")

    # Split CSV into train/val using the existing dataset splits
    train_filenames = set(p.name for p in (DATASET_DIR / "train" / "images").glob("*.jpg"))
    val_filenames = set(p.name for p in (DATASET_DIR / "valid" / "images").glob("*.jpg"))
    test_filenames = set(p.name for p in (DATASET_DIR / "test" / "images").glob("*.jpg"))

    train_df = df[df["filename"].isin(train_filenames)].reset_index(drop=True)
    val_df = df[df["filename"].isin(val_filenames | test_filenames)].reset_index(drop=True)

    print(f"\nSplits:")
    print(f"  Train: {len(train_df)} images with CSV labels")
    print(f"  Val:   {len(val_df)} images with CSV labels")

    # Datasets
    train_tf, val_tf = get_transforms(args.imgsz)

    print("\nBuilding train dataset...")
    train_ds = BottleCropDataset(train_df, label_maps, transform=train_tf)
    print("Building val dataset...")
    val_ds = BottleCropDataset(val_df, label_maps, transform=val_tf)

    if len(train_ds) == 0:
        print("ERROR: No training samples found. Check that CSV filenames match image files.")
        sys.exit(1)

    # Weighted sampler for brand imbalance
    brand_labels = [s["brand"] for s in train_ds.samples]
    class_counts = np.bincount(brand_labels, minlength=len(label_maps["brand"]))
    class_weights = 1.0 / np.maximum(class_counts, 1).astype(float)
    sample_weights = [class_weights[label] for label in brand_labels]
    sampler = WeightedRandomSampler(sample_weights, len(sample_weights))

    train_loader = DataLoader(train_ds, batch_size=args.batch, sampler=sampler, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch, shuffle=False, num_workers=4)

    # Model
    model = BottleAttributeNet(
        num_brands=len(label_maps["brand"]),
        num_volumes=len(label_maps["volume"]),
        num_conditions=len(label_maps["condition"]),
        backbone=args.backbone,
    ).to(device)

    param_count = sum(p.numel() for p in model.parameters())
    trainable_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nModel: BottleAttributeNet ({args.backbone} backbone)")
    print(f"  Parameters:  {param_count:,}")
    print(f"  Trainable:   {trainable_count:,}")

    # Optimizer and scheduler
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # Training loop
    print(f"\nTraining for {args.epochs} epochs...")
    print("-" * 80)

    history = {
        "train_loss": [], "val_loss": [],
        "train_brand_acc": [], "val_brand_acc": [],
        "train_volume_acc": [], "val_volume_acc": [],
        "train_condition_acc": [], "val_condition_acc": [],
    }

    best_val_loss = float("inf")
    best_epoch = 0
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    best_weights_path = OUTPUT_DIR / "best_classifier.pt"

    for epoch in range(1, args.epochs + 1):
        train_loss, train_accs = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_accs = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        for key in ["brand", "volume", "condition"]:
            history[f"train_{key}_acc"].append(train_accs[key])
            history[f"val_{key}_acc"].append(val_accs[key])

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            torch.save({
                "model_state_dict": model.state_dict(),
                "label_maps": label_maps,
                "backbone": args.backbone,
                "imgsz": args.imgsz,
            }, best_weights_path)

        lr = optimizer.param_groups[0]["lr"]
        print(
            f"Epoch {epoch:3d}/{args.epochs} | "
            f"loss: {train_loss:.4f}/{val_loss:.4f} | "
            f"brand: {train_accs['brand']:.3f}/{val_accs['brand']:.3f} | "
            f"vol: {train_accs['volume']:.3f}/{val_accs['volume']:.3f} | "
            f"cond: {train_accs['condition']:.3f}/{val_accs['condition']:.3f} | "
            f"lr: {lr:.6f}"
        )

    # Save final model
    final_path = OUTPUT_DIR / "last_classifier.pt"
    torch.save({
        "model_state_dict": model.state_dict(),
        "label_maps": label_maps,
        "backbone": args.backbone,
        "imgsz": args.imgsz,
    }, final_path)

    # Save label maps as JSON for easy loading
    label_maps_json = {}
    for key, mapping in label_maps.items():
        label_maps_json[key] = {str(k): v for k, v in mapping.items()}
    with open(OUTPUT_DIR / "label_maps.json", "w") as f:
        json.dump(label_maps_json, f, indent=2)

    # Plot training history
    plot_training_history(history, OUTPUT_DIR / "training_history.png")

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)
    print(f"  Best epoch:   {best_epoch} (val_loss: {best_val_loss:.4f})")
    print(f"  Best weights: {best_weights_path}")
    print(f"  Last weights: {final_path}")
    print(f"  Label maps:   {OUTPUT_DIR / 'label_maps.json'}")
    print(f"  Plots:        {OUTPUT_DIR / 'training_history.png'}")
    print()
    print("Use with YOLO26 detection:")
    print("  python scripts/predict.py --source <image> --classify")


if __name__ == "__main__":
    main()
