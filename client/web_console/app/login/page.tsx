"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToast } from "@heroui/toast";

import { adminAuth, auth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-3xl p-8"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(76,175,80,0.08)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(76,175,80,0.25), rgba(20,184,166,0.18))",
              border: "1px solid rgba(76,175,80,0.30)",
              boxShadow: "0 8px 24px rgba(76,175,80,0.20)",
            }}
          >
            🌿
          </div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #4ADE80, #2DD4BF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            EcoCharge
          </h1>
          <p
            className="text-xs tracking-widest uppercase mt-1"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Admin Console
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              htmlFor="login-email"
              style={{ color: "rgba(255,255,255,0.50)" }}
            >
              Email
            </label>
            <input
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              id="login-email"
              placeholder="admin@ecocharge.ph"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.90)",
              }}
              type="email"
              value={form.email}
              onBlur={(e) => {
                e.target.style.border = "1px solid rgba(255,255,255,0.12)";
                e.target.style.boxShadow = "none";
              }}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onFocus={(e) => {
                e.target.style.border = "1px solid rgba(76,175,80,0.50)";
                e.target.style.boxShadow = "0 0 0 3px rgba(76,175,80,0.12)";
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              htmlFor="login-password"
              style={{ color: "rgba(255,255,255,0.50)" }}
            >
              Password
            </label>
            <input
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              id="login-password"
              placeholder="••••••••"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.90)",
              }}
              type="password"
              value={form.password}
              onBlur={(e) => {
                e.target.style.border = "1px solid rgba(255,255,255,0.12)";
                e.target.style.boxShadow = "none";
              }}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onFocus={(e) => {
                e.target.style.border = "1px solid rgba(76,175,80,0.50)";
                e.target.style.boxShadow = "0 0 0 3px rgba(76,175,80,0.12)";
              }}
            />
          </div>

          {error && (
            <p
              className="text-xs text-center px-3 py-2 rounded-xl"
              style={{
                color: "#FCA5A5",
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.20)",
              }}
            >
              {error}
            </p>
          )}

          <button
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #4CAF50, #16A34A)",
              color: "#fff",
              boxShadow: "0 8px 24px rgba(76,175,80,0.30)",
              marginTop: "8px",
            }}
            type="submit"
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}
