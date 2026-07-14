"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";
      isActive: boolean;
    };
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@taskflow.com");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("Frontend API URL is not configured.");
      }

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success || !result.data) {
        setError(result.message || "Login failed.");
        return;
      }

      localStorage.setItem("accessToken", result.data.accessToken);
      localStorage.setItem("taskflowUser", JSON.stringify(result.data.user));

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login request failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            T
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to TaskFlow
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage projects, teams and tasks.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="admin@taskflow.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">
            Local administrator account
          </p>
          <p className="mt-1">Email: admin@taskflow.com</p>
          <p>Password: Admin@123</p>
        </div>
      </div>
    </main>
  );
}