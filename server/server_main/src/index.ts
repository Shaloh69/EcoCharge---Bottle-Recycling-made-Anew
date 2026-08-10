import { config } from "./config";
import { createApp, allowedOrigins } from "./app";
import { printBanner, log } from "./logger";
import { runMigrations } from "./startup";
import { startStaleSessionSweep } from "./services/chargingService";

const app = createApp();

// ── Start — bind port first so Render detects it, then migrate + seed ─────────
app.listen(config.PORT, () => {
  printBanner(config.PORT, config.NODE_ENV, allowedOrigins);
});

runMigrations()
  .then(() => {
    startStaleSessionSweep();
    log.startup("Ready ✔");
  })
  .catch((err) => {
    log.error("Startup", `Fatal error: ${err}`);
    process.exit(1);
  });
