"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AlertCircle, ArrowRight, Leaf } from "lucide-react";

import { addToast } from "@/lib/toast";
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
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <Paper
        withBorder
        p="xl"
        radius="lg"
        style={{
          width: "100%",
          maxWidth: 380,
          borderTopWidth: 3,
          borderTopColor: "var(--mantine-color-ecoGreen-6)",
          borderTopStyle: "solid",
        }}
      >
        <Stack align="center" gap={4} mb="lg">
          <ThemeIcon color="ecoGreen" radius="md" size={48} variant="light">
            <Leaf size={26} />
          </ThemeIcon>
          <Title fw={700} order={2} ta="center">
            EcoCharge
          </Title>
          <Text
            c="dimmed"
            fw={600}
            size="xs"
            style={{ letterSpacing: "0.12em" }}
            tt="uppercase"
          >
            Operations Console
          </Text>
        </Stack>

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            <TextInput
              required
              label="Email"
              placeholder="admin@ecocharge.ph"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.currentTarget.value })
              }
            />
            <PasswordInput
              required
              label="Password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.currentTarget.value })
              }
            />

            {error && (
              <Alert
                color="red"
                icon={<AlertCircle size={16} />}
                styles={{ message: { fontSize: 13 } }}
                variant="light"
              >
                {error}
              </Alert>
            )}

            <Button
              color="ecoGreen"
              loading={loading}
              mt={4}
              rightSection={!loading && <ArrowRight size={16} />}
              size="md"
              type="submit"
            >
              Sign In
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
