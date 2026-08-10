# EcoCharge — System Architecture

Part of the thesis evidence pack (`docs/planning/08-master-checklist.md` Phase H). Reflects the real, live, self-hosted topology as of 2026-08-11 (4th session) — every box here is either actually deployed and verified reachable this session, or explicitly marked with what's still pending. Not an aspirational diagram. **Corrected this session**: the previous version of this diagram was already stale on two counts — it showed the admin console as Tailscale-only (reversed to public earlier the same day) and `kiosk_web` as entirely undeployed (a real staging copy now runs alongside the other services, distinct from its eventual real field-PC deployment).

```mermaid
flowchart TB
    subgraph field["Field / public internet"]
        ESP32["ESP32 firmware\n(conveyor + 4x relay ports +\ncurrent/voltage/ultrasonic sensors)"]
        FieldKiosk["kiosk_web on its own field PC\n(real target deployment — PC not\nyet provisioned, see staging copy below)"]
        MobileApp["Flutter mobile app\n(end users' phones)"]
        Visitor["Public website visitor"]
    end

    subgraph tailnet["desktop-gklhcri — self-hosted server (Tailscale-networked)"]
        direction TB
        subgraph tunnels["Cloudflare quick tunnels (free, rotate on restart — user-accepted tradeoff)"]
            TunnelAPI["EcoChargeTunnelAPI\n*.trycloudflare.com"]
            TunnelAI["EcoChargeTunnelAI\n*.trycloudflare.com"]
            TunnelAdmin["EcoChargeTunnelAdmin\n*.trycloudflare.com"]
            TunnelKiosk["EcoChargeTunnelKiosk\n*.trycloudflare.com"]
            TunnelWeb["EcoChargeTunnelWeb\n*.trycloudflare.com"]
        end

        API["Node API (server_main)\nExpress + Prisma\nport 30010 — EcoChargeAPI task"]
        Admin["Admin Console (web_console)\nNext.js + Mantine\nport 30011 — EcoChargeAdminConsole task"]
        AIServer["AI server (server_AI)\nFastAPI + YOLO26 + EfficientNet-B0\nport 30012 — EcoChargeAIServer task"]
        StagingKiosk["kiosk_web STAGING copy\n(same code, for screenshot verification —\nnot the real field deployment)\nport 30013 — EcoChargeKioskWeb task"]
        Website["client/web (public site)\nNext.js\nport 30014 — EcoChargeWeb task"]
        MySQL[("MySQL 8 (Docker)\n127.0.0.1:13306 — never exposed off-box\nlive system of record, fresh schema")]
        Media["/media (local disk)\nD:\\EcoCharge\\media\navatars only — Supabase fully decommissioned"]
    end

    ESP32 -->|"HTTPS, DEVICE_API_KEY"| TunnelAPI
    FieldKiosk -.->|"HTTPS (once the field PC is provisioned)"| TunnelAPI
    MobileApp -->|"HTTPS"| TunnelAPI
    TunnelAPI --> API

    StagingKiosk -->|"proxied AI calls, AI_API_KEY"| TunnelAI
    API -->|"AI_SERVER_URL, AI_API_KEY"| TunnelAI
    TunnelAI --> AIServer

    Admin -.-> TunnelAdmin
    StagingKiosk -.-> TunnelKiosk
    Website -.-> TunnelWeb
    Visitor -->|"HTTPS"| TunnelWeb

    API --> MySQL
    API --> Media
    Admin -->|"HTTPS, public tunnel"| API

    classDef notdeployed stroke-dasharray: 5 5,opacity:0.6;
    classDef staging stroke-dasharray: 2 2;
    class FieldKiosk notdeployed;
    class StagingKiosk staging;
```

## Notes that matter, not just decoration

- **Five separate free Cloudflare quick tunnels now** (API, AI server, admin console, kiosk-web staging, public website) — chosen over a named tunnel + owned domain after the user was told plainly that Cloudflare itself has no free *stable* hostname option (see `memory.md`, 2026-08-11). All rotate on restart; the ESP32/Flutter app have the current API URL compiled in with the rotation risk explicitly accepted (`memory.md`, same date).
- **The admin console is public now, not Tailscale-only — reversed 2026-08-11, before this diagram's own prior version was even written**, after the user was asked explicitly and chose to make it public. A real login-rate-limiting gap was found and fixed first (`memory.md`). It still also remains reachable over the tailnet directly, but the tunnel is the primary path now.
- **`kiosk_web`'s real target is still its own field PC, not this server** — that hasn't changed, and that PC still isn't provisioned (dashed `FieldKiosk` box). What's new this session: a **staging copy of the same code** now runs on `desktop-gklhcri:30013` with its own tunnel, specifically so the Kiosk Web design/UX work could be screenshot-verified against a real running instance without waiting on field hardware. Don't confuse the two — the staging copy is a verification convenience, not the real deployment topology.
- **The public website (`client/web`) is now deployed too** (`desktop-gklhcri:30014`), previously not shown in this diagram at all because it didn't exist as a deployable build yet.
- **MySQL is never reachable off-box**, by design — bound to `127.0.0.1:13306` only. The API is the only thing that talks to it, and the API only runs on this same machine.
- **Media storage is a local folder on this same box**, not a separate service. Supabase (cloud and a self-hosted Docker instance that was actually built and torn down again the same week) is fully gone — see `docs/planning/03-revamp-master.md` §1.4.
- **All five self-hosted services run as Windows Task-Scheduler-launched processes** with a crash-restart loop — not a real service manager (NSSM/PM2 are both absent from this machine, checked directly). Verified stable under a real restart cycle, not independently verified across an actual machine reboot.
