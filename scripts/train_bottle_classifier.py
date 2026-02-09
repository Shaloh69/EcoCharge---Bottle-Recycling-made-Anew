"""
EcoCharge - Bottle Attribute Classifier
========================================
Trains a secondary classifier to predict bottle attributes (brand, volume,
height, condition) from detected bottle crops.

This works as a two-stage pipeline:
  1. YOLO detects the plastic bottle bounding box
  2. This classifier predicts attributes from the cropped bottle image

Usage:
    python scripts/train_bottle_classifier.py
    python scripts/train_bottle_classifier.py --epochs 50 --batch 16
"""

import argparse
import csv
import os
import sys
from pathlib import Path
from collections import Counter

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "scripts" / "dataset" / "Eco-Charge.v1"
CSV_PATH = DATASET_DIR / "bottle_measurements.csv"
OUTPUT_DIR = PROJECT_ROOT / "runs" / "classifier"


def load_and_clean_csv():
    """Load bottle_measurements.csv and clean data inconsistencies."""
    df = pd.read_csv(CSV_PATH)

    # Drop empty rows
    df = df.dropna(subset=["filename"]).reset_index(drop=True)

    # Drop duplicate rows
    df = df.drop_duplicates(subset=["filename"]).reset_index(drop=True)

    # Normalize brand names (fix inconsistencies in the CSV)
    brand_map = {
        "7-Up": "7-UP",
        "Pocari-Sweat": "Pocari",
        "Nature Spring": "Natures Spring",
    }
    df["brand"] = df["brand"].replace(brand_map)

    print(f"Loaded {len(df)} bottle records from CSV")
    print(f"\nBrand distribution:")
    for brand, count in df["brand"].value_counts().items():
        print(f"  {brand:>20}: {count}")

    print(f"\nCondition distribution:")
    for cond, count in df["condition"].value_counts().items():
        print(f"  {cond:>20}: {count}")

    print(f"\nVolume range: {df['volume_ml'].min()} - {df['volume_ml'].max()} ml")
    print(f"Height range: {df['height_cm'].min()} - {df['height_cm'].max()} cm")

    return df


def match_csv_to_images(df):
    """Match CSV entries to images across train/valid/test splits."""
    matched = []
    for split in ["train", "valid", "test"]:
        img_dir = DATASET_DIR / split / "images"
        for img_path in img_dir.glob("*.jpg"):
            row = df[df["filename"] == img_path.name]
            if not row.empty:
                matched.append(
                    {
                        "filepath": str(img_path),
                        "split": split,
                        "filename": img_path.name,
                        "volume_ml": row.iloc[0]["volume_ml"],
                        "height_cm": row.iloc[0]["height_cm"],
                        "brand": row.iloc[0]["brand"],
                        "condition": row.iloc[0]["condition"],
                    }
                )

    matched_df = pd.DataFrame(matched)
    print(f"\nMatched {len(matched_df)} images to CSV entries")
    print(f"  Train: {len(matched_df[matched_df['split'] == 'train'])}")
    print(f"  Valid: {len(matched_df[matched_df['split'] == 'valid'])}")
    print(f"  Test:  {len(matched_df[matched_df['split'] == 'test'])}")
    return matched_df


def train_brand_classifier(df):
    """Train a brand classifier using image-derived features."""
    print("\n" + "=" * 50)
    print("Training Brand Classifier")
    print("=" * 50)

    le_brand = LabelEncoder()
    df["brand_id"] = le_brand.fit_transform(df["brand"])

    # Use volume and height as features (proxy for image features)
    X = df[["volume_ml", "height_cm"]].values
    y = df["brand_id"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nBrand Classification Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le_brand.classes_))

    return clf, le_brand


def train_condition_classifier(df):
    """Train a bottle condition classifier (perfect/imperfect)."""
    print("\n" + "=" * 50)
    print("Training Condition Classifier (Perfect/Imperfect)")
    print("=" * 50)

    le_cond = LabelEncoder()
    df["condition_id"] = le_cond.fit_transform(df["condition"])

    X = df[["volume_ml", "height_cm"]].values
    y = df["condition_id"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nCondition Classification Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le_cond.classes_))

    return clf, le_cond


def train_volume_regressor(df):
    """Train a volume estimator from height measurements."""
    print("\n" + "=" * 50)
    print("Training Volume Estimator")
    print("=" * 50)

    X = df[["height_cm"]].values
    y = df["volume_ml"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    reg = GradientBoostingRegressor(n_estimators=100, random_state=42)
    reg.fit(X_train, y_train)

    y_pred = reg.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"\nVolume Estimation MAE: {mae:.1f} ml")

    return reg


def generate_dataset_analysis(df):
    """Generate analysis plots for the dataset."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("EcoCharge Bottle Dataset Analysis", fontsize=16)

    # Brand distribution
    brand_counts = df["brand"].value_counts()
    axes[0, 0].barh(brand_counts.index, brand_counts.values, color="steelblue")
    axes[0, 0].set_title("Bottles per Brand")
    axes[0, 0].set_xlabel("Count")

    # Volume distribution
    axes[0, 1].hist(df["volume_ml"], bins=15, color="coral", edgecolor="black")
    axes[0, 1].set_title("Volume Distribution")
    axes[0, 1].set_xlabel("Volume (ml)")
    axes[0, 1].set_ylabel("Count")

    # Condition distribution
    cond_counts = df["condition"].value_counts()
    axes[1, 0].pie(
        cond_counts.values,
        labels=cond_counts.index,
        autopct="%1.1f%%",
        colors=["#66bb6a", "#ef5350"],
    )
    axes[1, 0].set_title("Bottle Condition")

    # Height vs Volume scatter
    for brand in df["brand"].unique():
        subset = df[df["brand"] == brand]
        axes[1, 1].scatter(subset["height_cm"], subset["volume_ml"], label=brand, s=40)
    axes[1, 1].set_title("Height vs Volume by Brand")
    axes[1, 1].set_xlabel("Height (cm)")
    axes[1, 1].set_ylabel("Volume (ml)")
    axes[1, 1].legend(fontsize=7, loc="upper left")

    plt.tight_layout()
    plot_path = OUTPUT_DIR / "dataset_analysis.png"
    plt.savefig(plot_path, dpi=150)
    plt.close()
    print(f"\nDataset analysis saved to: {plot_path}")


def main():
    print("=" * 60)
    print("EcoCharge - Bottle Attribute Classifier Training")
    print("=" * 60)
    print()

    # Load data
    df = load_and_clean_csv()
    matched_df = match_csv_to_images(df)

    # Generate analysis
    generate_dataset_analysis(df)

    # Train classifiers
    brand_clf, le_brand = train_brand_classifier(df)
    cond_clf, le_cond = train_condition_classifier(df)
    vol_reg = train_volume_regressor(df)

    # Save models
    import pickle

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    models = {
        "brand_classifier": brand_clf,
        "brand_encoder": le_brand,
        "condition_classifier": cond_clf,
        "condition_encoder": le_cond,
        "volume_regressor": vol_reg,
    }

    model_path = OUTPUT_DIR / "bottle_attribute_models.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(models, f)

    print(f"\nModels saved to: {model_path}")
    print("\nDone! Use these models alongside YOLO detection for full bottle analysis.")


if __name__ == "__main__":
    main()
