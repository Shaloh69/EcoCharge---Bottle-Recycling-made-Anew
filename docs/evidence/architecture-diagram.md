# EcoCharge — System Architecture

Part of the thesis evidence pack (`docs/planning/08-master-checklist.md` Phase H). Reflects the real, live, self-hosted topology as of 2026-08-11 — every box here is either actually deployed and verified reachable this session, or explicitly marked as not yet deployed. Not an aspirational diagram.

```mermaid
flowchart TB
    subgraph field["Field / public internet"]
        ESP32["ESP32 firmware\n(conveyor + 4x relay ports +\ncurrent/voltage/ultrasonic sensors)"]
        KioskPC["kiosk_web\n(Next.js, on its own field PC —\nnot yet deployed anywhere)"]
        MobileApp["Flutter mobile app\n(end users' phones)"]
    end

    subgraph tailnet["desktop-gklhcri — self-hosted server (Tailscale-networked)"]
        direction TB
        subgraph tunnels["Cloudflare quick tunnels (free, rotate on restart — user-accepted tradeoff)"]
            TunnelAPI["EcoChargeTunnelAPI\n*.trycloudflare.com"]
            TunnelAI["EcoChargeTunnelAI\n*.trycloudflare.com"]
        end

        API["Node API (server_main)\nExpress + Prisma\nport 30010 — EcoChargeAPI task"]
        Admin["Admin Console (web_console)\nNext.js + Mantine\nport 30011 — Tailscale-only, NOT tunneled"]
        AIServer["AI server (server_AI)\nFastAPI + YOLO26 + EfficientNet-B0\nport 30012 — EcoChargeAIServer task"]
        MySQL[("MySQL 8 (Docker)\n127.0.0.1:13306 — never exposed off-box\nlive system of record, fresh schema")]
        Media["/media (local disk)\nD:\\EcoCharge\\media\navatars only — Supabase fully decommissioned"]
    end

    ESP32 -->|"HTTPS, DEVICE_API_KEY"| TunnelAPI
    KioskPC -.->|"HTTPS (once deployed)"| TunnelAPI
    MobileApp -->|"HTTPS"| TunnelAPI
    TunnelAPI --> API

    KioskPC -.->|"proxied AI calls, AI_API_KEY"| TunnelAI
    API -->|"AI_SERVER_URL, AI_API_KEY"| TunnelAI
    TunnelAI --> AIServer

    API --> MySQL
    API --> Media
    Admin -->|"tailnet only —\nhttp://desktop-gklhcri:30010"| API

    classDef notdeployed stroke-dasharray: 5 5,opacity:0.6;
    class KioskPC notdeployed;
```

## Notes that matter, not just decoration

- **Two different free Cloudflare quick tunnels** (API, AI server) — chosen over a named tunnel + owned domain after the user was told plainly that Cloudflare itself has no free *stable* hostname option (see `memory.md`, 2026-08-11). Both URLs rotate on restart; the ESP32/Flutter app have the current URL compiled in with the rotation risk explicitly accepted (`memory.md`, same date).
- **The admin console is deliberately not tunneled** — Tailscale-only, per the original team-only design rationale. It reaches the API via the tailnet hostname, not the public tunnel.
- **MySQL is never reachable off-box**, by design — bound to `127.0.0.1:13306` only. The API is the only thing that talks to it, and the API only runs on this same machine.
- **Media storage is a local folder on this same box**, not a separate service. Supabase (cloud and a self-hosted Docker instance that was actually built and torn down again the same week) is fully gone — see `docs/planning/03-revamp-master.md` §1.4.
- **`kiosk_web` is dashed/not-yet-deployed** — it belongs on its own field PC (never co-located with the server, per `03-revamp-master.md` §1.1), and that PC hasn't been provisioned yet. Everything else in this diagram is live and was verified reachable this session (`curl`/`Invoke-WebRequest` against real running instances, not assumed).
- **All three self-hosted services (API, AI server, admin console) run as Windows Task-Scheduler-launched processes** with a crash-restart loop — not a real service manager (NSSM/PM2 are both absent from this machine, checked directly). Verified stable under a real restart cycle, not independently verified across an actual machine reboot.
