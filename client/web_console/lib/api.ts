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
    document.cookie = "admin_authed=; path=/; max-age=0; SameSite=Strict";
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
  sessions: (page = 1) =>
    req<Paginated<KioskSession>>(`/api/admin/sessions?page=${page}`),
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
  ended_at?: string;
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
export interface Paginated<T> {
  items?: T[];
  deposits?: T[];
  sessions?: T[];
  transactions?: T[];
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
  status: "PENDING" | "ACKED";
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
): () => void {
  const token = auth.getToken();
  const API = process.env.NEXT_PUBLIC_API_URL ?? "";
  const es = new EventSource(`${API}/api/admin/sse?token=${token ?? ""}`);

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
