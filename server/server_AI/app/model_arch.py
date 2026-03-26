"""
BottleAttributeNet architecture — copied from scripts/train_bottle_classifier.py
so the inference service has no dependency on the training script.
"""
import torch.nn as nn
from torchvision import models


class BottleAttributeNet(nn.Module):
    """Multi-head CNN classifier for bottle attributes.

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

        self.shared = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
        )

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
