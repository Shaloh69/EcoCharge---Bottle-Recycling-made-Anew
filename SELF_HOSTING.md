# EcoCharge — Complete Setup & Self-Hosting Guide (Philippines)

**Last updated:** 2026-03-31
**Target:** Windows 11 PC, Philippine residential internet connection
**Goal:** Train the AI models from scratch, then expose the FastAPI inference server to the internet so the kiosk and ESP32 can reach it — free, stable, and HTTPS.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 0 — Dataset](#part-0--dataset)
3. [Part 1 — Train the Models](#part-1--train-the-models)
4. [Part 2 — Run the AI Server](#part-2--run-the-ai-server)
5. [Part 3 — Expose via Cloudflare Tunnel](#part-3--expose-via-cloudflare-tunnel)
6. [Part 4 — Keep Everything Running](#part-4--keep-everything-running-auto-restart)
7. [Part 5 — Update ESP32 Firmware](#part-5--update-esp32-firmware)
8. [Part 6 — Demo Day Prep](#part-6--demo-day-prep)
9. [Troubleshooting](#troubleshooting)

---

## Why Self-Host?

The AI server (`server/server_AI/`) runs YOLO + EfficientNet-B0 inference. Hosting options:

| Option | Cost | Latency | Uptime |
|--------|------|---------|--------|
| **Self-hosted (this guide)** | Free | ~30–300ms | On while your PC is on |
| RunPod GPU serverless | ~$0.20/hr active | ~50–100ms | On-demand |
| Render (CPU only) | Free tier; cold starts | ~2–10s cold | 24/7 |

For a thesis demo: self-hosting is free, fast, and gives you full control.

---

## Prerequisites

### Required software

- **Python 3.10 or 3.11** — download from `https://python.org`. During install, check **"Add Python to PATH"**.
- **Git** — `https://git-scm.com`
- **CUDA Toolkit 11.8 or 12.1** (optional, for GPU training) — only if you have an NVIDIA GPU. Download from NVIDIA's developer site. Verify with `nvidia-smi` in a terminal.

### Verify Python is installed

```bash
python --version   # Should print Python 3.10.x or 3.11.x
pip --version
```

### Project root

All commands in this guide assume you are at the project root unless stated otherwise:

```bash
cd d:/Projects-Shem/Thesis/2026/EcoCharge
```

---

## Part 0 — Dataset

The training scripts expect the dataset at `scripts/dataset/Eco-Charge.v1/` with this structure:

```
scripts/dataset/Eco-Charge.v1/
├── data.yaml
├── bottle_measurements.csv        ← required for classifier
├── train/
│   ├── images/   (*.jpg)
│   └── labels/   (*.txt, YOLO format)
├── valid/
│   ├── images/
│   └── labels/
└── test/
    ├── images/
    └── labels/
```

### Download from Roboflow

The dataset was annotated and exported from Roboflow. To re-download it:

1. Log in to Roboflow and open the **Eco-Charge** project.
2. Click **Export Dataset** → Format: **YOLOv8** → **Download zip to computer**.
3. Extract the zip into `scripts/dataset/Eco-Charge.v1/`.

> If you don't have Roboflow access, use the copy already in `scripts/dataset/Eco-Charge.v1/` (committed to the repo, minus the images which are in `.gitignore`).

### `bottle_measurements.csv`

This CSV maps each image filename to its bottle attributes (brand, volume_ml, height_cm, condition). It must live at `scripts/dataset/Eco-Charge.v1/bottle_measurements.csv`. It is already committed to the repo.

---

## Part 1 — Train the Models

Training uses a **separate virtual environment** from the server. This keeps heavy GPU packages (PyTorch, OpenCV) out of the server's slim environment.

### Step 1: Create the training venv

```bash
cd d:/Projects-Shem/Thesis/2026/EcoCharge/scripts
python -m venv .venv
```

### Step 2: Activate the venv

```bash
# In PowerShell:
.venv\Scripts\Activate.ps1

# In cmd / Git Bash:
.venv\Scripts\activate
```

Your prompt will show `(.venv)` when active.

### Step 3: Install training dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

For GPU training, install PyTorch with CUDA **before** running the above (replace `cu121` with your CUDA version):

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

Verify GPU is available:

```bash
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only')"
```

### Step 4: Train the YOLO bottle detector

From the `scripts/` directory (with `.venv` active):

```bash
cd d:/Projects-Shem/Thesis/2026/EcoCharge
python scripts/train_yolo.py
```

Default settings: `yolo26n`, 100 epochs, batch 16, 640px. The script:
1. Validates the dataset structure
2. Downloads the pretrained `yolo26n.pt` weights (first run only, ~6 MB)
3. Trains and saves checkpoints every 10 epochs
4. Evaluates on the test split when done

**Common overrides:**

```bash
# Larger model (more accurate, slower)
python scripts/train_yolo.py --model yolo26s

# More epochs
python scripts/train_yolo.py --epochs 200

# Smaller batch if VRAM is limited
python scripts/train_yolo.py --batch 8

# Resume from a checkpoint
python scripts/train_yolo.py --resume runs/detect/ecocharge_bottle_det/weights/last.pt

# Force CPU
python scripts/train_yolo.py --device cpu
```

**Output location:**

```
runs/detect/ecocharge_bottle_det/
├── weights/
│   ├── best.pt    ← use this one
│   └── last.pt
└── results.csv, confusion_matrix.png, ...
```

Training takes ~15–30 minutes on an RTX 3050 (100 epochs, yolo26n). CPU-only training takes several hours.

### Step 5: Train the bottle attribute classifier

The classifier (EfficientNet-B0) predicts **brand, volume, and condition** from cropped bottle images. It requires the YOLO dataset labels to be present (for bounding box crops) **and** `bottle_measurements.csv`.

```bash
python scripts/train_bottle_classifier.py
```

**Common overrides:**

```bash
# More epochs (default: 30)
python scripts/train_bottle_classifier.py --epochs 50

# Smaller batch for low VRAM
python scripts/train_bottle_classifier.py --batch 8

# Use ResNet-18 instead of EfficientNet-B0 (faster, less accurate)
python scripts/train_bottle_classifier.py --backbone resnet18
```

**Output location:**

```
runs/classifier/
├── best_classifier.pt    ← use this one
├── last_classifier.pt
├── label_maps.json
└── training_history.png
```

Training takes ~5–10 minutes on GPU (30 epochs, EfficientNet-B0).

---

## Part 2 — Run the AI Server

The server has its own lightweight virtual environment — it doesn't need OpenCV or the full training stack.

### Step 1: Create the server venv

```bash
cd d:/Projects-Shem/Thesis/2026/EcoCharge/server/server_AI
python -m venv .venv
```

### Step 2: Activate and install dependencies

```bash
# PowerShell:
.venv\Scripts\Activate.ps1

# cmd / Git Bash:
.venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt
```

> For GPU inference, install PyTorch with CUDA first (same as training step above), then `pip install -r requirements.txt`.

### Step 3: Copy model weights

From the project root (after training is complete):

```bash
# Windows cmd:
copy runs\classifier\best_classifier.pt server\server_AI\models\best_classifier.pt
copy runs\detect\ecocharge_bottle_det\weights\best.pt server\server_AI\models\best.pt

# Git Bash / PowerShell:
cp runs/classifier/best_classifier.pt server/server_AI/models/best_classifier.pt
cp runs/detect/ecocharge_bottle_det/weights/best.pt server/server_AI/models/best.pt
```

### Step 4: Set environment variables

Create `server/server_AI/.env` (copy from the example):

```bash
copy server\server_AI\.env.example server\server_AI\.env
```

Then edit `server/server_AI/.env`:

```env
AI_API_KEY=change-this-to-a-strong-random-key
YOLO_WEIGHTS=models/best.pt
CLASSIFIER_WEIGHTS=models/best_classifier.pt
CONF_THRESHOLD=0.40
```

Generate a strong API key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Paste the output as the value for `AI_API_KEY`.

### Step 5: Test locally

Make sure the server venv is active, then:

```bash
cd server/server_AI

```

Open `http://localhost:8000/health` — should return `{"status": "ok"}`.

Test inference:

```bash
curl -X POST http://localhost:8000/api/detect \
  -H "Authorization: Bearer your-api-key" \
  -F "file=@path/to/test_bottle.jpg"
```

Press `Ctrl+C` to stop the server when done testing.

---

## Part 3 — Expose via Cloudflare Tunnel

### Philippine ISP Reality Check

Check if you are behind CGNAT first:

1. Go to `https://whatismyip.com` — note the public IP shown
2. Log into your router (usually `192.168.1.1`) — check the WAN IP
3. **If they match** → real public IP (port forwarding works)
4. **If they differ** → CGNAT (port forwarding is useless)

| ISP | Typical Situation |
|-----|------------------|
| PLDT Fibr | Real dynamic public IP — port forwarding works |
| Globe At Home Fibr/Air | CGNAT common — port forwarding likely fails |
| Converge FiberX | Real dynamic public IP — port forwarding works |
| Globe/Smart LTE | CGNAT always — use tunnel |

**Regardless of ISP: use Cloudflare Tunnel.** It works with CGNAT, no port forwarding needed, free, and gives automatic HTTPS.

---

Cloudflare Tunnel creates an outbound-only encrypted connection from your PC to Cloudflare's edge. You get a stable HTTPS URL with a valid TLS certificate — no port forwarding, no static IP needed.

**Cost:** Free. No credit card. No time limit.

### Step 1: Create a free Cloudflare account

Go to `https://cloudflare.com` and register. No domain required for a quick tunnel (you get a random `.trycloudflare.com` URL), but a named tunnel with a domain gives a stable URL.

**Recommended: get a free domain** via GitHub Student Developer Pack (`.me` domain free for 1 year) or use `duckdns.org` for free DDNS without Cloudflare.

### Step 2: Install cloudflared on Windows

```powershell
winget install Cloudflare.cloudflared
```

### Step 3: Quick tunnel (no domain — URL changes on restart)

```bash
cloudflared tunnel --url http://localhost:8000
```

Cloudflare prints a URL like `https://random-words.trycloudflare.com`. Use this as your `AI_SERVER_URL` temporarily. Good for testing — not stable across restarts.

### Step 4: Named tunnel (stable URL — recommended for thesis)

```bash
# Authenticate (opens browser)
cloudflared login

# Create tunnel
cloudflared tunnel create ecocharge-ai

# Add DNS route (replace yourdomain.com with your actual domain)
cloudflared tunnel route dns ecocharge-ai ai.yourdomain.com
```

Create `C:\Users\Shaloh\.cloudflared\config.yml`:

```yaml
tunnel: ecocharge-ai
credentials-file: C:\Users\Shaloh\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: ai.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

Test it:

```bash
cloudflared tunnel run ecocharge-ai
```

Your server is now reachable at `https://ai.yourdomain.com`.

### Step 5: Register cloudflared as a Windows service (auto-start on boot)

```bash
cloudflared service install
```

The tunnel now starts automatically when Windows boots and restarts on crash.

---

## Part 4 — Keep Everything Running (Auto-Restart)

Use **NSSM** (Non-Sucking Service Manager) to run Uvicorn as a Windows service that auto-restarts on crash and starts on boot.

### Step 1: Download NSSM

Download from `https://nssm.cc/download` — no installer needed, just a `.exe`.

### Step 2: Create a startup script

`server/server_AI/start.bat` already exists in the repo. Verify it matches your paths:

```bat
@echo off
cd /d d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI
call .venv\Scripts\activate
set AI_API_KEY=your-strong-api-key
set YOLO_WEIGHTS=models/best.pt
set CLASSIFIER_WEIGHTS=models/best_classifier.pt
set CONF_THRESHOLD=0.40
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Replace `your-strong-api-key` with the key you generated.

### Step 3: Register as Windows service

```bash
nssm install EcoChargeAI "d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\start.bat"
nssm set EcoChargeAI AppStdout "d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\logs\stdout.log"
nssm set EcoChargeAI AppStderr "d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\logs\stderr.log"
nssm start EcoChargeAI
```

Now `uvicorn` runs as a Windows service, restarts on crash, and starts on every boot — alongside the Cloudflare Tunnel service.

---

## Part 5 — Update ESP32 Firmware

Once the tunnel is running, update `esp/ecocharge/include/config.h`:

```c
// Change this:
#define AI_SERVER_URL   "https://your-runpod-endpoint.runpod.net"

// To your Cloudflare Tunnel URL:
#define AI_SERVER_URL   "https://ai.yourdomain.com"

// Update the API key to match your .env
#define AI_API_KEY      "your-strong-api-key"
```

Reflash the ESP32 via PlatformIO (`pio run --target upload`).

---

## Part 6 — Demo Day Prep

### Windows settings

- **Disable sleep:** Settings → Power & sleep → Screen and Sleep → set both to **Never**
- **Pause Windows Update:** Settings → Windows Update → Advanced Options → Pause for 5 weeks
- **Disable hibernate:** Run in cmd as admin: `powercfg /h off`

### Verify your setup on demo day

```bash
# 1. Check AI server is running
curl http://localhost:8000/health

# 2. Check tunnel is up
curl https://ai.yourdomain.com/health

# 3. Test a real inference call
curl -X POST https://ai.yourdomain.com/api/detect \
  -H "Authorization: Bearer your-api-key" \
  -F "file=@test_bottle.jpg"
```

### Mobile hotspot backup

If your main internet fails mid-demo:

1. Enable hotspot on your phone (Globe/Smart/DITO LTE)
2. Connect your PC WiFi to the hotspot
3. The Cloudflare Tunnel reconnects automatically (outbound connections only)
4. Reprovision the ESP32 to connect to the same hotspot SSID via the captive portal

### Hardware Recommendation: UPS

Philippine brownouts are real. A basic UPS protects your demo from power interruptions.

| UPS | Capacity | Runtime | Cost |
|-----|----------|---------|------|
| APC BX650LI | 650VA | ~10 min | PHP 2,500 |
| CyberPower CP1000AVRLCD | 1000VA | ~15 min | PHP 3,500 |

Plug the server PC and router into the UPS.

---

## Security Checklist

- [ ] `AI_API_KEY` is a random 32+ character string (not `dev-ai-secret`)
- [ ] `DEVICE_API_KEY` in `config.h` matches `AI_API_KEY` in `.env`
- [ ] Windows Firewall allows port 8000 inbound (for LAN access; tunnel handles internet)
- [ ] Only port 8000 is tunneled — not port 80 (local web server / provisioning page)
- [ ] `.env` file is in `.gitignore` (never commit API keys)

---

## Cost Summary

| Item | Cost |
|------|------|
| Cloudflare Tunnel | Free |
| Cloudflare account | Free |
| NSSM | Free |
| DuckDNS (if no domain) | Free |
| GitHub Student Dev Pack `.me` domain | Free (with student email) |
| UPS for power protection | PHP 2,500–3,500 (one-time, optional) |
| **Total software cost** | **Free** |

---

## Quick Reference — Service Commands

```bash
# Start/stop AI server service
nssm start EcoChargeAI
nssm stop EcoChargeAI

# Start/stop Cloudflare Tunnel service
sc start cloudflared
sc stop cloudflared

# View AI server logs
type d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\logs\stdout.log

# Test tunnel health
curl https://ai.yourdomain.com/health

# Restart everything
nssm restart EcoChargeAI
sc stop cloudflared && sc start cloudflared
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `/health` returns 502 | Uvicorn not running | `nssm start EcoChargeAI`; check logs |
| Tunnel URL unreachable | cloudflared service stopped | `sc start cloudflared` |
| `torch.cuda.is_available()` = False | No NVIDIA GPU or wrong CUDA | Install PyTorch with correct CUDA version; or use CPU |
| Training OOM (out of memory) | Batch size too large for VRAM | Add `--batch 8` or `--batch 4` |
| `data.yaml not found` | Dataset not downloaded | Follow Part 0 — Dataset section |
| `bottle_measurements.csv not found` | CSV missing from dataset dir | Check `scripts/dataset/Eco-Charge.v1/bottle_measurements.csv` |
| `No training samples found` | CSV filenames don't match image files | Check filenames in CSV match the `.jpg` files in `train/images/` |
| ESP32 TLS handshake error | Certificate validation | Set `esp_http_client_config_t.skip_cert_common_name_check = true` |
| CORS error from kiosk browser | FastAPI CORS not configured | Add `CORSMiddleware` to `app/main.py` |
| Inference takes >5s | Running on CPU, large image | Resize image to 640px before sending; expected on CPU |
| `Activate.ps1 cannot be loaded` | PowerShell execution policy | Run: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |            
