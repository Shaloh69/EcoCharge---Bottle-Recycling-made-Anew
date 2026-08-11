"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { AlertCircle, ArrowRight, Radio, Zap } from "lucide-react";

import { addToast } from "@/lib/toast";
import { adminAuth, auth, probeApiHealth } from "@/lib/api";

/**
 * Operations Console — sign in.
 *
 * Rebuilt 2026-08-11 (full redo). The previous version was a centered
 * logo-over-two-fields card, which is exactly the templated auth layout
 * docs/planning/02-design-mandate.md SS2 bans ("none of them should read as the
 * same templated 'centered card, logo, two fields, button' layout re-skinned
 * four times"). Removing the gradients from that card was never enough — the
 * layout itself was the tell.
 *
 * The direction here is the researched 2026 split-screen admin pattern, but with
 * the brand panel doing a real job instead of carrying marketing copy: the left
 * rail is a live status board that probes the actual API `/health` endpoint
 * before you spend a login attempt. That is a genuinely useful thing for an ops
 * tool to show at the door, and it makes this screen unmistakably *this*
 * surface — dark, dense, mono telemetry — rather than a generic auth page.
 *
 * Deliberately NOT here: the kiosk's wave/blob motif (SS2 assigns that to the
 * kiosk alone), any gradient, any blur panel.
 */
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<{
    ok: boolean;
    ms: number;
    ts?: string;
  } | null>(null);

  // Real probe against the real backend, re-run every 15s while sitting here.
  useEffect(() => {
    let alive = true;
    const run = () =>
      probeApiHealth().then((h) => {
        if (alive) setHealth(h);
      });

    run();
    const id = setInterval(run, 15000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminAuth.login(form.email, form.password);

      if (!res.user.is_admin) {
        setError("Access denied — admin account required");
        addToast({
          title: "Access denied",
          description: "This account does not have admin privileges.",
          color: "danger",
        });

        return;
      }
      auth.setToken(res.access_token);
      addToast({ title: "Welcome back", color: "success" });
      router.push("/dashboard");
    } catch (e) {
      const msg = (e as Error).message ?? "Login failed";

      setError(msg);
      addToast({ title: "Login failed", description: msg, color: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = health === null ? "#8FA69B" : health.ok ? "#16A34A" : "#EF4444";
  const statusLabel =
    health === null ? "PROBING" : health.ok ? "OPERATIONAL" : "UNREACHABLE";

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
        background: "#0A0F0D",
      }}
    >
      {/* ── Left rail: real system status, not marketing copy ───────────── */}
      <Box
        visibleFrom="md"
        style={{
          borderRight: "1px solid #1A2420",
          padding: "40px clamp(32px, 5vw, 64px)",
          display: "flex",
          flexDirection: "column",
          // Grouped, not spread: the brand pins to the top, the status board and
          // the legal line sit together in the optical centre. `space-between`
          // on a tall viewport pushed these to opposite edges and made the two
          // halves of the screen read as unrelated.
          gap: 40,
          // A flat, ruled grid — reads as an instrument panel, not decoration.
          backgroundImage:
            "linear-gradient(#141C19 1px, transparent 1px), linear-gradient(90deg, #141C19 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      >
        <div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
          >
            <Zap color="#16A34A" size={20} strokeWidth={2.5} />
            <Text
              fw={700}
              style={{
                color: "#E7F0EB",
                fontSize: 15,
                letterSpacing: "0.24em",
                fontFamily: "var(--font-mono)",
              }}
            >
              ECOCHARGE
            </Text>
          </div>
          <Text
            style={{
              color: "#5C7268",
              fontSize: 11,
              letterSpacing: "0.28em",
              fontFamily: "var(--font-mono)",
            }}
          >
            OPERATIONS CONSOLE
          </Text>
        </div>

        {/* Live status block — centred in the remaining space */}
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          <Text
            style={{
              color: "#5C7268",
              fontSize: 10,
              letterSpacing: "0.2em",
              fontFamily: "var(--font-mono)",
              marginBottom: 14,
            }}
          >
            SYSTEM STATUS
          </Text>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: statusColor,
                flexShrink: 0,
                alignSelf: "center",
                boxShadow: `0 0 0 4px ${statusColor}22`,
                transition: "background 400ms",
              }}
            />
            <Text
              fw={700}
              style={{
                color: statusColor,
                fontSize: 30,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
              }}
            >
              {statusLabel}
            </Text>
          </div>

          <div style={{ display: "grid", gap: 1, background: "#1A2420" }}>
            <StatRow
              label="API ENDPOINT"
              value={
                health === null
                  ? "—"
                  : health.ok
                    ? `${health.ms} ms`
                    : "no response"
              }
              valueColor={health?.ok ? "#E7F0EB" : "#EF4444"}
            />
            <StatRow
              label="SERVER TIME"
              value={
                health?.ts
                  ? new Date(health.ts).toISOString().slice(11, 19) + " UTC"
                  : "—"
              }
              valueColor="#E7F0EB"
            />
            <StatRow label="AUTH" value="RATE-LIMITED · 10/15MIN" valueColor="#FBBF24" />
          </div>
        </div>

        <Text
          style={{
            // #3F5249 failed SS0's contrast check against #0A0F0D on a real
            // screenshot; #5C7268 is the spec's own muted token and clears it.
            color: "#5C7268",
            fontSize: 10,
            lineHeight: 1.7,
            letterSpacing: "0.08em",
            fontFamily: "var(--font-mono)",
          }}
        >
          RESTRICTED. ADMIN CREDENTIALS REQUIRED.
          <br />
          ALL SESSIONS AND KIOSK COMMANDS ARE LOGGED.
        </Text>
      </Box>

      {/* ── Right: the form, left-aligned and full-height, not a floating card ── */}
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px clamp(24px, 6vw, 72px)",
          background: "#111816",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Compact brand mark for the small-screen case, where the rail is hidden */}
          <Box hiddenFrom="md" mb="xl">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap color="#16A34A" size={18} strokeWidth={2.5} />
              <Text
                fw={700}
                style={{
                  color: "#E7F0EB",
                  fontSize: 13,
                  letterSpacing: "0.22em",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ECOCHARGE OPS
              </Text>
            </div>
          </Box>

          <Title
            order={1}
            style={{
              color: "#E7F0EB",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: 6,
            }}
          >
            Sign in
          </Title>
          <Text
            style={{
              color: "#8FA69B",
              fontSize: 14,
              marginBottom: 34,
            }}
          >
            Fleet monitoring, kiosk commands, and the credit ledger.
          </Text>

          <form onSubmit={handleLogin}>
            <TextInput
              required
              label="Email"
              placeholder="admin@ecocharge.ph"
              size="md"
              styles={inputStyles}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
            />
            <PasswordInput
              required
              label="Password"
              mt="lg"
              placeholder="••••••••"
              size="md"
              styles={inputStyles}
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.currentTarget.value })
              }
            />

            {error && (
              <Alert
                color="red"
                icon={<AlertCircle size={16} />}
                mt="lg"
                radius="xs"
                styles={{ message: { fontSize: 13 } }}
                variant="light"
              >
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              color="ecoGreen"
              loading={loading}
              mt="xl"
              radius="xs"
              rightSection={!loading && <ArrowRight size={16} />}
              size="md"
              styles={{ root: { height: 48, fontWeight: 600 } }}
              type="submit"
            >
              Sign in
            </Button>
          </form>

          {/* Small-screen status line — the rail is hidden there, but the
              reachability information is the whole point, so it still shows. */}
          <Box hiddenFrom="md" mt="xl">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Radio color={statusColor} size={13} />
              <Text
                style={{
                  color: statusColor,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  fontFamily: "var(--font-mono)",
                }}
              >
                API {statusLabel}
              </Text>
            </div>
          </Box>
        </div>
      </Box>
    </Box>
  );
}

/** One label/value row in the status board. Mono numerals per SS3. */
function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div
      style={{
        background: "#0A0F0D",
        padding: "11px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          color: "#5C7268",
          fontSize: 10,
          letterSpacing: "0.16em",
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: valueColor,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Square-cornered, flat inputs — an instrument panel, not a marketing form. */
const inputStyles = {
  label: {
    color: "#8FA69B",
    fontSize: 10,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    fontFamily: "var(--font-mono)",
    marginBottom: 8,
  },
  input: {
    background: "#0A0F0D",
    borderColor: "#1A2420",
    borderRadius: 2,
    color: "#E7F0EB",
    height: 48,
    fontSize: 14,
  },
};
