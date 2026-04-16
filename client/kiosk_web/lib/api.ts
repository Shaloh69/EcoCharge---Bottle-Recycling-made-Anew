const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── token helpers ────────────────────────────────────────────────────────────
export const token = {
  get: () =>
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null,
  set: (t: string) => sessionStorage.setItem("token", t),
  clear: () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("session");
    sessionStorage.removeItem("user");
  },
};
export const session = {
  get: () =>
    typeof window !== "undefined" ? sessionStorage.getItem("session") : null,
  set: (id: string) => sessionStorage.setItem("session", id),
};
export const userStore = {
  get: () => {
    const s =
      typeof window !== "undefined" ? sessionStorage.getItem("user") : null;

    return s ? JSON.parse(s) : null;
  },
  set: (u: object) => sessionStorage.setItem("user", JSON.stringify(u)),
};

// ── base fetch ───────────────────────────────────────────────────────────────
async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const tok = token.get();
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    req<{ access_token: string; user: User }>(`${API}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, phone?: string) =>
    req<{ access_token: string; user: User }>(`${API}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone }),
    }),
  // Issues a short-lived JWT for guest kiosk users so requireAuth passes.
  guest: (kiosk_id: number) =>
    req<{ access_token: string; session_id: number; user: User }>(
      `${API}/api/auth/guest`,
      { method: "POST", body: JSON.stringify({ kiosk_id }) },
    ),
};

// ── kiosk session ────────────────────────────────────────────────────────────
export const kioskApi = {
  startSession: (kiosk_id: number) =>
    req<{ id: number }>(`${API}/api/kiosk/sessions`, {
      method: "POST",
      body: JSON.stringify({ kiosk_id }),
    }),
  endSession: (session_id: number) =>
    req<object>(`${API}/api/kiosk/sessions/${session_id}`, {
      method: "DELETE",
    }),
  recordDeposit: (
    session_id: number,
    brand: string,
    volume_ml: number,
    condition: string,
    confidence: number,
  ) =>
    req<{ deposit: Deposit; credits_awarded: number; new_balance: number }>(
      `${API}/api/kiosk/deposits`,
      {
        method: "POST",
        body: JSON.stringify({
          session_id,
          brand,
          volume_ml,
          condition,
          confidence,
        }),
      },
    ),

  // AI approved — create pending deposit, tell ESP32 to drop bottle
  approveBottle: (
    session_id: number,
    brand: string | null,
    volume_ml: number | null,
    condition: string | null,
    confidence: number,
  ) =>
    req<{ deposit_id: number; status: string; credits_pending: number }>(
      `${API}/api/kiosk/bottle/approve`,
      {
        method: "POST",
        body: JSON.stringify({
          session_id,
          brand,
          volume_ml,
          condition,
          confidence,
        }),
      },
    ),

  // AI rejected — tell ESP32 to reverse belt and eject bottle
  rejectBottle: (session_id: number) =>
    req<{ rejected: boolean }>(`${API}/api/kiosk/bottle/reject`, {
      method: "POST",
      body: JSON.stringify({ session_id }),
    }),
};

// ── charging ─────────────────────────────────────────────────────────────────
export const charging = {
  start: (kiosk_id: number, port_number: number, credits = 1) =>
    req<{ charging_session: ChargingSession; new_balance: number }>(
      `${API}/api/charging/start`,
      {
        method: "POST",
        body: JSON.stringify({ kiosk_id, port_number, credits }),
      },
    ),
  stop: (charging_id: number) =>
    req<object>(`${API}/api/charging/stop/${charging_id}`, { method: "POST" }),
  active: () => req<ChargingSession[]>(`${API}/api/charging/active`),
};

// ── user ─────────────────────────────────────────────────────────────────────
export const user = {
  me: () => req<User>(`${API}/api/users/me`),
  credits: () => req<{ credit_balance: number }>(`${API}/api/users/me/credits`),
};

// ── AI detect ────────────────────────────────────────────────────────────────
export async function detectBottle(imageBlob: Blob): Promise<DetectionResult> {
  const form = new FormData();

  form.append("image", imageBlob, "capture.jpg");
  const res = await fetch("/api/detect", {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(`AI error ${res.status}`);

  return res.json();
}

// ── SSE event types ───────────────────────────────────────────────────────────
export interface KioskSSEEvent {
  // port telemetry broadcast
  type?: "ports" | "bottleInBin";
  ports?: Array<{
    port: number;
    available: boolean;
    relay_on: boolean;
    voltage: number;
    current: number;
    watts: number;
    remaining_seconds: number | null;
  }>;
  // bottle FSM fields
  bottleAtEntrance?: boolean;
  fsmState?: string;
  // bin confirmation
  confirmed?: boolean;
  deposit_id?: number;
  credits_awarded?: number;
  // legacy fields
  portData?: Array<{
    port: number;
    current_a: number;
    voltage_v: number;
    relay_on: boolean;
  }>;
  binLevel?: number;
}

// ── SSE ──────────────────────────────────────────────────────────────────────
export function openKioskSSE(
  kioskId: number,
  onEvent: (event: KioskSSEEvent) => void,
  onError?: () => void,
): () => void {
  const tok =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  const url = `${API}/api/kiosk/${kioskId}/sse${tok ? `?token=${tok}` : ""}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };
  if (onError) es.onerror = onError;

  return () => es.close();
}

// ── types ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  credit_balance: number;
  qr_code: string;
}
export interface Deposit {
  id: number;
  brand: string;
  volume_ml: number;
  condition: string;
  confidence: number;
  credits_awarded: number;
  timestamp: string;
}
export interface ChargingSession {
  id: number;
  port_number: number;
  credits_used: number;
  duration_seconds: number;
  status: string;
  started_at: string;
}
export interface DetectionResult {
  detected: boolean;
  confidence: number;
  brand: string;
  brand_confidence: number;
  volume_ml: number;
  volume_confidence: number;
  condition: string;
  condition_confidence: number;
  bounding_box?: number[];
}

export interface BinConfirmEvent {
  type: "bottleInBin";
  confirmed: boolean;
  deposit_id?: number;
  credits_awarded: number;
}
