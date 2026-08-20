const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── token ────────────────────────────────────────────────────────────────────
export const auth = {
  // sessionStorage: cleared when the tab closes, never persists across sessions.
  // localStorage would expose the admin JWT to any XSS script indefinitely.
  // A companion cookie `admin_authed=1` (session-scoped, no token value) is set
  // so that the edge middleware can gate /dashboard routes without touching JWT.
  getToken: () =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("admin_token")
      : null,
  setToken: (t: string) => {
    sessionStorage.setItem("admin_token", t);
    // Session cookie — expires when browser closes, no JS access (httpOnly not
    // possible from client, but value-less so nothing sensitive is exposed).
    document.cookie = "admin_authed=1; path=/; SameSite=Strict";
  },
  clear: () => {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_user");
    document.cookie = "admin_authed=; path=/; max-age=0; SameSite=Strict";
  },

  /**
   * The signed-in admin. Found 2026-08-20: the login response already returned
   * a real `user` object and it was being thrown away, while AdminSidebar
   * hard-coded "Admin / admin@ecocharge.ph" — so every admin saw the seed
   * account's identity regardless of who actually signed in. Same class of bug
   * as the sessions page's hardcoded mock data (2026-08-11). Stored in
   * sessionStorage next to the token so it shares the token's lifetime exactly.
   * Not sensitive: name/email of the account already signed in on this tab.
   */
  setUser: (u: User) => {
    sessionStorage.setItem("admin_user", JSON.stringify(u));
  },
  getUser: (): User | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("admin_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
};

// ── base fetch ───────────────────────────────────────────────────────────────
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const tok = auth.getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

  if (res.status === 401) {
    auth.clear();
    window.location.href = "/login";
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── public probes ────────────────────────────────────────────────────────────
/**
 * Unauthenticated reachability probe against the real API's `/health`.
 * Used by the login screen's status rail — an operations console should tell
 * you whether the backend is actually up *before* you spend a login attempt
 * on it. Deliberately does not go through `req()`: that redirects to /login on
 * 401, which would be a redirect loop here, and this endpoint takes no token.
 */
export async function probeApiHealth(): Promise<{
  ok: boolean;
  ms: number;
  ts?: string;
}> {
  const t0 = performance.now();

  try {
    const res = await fetch(`${API}/health`, { cache: "no-store" });
    const ms = Math.round(performance.now() - t0);

    if (!res.ok) return { ok: false, ms };
    const body = (await res.json()) as { status?: string; ts?: string };

    return { ok: body.status === "ok", ms, ts: body.ts };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

// ── auth ─────────────────────────────────────────────────────────────────────
export const adminAuth = {
  login: (email: string, password: string) =>
    req<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ── admin endpoints ──────────────────────────────────────────────────────────
export const admin = {
  overview: () => req<Overview>("/api/admin/overview"),
  kiosks: () => req<Kiosk[]>("/api/admin/kiosks"),
  telemetry: (id: number) =>
    req<Telemetry>(`/api/admin/kiosks/${id}/telemetry/latest`),
  // NOTE: unlike deposits/charging/transactions/ml-review, this endpoint
  // returns a bare array (verified against the live API 2026-08-20), as do
  // users and alerts. Typed accordingly rather than forced into Paginated.
  sessions: () => req<KioskSession[]>("/api/admin/sessions"),
  deposits: (page = 1) =>
    req<Paginated<Deposit>>(`/api/admin/deposits?page=${page}`),
  charging: (page = 1, status?: string) =>
    req<Paginated<ChargingSession>>(
      `/api/admin/charging?page=${page}${status ? `&status=${status}` : ""}`,
    ),
  transactions: (page = 1) =>
    req<Paginated<Transaction>>(`/api/admin/transactions?page=${page}`),
  users: () => req<User[]>("/api/admin/users"),
  alerts: () => req<Alert[]>("/api/admin/alerts"),
  mlReview: (page = 1, threshold = 0.7) =>
    req<Paginated<Deposit>>(
      `/api/admin/ml-review?page=${page}&threshold=${threshold}`,
    ),
  settings: () => req<Record<string, string>>("/api/admin/settings"),
  saveSettings: (body: Record<string, string>) =>
    req<Record<string, string>>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  analytics: () => req<Analytics>("/api/admin/analytics"),

  // ── kiosk CRUD ──────────────────────────────────────────────────────────────
  createKiosk: (name: string, location: string) =>
    req<Kiosk & { api_key: string }>("/api/admin/kiosks", {
      method: "POST",
      body: JSON.stringify({ name, location }),
    }),
  updateKiosk: (id: number, data: { name?: string; location?: string }) =>
    req<Kiosk>(`/api/admin/kiosks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteKiosk: (id: number) =>
    req<{ deleted: boolean }>(`/api/admin/kiosks/${id}`, { method: "DELETE" }),

  // ── kiosk commands ───────────────────────────────────────────────────────────
  sendCommand: (kioskId: number, command_type: string, payload?: object) =>
    req<{ command_id: number; command_type: string; queued: boolean }>(
      `/api/admin/kiosks/${kioskId}/command`,
      { method: "POST", body: JSON.stringify({ command_type, payload }) },
    ),
  commandHistory: (kioskId: number, limit = 50) =>
    req<KioskCommand[]>(`/api/admin/kiosks/${kioskId}/commands?limit=${limit}`),
};

// ── types ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  credit_balance: number;
  is_admin: boolean;
  created_at: string;
}
export interface Kiosk {
  id: number;
  name: string;
  location: string;
  status: "online" | "offline" | "error";
  last_seen_at: string;
  bin_level: number | null;
}
export interface Telemetry {
  id: number;
  kiosk_id: number;
  bin_level?: number;
  port_data: object;
  timestamp: string;
}
export interface KioskSession {
  id: number;
  user_id: number;
  kiosk_id: number;
  started_at: string;
  ended_at?: string | null;
  // The endpoint joins these in; the table used to ignore them and render
  // "User #2" / "Kiosk #2" instead of the real names it was already being sent.
  user?: { name: string; email: string } | null;
  kiosk?: { name: string } | null;
}
export interface Deposit {
  id: number;
  session_id: number;
  brand: string;
  volume_ml: number;
  condition: string;
  confidence: number;
  credits_awarded: number;
  timestamp: string;
}
export interface ChargingSession {
  id: number;
  user_id: number;
  kiosk_id: number;
  port_number: number;
  credits_used: number;
  duration_seconds: number;
  status: string;
  started_at: string;
}
export interface Transaction {
  id: number;
  user_id: number;
  type: "EARN" | "SPEND";
  amount: number;
  balance_after: number;
  timestamp: string;
}
export interface Alert {
  type: string;
  kiosk_id: number;
  kiosk_name: string;
  message: string;
  // Real vocabulary the backend actually emits (src/routes/admin.ts GET
  // /alerts) — "warning"/"error" never occur; fixed 2026-08-11 after a
  // design-review pass found the strip and alerts page were both silently
  // failing to flag the one real offline kiosk because of this mismatch.
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
}
export interface Overview {
  total_users: number;
  total_deposits: number;
  active_charging: number;
  total_credits_earned: number;
  kiosks_online: number;
}
/**
 * The real paginated envelope: `{ items, total, pages, page }`.
 *
 * Found 2026-08-20: this interface used to declare `items?`, `deposits?`,
 * `sessions?` and `transactions?` as four *optional* alternates, so
 * `r.deposits ?? []` typechecked cleanly while always evaluating to `[]` at
 * runtime — the API only ever sends `items`. Five pages (deposits, charging,
 * credits, ml-review, sessions) each read a key that never existed and
 * rendered a permanently empty table. It went unnoticed because those tables
 * genuinely had no rows yet; the moment real deposits existed the console
 * would have shown nothing, with no error anywhere. `items` is required now
 * precisely so a wrong accessor fails the build instead of failing silently.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
}
export interface Analytics {
  days: Array<{
    date: string;
    kwh_consumed: number;
    credits_issued: number;
    gain_loss_php: number;
  }>;
}
export interface TelemetryPort {
  port: number;
  current_a: number;
  voltage_v: number;
  relay_on: boolean;
}
export interface KioskCommand {
  id: number;
  command_type: string;
  payload: Record<string, unknown>;
  // Real vocabulary per analyzation.md SS4 (DeviceCommand.status) - this type
  // was missing FAILED/EXPIRED entirely until 2026-08-11, so the command
  // audit log's badge logic could never have matched those two real states.
  status: "PENDING" | "ACKED" | "FAILED" | "EXPIRED";
  created_at: string;
  acked_at?: string;
}
export interface SseEvent {
  type: "telemetry" | "overview";
  kioskId?: number;
  portData?: TelemetryPort[];
  binLevel?: number;
  // overview fields:
  total_users?: number;
  total_deposits?: number;
  active_charging?: number;
  total_credits_earned?: number;
  kiosks_online?: number;
}

// ── SSE helper ───────────────────────────────────────────────────────────────
export function openAdminSSE(
  onEvent: (event: SseEvent) => void,
  onError?: () => void,
  onOpen?: () => void,
): () => void {
  const token = auth.getToken();
  const API = process.env.NEXT_PUBLIC_API_URL ?? "";
  const es = new EventSource(`${API}/api/admin/sse?token=${token ?? ""}`);

  /**
   * Real bug found 2026-08-11 on a live screenshot: the dashboard's connection
   * badge was driven off the first *message*, not the connection itself. With
   * an idle fleet the server legitimately sends nothing, so a perfectly healthy
   * stream sat on "Connecting…" forever and looked broken. `onopen` is the
   * signal that actually means "connected".
   */
  es.onopen = () => onOpen?.();

  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data) as SseEvent);
    } catch {
      /* ignore */
    }
  };
  if (onError) es.onerror = onError;

  return () => es.close();
}
