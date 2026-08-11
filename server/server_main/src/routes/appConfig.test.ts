import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import appConfigRouter from "./appConfig";
import { config } from "../config";

// Covers the mobile app's launch-time update gate (see
// client/flutter_app/lib/services/app_version_service.dart). The Flutter side
// fails open on any bad response, so the failure mode this guards against is
// the quiet one: the endpoint still answering 200 but stopping to include the
// fields the gate reads, which would silently disable the gate everywhere
// instead of breaking visibly.

function makeApp() {
  const app = express();
  app.use("/api/app-config", appConfigRouter);
  return app;
}

describe("GET /api/app-config", () => {
  it("is public — no auth token required", async () => {
    const res = await request(makeApp()).get("/api/app-config");
    expect(res.status).toBe(200);
  });

  it("returns the three fields the Flutter gate reads", async () => {
    const res = await request(makeApp()).get("/api/app-config");
    expect(res.body).toHaveProperty("min_version");
    expect(res.body).toHaveProperty("latest_version");
    expect(res.body).toHaveProperty("download_url");
    expect(typeof res.body.min_version).toBe("string");
    expect(typeof res.body.latest_version).toBe("string");
  });

  it("reports the configured versions", async () => {
    const res = await request(makeApp()).get("/api/app-config");
    expect(res.body.min_version).toBe(config.MIN_APP_VERSION);
    expect(res.body.latest_version).toBe(config.LATEST_APP_VERSION);
  });

  it("leaks nothing secret — the response carries only version metadata", async () => {
    const res = await request(makeApp()).get("/api/app-config");
    const body = JSON.stringify(res.body).toLowerCase();
    for (const forbidden of ["secret", "jwt", "api_key", "apikey", "password", "database_url"]) {
      expect(body).not.toContain(forbidden);
    }
    expect(Object.keys(res.body).sort()).toEqual([
      "download_url",
      "latest_version",
      "min_version",
    ]);
  });
});
