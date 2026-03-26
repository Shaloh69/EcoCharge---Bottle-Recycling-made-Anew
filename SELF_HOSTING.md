# EcoCharge — Self-Hosting AI Inference Server (Philippines)

**Last updated:** 2026-03-25
**Target:** Windows 11 PC, Philippine residential internet connection
**Goal:** Expose the FastAPI AI inference server (`server/server_AI/`) to the internet so the kiosk and ESP32 can reach it — free, stable, and HTTPS.

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

## Philippine ISP Reality Check

### Check if you are behind CGNAT first

1. Go to `https://whatismyip.com` — note the public IP shown
2. Log into your router (usually `192.168.1.1`) — check the WAN IP
3. **If they match** → you have a real public IP (port forwarding works)
4. **If they differ** → you are behind CGNAT (port forwarding is useless)

| ISP | Typical Situation |
|-----|------------------|
| PLDT Fibr | Real dynamic public IP — port forwarding works |
| Globe At Home Fibr/Air | CGNAT common — port forwarding likely fails |
| Converge FiberX | Real dynamic public IP — port forwarding works |
| Globe/Smart LTE | CGNAT always — use tunnel |

**Regardless of ISP: use Cloudflare Tunnel.** It works with CGNAT, no port forwarding needed, free, and gives automatic HTTPS. It is strictly simpler than any port-forwarding approach.

---

## Part 1 — Run the AI Server Locally

### Step 1: Install dependencies

```bash
cd d:/Projects-Shem/Thesis/2026/EcoCharge/server/server_AI
pip install -r requirements.txt
```

### Step 2: Copy model weights

```bash
# From project root
copy runs\classifier\best_classifier.pt server\server_AI\models\best_classifier.pt
copy runs\detect\ecocharge_bottle_det\weights\best.pt server\server_AI\models\best.pt
```

### Step 3: Set environment variables

Create `server/server_AI/.env`:

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

### Step 4: Test locally

```bash
cd server/server_AI
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/health` — should return `{"status": "ok"}`.

Test inference:
```bash
curl -X POST http://localhost:8000/api/detect \
  -H "Authorization: Bearer your-api-key" \
  -F "file=@path/to/test_bottle.jpg"
```

---

## Part 2 — Expose via Cloudflare Tunnel

Cloudflare Tunnel creates an outbound-only encrypted connection from your PC to Cloudflare's edge. You get a stable HTTPS URL with a valid TLS certificate — no port forwarding, no static IP needed.

**Cost:** Free. No credit card. No time limit.

### Step 1: Create a free Cloudflare account

Go to `https://cloudflare.com` and register. No domain required for a quick tunnel (you get a random `.trycloudflare.com` URL), but a named tunnel with a domain gives a stable URL.

**Recommended: get a free domain** via GitHub Student Developer Pack (`.me` domain free for 1 year) or use `duckdns.org` for free DDNS without Cloudflare.

### Step 2: Install cloudflared on Windows

Download the installer from the Cloudflare docs or run:
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

# Create config file at C:\Users\Shaloh\.cloudflared\config.yml
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

## Part 3 — Keep the AI Server Running (Auto-Restart)

Use **NSSM** (Non-Sucking Service Manager) to run Uvicorn as a Windows service that auto-restarts on crash and starts on boot.

### Step 1: Download NSSM

Download from `https://nssm.cc/download` — no installer needed, just a `.exe`.

### Step 2: Create a startup script

Create `server/server_AI/start.bat`:
```bat
@echo off
cd /d d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI
set AI_API_KEY=your-strong-api-key
set YOLO_WEIGHTS=models/best.pt
set CLASSIFIER_WEIGHTS=models/best_classifier.pt
set CONF_THRESHOLD=0.40
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### Step 3: Register as Windows service

```bash
nssm install EcoChargeAI "d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\start.bat"
nssm set EcoChargeAI AppStdout "d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\logs\stdout.log"
nssm set EcoChargeAI AppStderr "d:\Projects-Shem\Thesis\2026\EcoCharge\server\server_AI\logs\stderr.log"
nssm start EcoChargeAI
```

Now `uvicorn` runs as a Windows service, restarts on crash, and starts on every boot — alongside the Cloudflare Tunnel service.

---

## Part 4 — Update ESP32 Firmware

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

## Part 5 — Prepare for Demo Day

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
3. The Cloudflare Tunnel reconnects automatically (Cloudflare Tunnel uses outbound connections only)
4. Reprovision the ESP32 to connect to the same hotspot SSID via the captive portal

---

## Hardware Recommendation: UPS

Philippine brownouts are real. A basic UPS protects your demo from power interruptions.

| UPS | Capacity | Runtime | Cost |
|-----|----------|---------|------|
| APC BX650LI | 650VA | ~10 min | PHP 2,500 |
| CyberPower CP1000AVRLCD | 1000VA | ~15 min | PHP 3,500 |

Plug the server PC and router into the UPS. 10 minutes is enough to outlast a brief interruption or gracefully shut down.

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
| `torch.cuda.is_available()` = False | No NVIDIA GPU or wrong CUDA | Set `device=cpu` in inference.py; still works |
| ESP32 TLS handshake error | Certificate validation | Set `esp_http_client_config_t.skip_cert_common_name_check = true` |
| CORS error from kiosk browser | FastAPI CORS not configured | Add `CORSMiddleware` to `app/main.py` |
| Inference takes >5s | Running on CPU, large image | Resize image to 640px before sending; expected on CPU |
