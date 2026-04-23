// ANSI color/style codes
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright variants
  bRed: "\x1b[91m",
  bGreen: "\x1b[92m",
  bYellow: "\x1b[93m",
  bBlue: "\x1b[94m",
  bMagenta: "\x1b[95m",
  bCyan: "\x1b[96m",
  bWhite: "\x1b[97m",
};

function ts() {
  return `${C.gray}${new Date().toISOString()}${C.reset}`;
}

function tag(label: string, color: string) {
  return `${color}${C.bold}[${label}]${C.reset}`;
}

// ── Domain loggers ─────────────────────────────────────────────────────────────

export const log = {
  // ── Infrastructure ──────────────────────────────────────────────────────────
  startup(msg: string) {
    console.log(
      `${ts()} ${tag("Startup", C.bGreen)} ${C.bGreen}${msg}${C.reset}`,
    );
  },
  migration(msg: string) {
    console.log(`${ts()} ${tag("Migration", C.bBlue)} ${msg}`);
  },
  seed(msg: string) {
    console.log(`${ts()} ${tag("Seed", C.green)} ${msg}`);
  },
  cors(msg: string) {
    console.log(`${ts()} ${tag("CORS", C.gray)} ${C.dim}${msg}${C.reset}`);
  },
  health(msg: string) {
    console.log(`${ts()} ${tag("Health", C.gray)} ${C.dim}${msg}${C.reset}`);
  },

  // ── AI Server ───────────────────────────────────────────────────────────────
  ai(msg: string) {
    console.log(`${ts()} ${tag("AI", C.bYellow)} ${C.yellow}${msg}${C.reset}`);
  },
  aiWarn(msg: string) {
    console.warn(
      `${ts()} ${tag("AI", C.bYellow)} ${C.yellow}⚠  ${msg}${C.reset}`,
    );
  },
  aiError(msg: string) {
    console.error(
      `${ts()} ${tag("AI", C.bYellow)} ${C.bRed}✖  ${msg}${C.reset}`,
    );
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  auth(msg: string) {
    console.log(`${ts()} ${tag("Auth", C.bBlue)} ${msg}`);
  },
  authWarn(msg: string) {
    console.warn(`${ts()} ${tag("Auth", C.bBlue)} ${C.yellow}${msg}${C.reset}`);
  },

  // ── Kiosk ───────────────────────────────────────────────────────────────────
  kiosk(msg: string) {
    console.log(`${ts()} ${tag("Kiosk", C.cyan)} ${msg}`);
  },
  kioskWarn(msg: string) {
    console.warn(`${ts()} ${tag("Kiosk", C.cyan)} ${C.yellow}${msg}${C.reset}`);
  },

  // ── Device (ESP32) ──────────────────────────────────────────────────────────
  device(msg: string) {
    console.log(`${ts()} ${tag("Device", C.bCyan)} ${msg}`);
  },
  deviceWarn(msg: string) {
    console.warn(
      `${ts()} ${tag("Device", C.bCyan)} ${C.yellow}${msg}${C.reset}`,
    );
  },

  // ── Charging ─────────────────────────────────────────────────────────────────
  charging(msg: string) {
    console.log(`${ts()} ${tag("Charging", C.magenta)} ${msg}`);
  },
  chargingWarn(msg: string) {
    console.warn(
      `${ts()} ${tag("Charging", C.magenta)} ${C.yellow}${msg}${C.reset}`,
    );
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  admin(msg: string) {
    console.log(`${ts()} ${tag("Admin", C.white)} ${msg}`);
  },

  // ── Generic ──────────────────────────────────────────────────────────────────
  warn(domain: string, msg: string) {
    console.warn(
      `${ts()} ${tag(domain, C.yellow)} ${C.yellow}⚠  ${msg}${C.reset}`,
    );
  },
  error(domain: string, msg: string) {
    console.error(
      `${ts()} ${tag(domain, C.bRed)} ${C.bRed}✖  ${msg}${C.reset}`,
    );
  },

  // ── HTTP Request ─────────────────────────────────────────────────────────────
  request(method: string, path: string, status: number, ms: number) {
    const METHOD_COLOR: Record<string, string> = {
      GET: C.bGreen,
      POST: C.bBlue,
      PUT: C.bYellow,
      PATCH: C.yellow,
      DELETE: C.bRed,
      OPTIONS: C.gray,
    };
    const methodColor = METHOD_COLOR[method] ?? C.white;
    const statusColor =
      status < 300
        ? C.bGreen
        : status < 400
          ? C.cyan
          : status < 500
            ? C.yellow
            : C.bRed;
    const msColor = ms < 150 ? C.green : ms < 500 ? C.yellow : C.bRed;
    const statusIcon = status < 300 ? "✔" : status < 400 ? "→" : "✖";

    console.log(
      `${ts()} ` +
        `${methodColor}${C.bold}${method.padEnd(7)}${C.reset} ` +
        `${C.white}${path.padEnd(45)}${C.reset}` +
        `${statusColor}${statusIcon} ${status}${C.reset}  ` +
        `${msColor}${ms}ms${C.reset}`,
    );
  },
};

// ── Startup banner ─────────────────────────────────────────────────────────────
export function printBanner(port: number, env: string, origins: string[]) {
  const line = `${C.bGreen}${"─".repeat(50)}${C.reset}`;
  const label = (k: string, v: string) =>
    `  ${C.gray}${k.padEnd(18)}${C.reset}${C.bWhite}${v}${C.reset}`;

  console.log(line);
  console.log(`  ${C.bGreen}${C.bold}EcoCharge API${C.reset}`);
  console.log(label("Port", String(port)));
  console.log(label("Env", env));
  console.log(label("Origins", origins.join(", ") || "(none)"));
  console.log(line);
}
