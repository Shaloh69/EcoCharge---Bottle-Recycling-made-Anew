"""
EcoCharge - Bottle Detection GUI
==================================
Visual testing interface for YOLO26 bottle detection.
Browse for images, run detection, and see bounding boxes + attributes.

Usage:
    python scripts/gui_detect.py
    python scripts/gui_detect.py --weights path/to/best.pt
    python scripts/gui_detect.py --classify   # enable attribute prediction
"""

import argparse
import sys
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, ttk

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageTk

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WEIGHTS = PROJECT_ROOT / "runs" / "detect" / "ecocharge_bottle_det" / "weights" / "best.pt"
CLASSIFIER_WEIGHTS = PROJECT_ROOT / "runs" / "classifier" / "best_classifier.pt"

# Colors for bounding boxes (BGR for cv2, but we use PIL so RGB)
BOX_COLOR = (0, 200, 80)
BOX_COLOR_HIGHLIGHT = (255, 100, 50)
TEXT_BG = (0, 0, 0)
TEXT_FG = (255, 255, 255)


class BottleDetectorGUI:
    def __init__(self, root, weights_path, classify=False):
        self.root = root
        self.root.title("EcoCharge - YOLO26 Bottle Detector")
        self.root.configure(bg="#1e1e2e")

        self.weights_path = weights_path
        self.classify = classify
        self.yolo_model = None
        self.classifier = None
        self.inv_maps = None
        self.cls_transform = None
        self.current_image = None
        self.current_photo = None  # keep reference to prevent GC
        self.detections = []

        self._build_ui()
        self._load_models()

    def _build_ui(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#1e1e2e")
        style.configure("TLabel", background="#1e1e2e", foreground="#cdd6f4", font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI", 14, "bold"), foreground="#89b4fa")
        style.configure("Result.TLabel", font=("Consolas", 10), foreground="#a6e3a1")
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=8)
        style.configure("Accent.TButton", font=("Segoe UI", 11, "bold"), padding=10)

        # Main container
        main = ttk.Frame(self.root)
        main.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Top bar
        top = ttk.Frame(main)
        top.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(top, text="EcoCharge Bottle Detector", style="Title.TLabel").pack(side=tk.LEFT)

        # Controls frame
        ctrl = ttk.Frame(main)
        ctrl.pack(fill=tk.X, pady=(0, 10))

        ttk.Button(ctrl, text="Browse Image", command=self._browse_image, style="Accent.TButton").pack(
            side=tk.LEFT, padx=(0, 8)
        )
        ttk.Button(ctrl, text="Detect", command=self._run_detection, style="Accent.TButton").pack(
            side=tk.LEFT, padx=(0, 8)
        )
        ttk.Button(ctrl, text="Clear", command=self._clear).pack(side=tk.LEFT, padx=(0, 20))

        # Confidence slider
        ttk.Label(ctrl, text="Confidence:").pack(side=tk.LEFT, padx=(10, 4))
        self.conf_var = tk.DoubleVar(value=0.25)
        self.conf_slider = ttk.Scale(ctrl, from_=0.05, to=0.95, variable=self.conf_var, orient=tk.HORIZONTAL, length=150)
        self.conf_slider.pack(side=tk.LEFT)
        self.conf_label = ttk.Label(ctrl, text="0.25")
        self.conf_label.pack(side=tk.LEFT, padx=(4, 0))
        self.conf_slider.configure(command=self._update_conf_label)

        # Image path display
        self.path_var = tk.StringVar(value="No image selected")
        ttk.Label(ctrl, textvariable=self.path_var, foreground="#6c7086").pack(side=tk.RIGHT)

        # Content area: image + results side by side
        content = ttk.Frame(main)
        content.pack(fill=tk.BOTH, expand=True)

        # Image canvas (left)
        canvas_frame = ttk.Frame(content)
        canvas_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(canvas_frame, bg="#313244", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Results panel (right)
        results_frame = ttk.Frame(content, width=320)
        results_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(10, 0))
        results_frame.pack_propagate(False)

        ttk.Label(results_frame, text="Detection Results", style="Title.TLabel").pack(anchor=tk.W, pady=(0, 8))

        # Status
        self.status_var = tk.StringVar(value="Load a YOLO26 model and browse for an image.")
        ttk.Label(results_frame, textvariable=self.status_var, wraplength=300).pack(anchor=tk.W, pady=(0, 10))

        # Results text
        self.results_text = tk.Text(
            results_frame,
            bg="#313244",
            fg="#cdd6f4",
            font=("Consolas", 10),
            wrap=tk.WORD,
            borderwidth=0,
            highlightthickness=0,
            padx=8,
            pady=8,
        )
        self.results_text.pack(fill=tk.BOTH, expand=True)
        self.results_text.configure(state=tk.DISABLED)

        # Status bar
        self.statusbar_var = tk.StringVar(value="Ready")
        statusbar = ttk.Label(main, textvariable=self.statusbar_var, foreground="#6c7086")
        statusbar.pack(fill=tk.X, pady=(8, 0))

    def _update_conf_label(self, val):
        self.conf_label.configure(text=f"{float(val):.2f}")

    def _load_models(self):
        import torch
        from ultralytics import YOLO

        # Device
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        # Load YOLO
        weights = Path(self.weights_path)
        if weights.exists():
            self.status_var.set(f"Loading YOLO26 from {weights.name}...")
            self.root.update()
            self.yolo_model = YOLO(str(weights))
            self.status_var.set(f"YOLO26 loaded ({self.device}). Browse for an image.")
            self.statusbar_var.set(f"Model: {weights.name} | Device: {self.device}")
        else:
            self.status_var.set(
                f"Weights not found:\n{weights}\n\n"
                "Train first:\n  python scripts/train_yolo.py"
            )
            self.statusbar_var.set("No model loaded")

        # Load classifier
        if self.classify:
            cls_path = Path(CLASSIFIER_WEIGHTS)
            if cls_path.exists():
                try:
                    sys.path.insert(0, str(Path(__file__).resolve().parent))
                    from train_bottle_classifier import BottleAttributeNet

                    checkpoint = torch.load(str(cls_path), map_location=self.device, weights_only=False)
                    label_maps = checkpoint["label_maps"]
                    backbone = checkpoint.get("backbone", "efficientnet_b0")
                    imgsz = checkpoint.get("imgsz", 224)

                    self.inv_maps = {}
                    for key, mapping in label_maps.items():
                        self.inv_maps[key] = {v: k for k, v in mapping.items()}

                    self.classifier = BottleAttributeNet(
                        num_brands=len(label_maps["brand"]),
                        num_volumes=len(label_maps["volume"]),
                        num_conditions=len(label_maps["condition"]),
                        backbone=backbone,
                    ).to(self.device)
                    self.classifier.load_state_dict(checkpoint["model_state_dict"])
                    self.classifier.eval()

                    from torchvision import transforms
                    self.cls_transform = transforms.Compose([
                        transforms.Resize((imgsz, imgsz)),
                        transforms.ToTensor(),
                        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                    ])
                    self.statusbar_var.set(self.statusbar_var.get() + " | Classifier: loaded")
                except Exception as e:
                    print(f"Could not load classifier: {e}")

    def _browse_image(self):
        filetypes = [
            ("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff *.webp"),
            ("All files", "*.*"),
        ]
        path = filedialog.askopenfilename(title="Select an image", filetypes=filetypes)
        if not path:
            return

        self.path_var.set(Path(path).name)
        self._load_and_display_image(path)

    def _load_and_display_image(self, path):
        img = Image.open(path).convert("RGB")
        self.current_image_path = path
        self.current_image_pil = img
        self.detections = []
        self._display_image(img)
        self.status_var.set(f"Image loaded: {img.width}x{img.height}\nClick 'Detect' to run YOLO26.")
        self._clear_results()

    def _display_image(self, pil_img):
        # Fit image to canvas
        self.root.update_idletasks()
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        if cw < 10:
            cw, ch = 800, 600

        img_w, img_h = pil_img.size
        scale = min(cw / img_w, ch / img_h, 1.0)
        new_w = int(img_w * scale)
        new_h = int(img_h * scale)

        resized = pil_img.resize((new_w, new_h), Image.LANCZOS)
        self.current_photo = ImageTk.PhotoImage(resized)
        self.canvas.delete("all")

        x_offset = (cw - new_w) // 2
        y_offset = (ch - new_h) // 2
        self.canvas.create_image(x_offset, y_offset, anchor=tk.NW, image=self.current_photo)

    def _run_detection(self):
        if self.yolo_model is None:
            self.status_var.set("No model loaded. Check weights path.")
            return
        if not hasattr(self, "current_image_path"):
            self.status_var.set("Browse for an image first.")
            return

        self.status_var.set("Running YOLO26 detection...")
        self.root.update()

        conf = self.conf_var.get()
        results = self.yolo_model.predict(
            source=self.current_image_path,
            conf=conf,
            iou=0.45,
            imgsz=640,
            device=str(self.device) if str(self.device) != "cpu" else "cpu",
            verbose=False,
        )

        if not results:
            self.status_var.set("No results returned.")
            return

        result = results[0]
        boxes = result.boxes
        n_bottles = len(boxes)

        # Draw bounding boxes on the image
        img = self.current_image_pil.copy()
        draw = ImageDraw.Draw(img)

        # Try to load a nice font, fall back to default
        try:
            font = ImageFont.truetype("arial.ttf", max(16, img.height // 40))
            font_small = ImageFont.truetype("arial.ttf", max(12, img.height // 55))
        except (IOError, OSError):
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", max(16, img.height // 40))
                font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(12, img.height // 55))
            except (IOError, OSError):
                font = ImageFont.load_default()
                font_small = font

        results_lines = []
        results_lines.append(f"Detected: {n_bottles} bottle(s)\n")

        self.detections = []
        for i, box in enumerate(boxes):
            box_conf = box.conf[0].item()
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

            det_info = {
                "id": i + 1,
                "conf": box_conf,
                "bbox": (x1, y1, x2, y2),
            }

            # Draw bounding box
            thickness = max(2, img.width // 300)
            draw.rectangle([x1, y1, x2, y2], outline=BOX_COLOR, width=thickness)

            # Label text
            label = f"bottle {box_conf:.0%}"
            attr_lines = []

            # Classify if enabled
            if self.classify and self.classifier is not None:
                attrs = self._classify_crop(img, x1, y1, x2, y2)
                if attrs:
                    det_info.update(attrs)
                    label = f"{attrs['brand']} {attrs['volume_ml']}ml"
                    attr_lines = [
                        f"Brand: {attrs['brand']} ({attrs['brand_conf']:.0%})",
                        f"Volume: {attrs['volume_ml']}ml ({attrs['volume_conf']:.0%})",
                        f"Condition: {attrs['condition']} ({attrs['condition_conf']:.0%})",
                    ]

            # Draw label background + text
            bbox_text = draw.textbbox((x1, y1), label, font=font)
            text_h = bbox_text[3] - bbox_text[1]
            draw.rectangle([x1, y1 - text_h - 8, x1 + (bbox_text[2] - bbox_text[0]) + 8, y1], fill=BOX_COLOR)
            draw.text((x1 + 4, y1 - text_h - 6), label, fill=TEXT_BG, font=font)

            # Draw attribute lines below box
            if attr_lines:
                ay = y2 + 4
                for line in attr_lines:
                    bbox_a = draw.textbbox((x1, ay), line, font=font_small)
                    draw.rectangle([x1, ay, x1 + (bbox_a[2] - bbox_a[0]) + 6, ay + (bbox_a[3] - bbox_a[1]) + 4], fill=(0, 0, 0, 180))
                    draw.text((x1 + 3, ay + 2), line, fill=(166, 227, 161), font=font_small)
                    ay += (bbox_a[3] - bbox_a[1]) + 6

            self.detections.append(det_info)

            # Build result text
            results_lines.append(f"--- Bottle {i+1} ---")
            results_lines.append(f"  Confidence: {box_conf:.2%}")
            results_lines.append(f"  BBox: [{x1}, {y1}, {x2}, {y2}]")
            results_lines.append(f"  Size: {x2-x1}x{y2-y1}px")
            if attr_lines:
                for al in attr_lines:
                    results_lines.append(f"  {al}")
            results_lines.append("")

        # Display annotated image
        self._display_image(img)

        # Update results
        self._set_results("\n".join(results_lines))
        self.status_var.set(f"Done! {n_bottles} bottle(s) detected at conf>={conf:.2f}")

    def _classify_crop(self, img, x1, y1, x2, y2):
        """Run the CNN classifier on a cropped bottle region."""
        import torch

        try:
            pad = 5
            crop = img.crop((
                max(0, x1 - pad),
                max(0, y1 - pad),
                min(img.width, x2 + pad),
                min(img.height, y2 + pad),
            ))
            img_tensor = self.cls_transform(crop).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self.classifier(img_tensor)

            brand_idx = outputs["brand"].argmax(dim=1).item()
            volume_idx = outputs["volume"].argmax(dim=1).item()
            condition_idx = outputs["condition"].argmax(dim=1).item()

            return {
                "brand": self.inv_maps["brand"][brand_idx],
                "brand_conf": torch.softmax(outputs["brand"], dim=1).max().item(),
                "volume_ml": self.inv_maps["volume"][volume_idx],
                "volume_conf": torch.softmax(outputs["volume"], dim=1).max().item(),
                "condition": self.inv_maps["condition"][condition_idx],
                "condition_conf": torch.softmax(outputs["condition"], dim=1).max().item(),
            }
        except Exception as e:
            print(f"Classification error: {e}")
            return None

    def _set_results(self, text):
        self.results_text.configure(state=tk.NORMAL)
        self.results_text.delete("1.0", tk.END)
        self.results_text.insert(tk.END, text)
        self.results_text.configure(state=tk.DISABLED)

    def _clear_results(self):
        self._set_results("")

    def _clear(self):
        self.canvas.delete("all")
        self._clear_results()
        self.path_var.set("No image selected")
        self.status_var.set("Cleared. Browse for a new image.")
        self.detections = []
        if hasattr(self, "current_image_path"):
            del self.current_image_path


def main():
    parser = argparse.ArgumentParser(description="EcoCharge Bottle Detection GUI")
    parser.add_argument(
        "--weights", type=str, default=str(DEFAULT_WEIGHTS),
        help="Path to YOLO26 weights",
    )
    parser.add_argument(
        "--classify", action="store_true",
        help="Enable attribute classification (brand, volume, condition)",
    )
    args = parser.parse_args()

    root = tk.Tk()
    root.geometry("1200x750")
    root.minsize(900, 550)

    BottleDetectorGUI(root, weights_path=args.weights, classify=args.classify)
    root.mainloop()


if __name__ == "__main__":
    main()
