"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface DashboardData {
  users?: {
    total: number;
    active: number;
  };
  projects?: {
    total: number;
    active: number;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completionPercentage: number;
  };
}

interface DashboardResponse {
  success: boolean;
  message?: string;
  data?: DashboardData;
}

interface DashboardCardProps {
  title: string;
  value: number | string;
  description: string;
}

function DashboardCard({
  title,
  value,
  description,
}: DashboardCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </article>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("taskflowUser");

        if (!token || !storedUser) {
          router.replace("/login");
          return;
        }

        const parsedUser = JSON.parse(storedUser) as StoredUser;
        setUser(parsedUser);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error("Frontend API URL is not configured.");
        }

        const response = await fetch(`${apiUrl}/dashboard`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result =
          (await response.json()) as DashboardResponse;

        if (response.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("taskflowUser");
          router.replace("/login");
          return;
        }

        if (!response.ok || !result.success || !result.data) {
          throw new Error(
            result.message || "Unable to load dashboard.",
          );
        }

        setDashboard(result.data);
      } catch (error) {
        console.error("Dashboard loading error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("taskflowUser");
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />

          <p className="mt-4 text-slate-600">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-blue-600">
              TaskFlow
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-semibold text-slate-900">
                {user.name}
              </p>

              <p className="text-sm text-slate-500">
                {user.role.replaceAll("_", " ")}
              </p>
            </div>
              <div className="flex flex-wrap items-center gap-3">
              {user.role === "ADMIN" && (
            <button
            type="button"
            onClick={() => router.push("/users")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
             >
             Manage users
            </button>
            )}

            <button
             type="button"
             onClick={() => router.push("/projects")}
             className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
             >
             Projects
            </button>

            <button
            type="button"
            onClick={() => router.push("/tasks")}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
            Tasks
            </button>

            <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
             >
            Log out
            </button>
</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-100">
            Welcome back
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {user.name}
          </h2>

          <p className="mt-2 text-blue-100">
            Monitor your projects, users and tasks from one place.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700"
          >
            {error}
          </div>
        )}

        {dashboard && (
          <>
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Overview
              </h2>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {dashboard.users && (
                  <>
                    <DashboardCard
                      title="Total users"
                      value={dashboard.users.total}
                      description="All registered system users"
                    />

                    <DashboardCard
                      title="Active users"
                      value={dashboard.users.active}
                      description="Users currently allowed to sign in"
                    />
                  </>
                )}

                {dashboard.projects && (
                  <>
                    <DashboardCard
                      title="Total projects"
                      value={dashboard.projects.total}
                      description="Projects visible to your account"
                    />

                    <DashboardCard
                      title="Active projects"
                      value={dashboard.projects.active}
                      description="Projects currently in progress"
                    />
                  </>
                )}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Task statistics
              </h2>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DashboardCard
                  title="Total tasks"
                  value={dashboard.tasks.total}
                  description="All tasks visible to your account"
                />

                <DashboardCard
                  title="To do"
                  value={dashboard.tasks.todo}
                  description="Tasks that have not started"
                />

                <DashboardCard
                  title="In progress"
                  value={dashboard.tasks.inProgress}
                  description="Tasks currently being worked on"
                />

                <DashboardCard
                  title="Completed"
                  value={dashboard.tasks.completed}
                  description="Tasks successfully completed"
                />

                <DashboardCard
                  title="Overdue"
                  value={dashboard.tasks.overdue}
                  description="Incomplete tasks past their due date"
                />

                <DashboardCard
                  title="Completion rate"
                  value={`${dashboard.tasks.completionPercentage}%`}
                  description="Percentage of completed tasks"
                />
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Overall task completion
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Progress based on all tasks visible to you.
                  </p>
                </div>

                <p className="text-2xl font-bold text-blue-600">
                  {dashboard.tasks.completionPercentage}%
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${dashboard.tasks.completionPercentage}%`,
                  }}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}