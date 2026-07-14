"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  Gauge,
  ListTodo,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";

import StatCard from "../../components/ui/StatCard";

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

function formatRole(role: UserRole): string {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError("");

        const token = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("taskflowUser");

        if (!token || !storedUser) {
          router.replace("/login");
          return;
        }

        const parsedUser = JSON.parse(storedUser) as StoredUser;

        if (!parsedUser.isActive) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("taskflowUser");
          router.replace("/login");
          return;
        }

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

        const result = (await response.json()) as DashboardResponse;

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

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const completionPercentage = clampPercentage(
    dashboard?.tasks.completionPercentage ?? 0,
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-36 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-50 backdrop-blur">
            {formatRole(user.role)}
          </span>

          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.name}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
            Monitor your projects, team members and task progress
            from one workspace.
          </p>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {dashboard && (
        <>
          {/* Main overview */}
          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current activity across your TaskFlow workspace.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.projects && (
                <>
                  <StatCard
                    title="Total projects"
                    value={dashboard.projects.total}
                    description="Projects visible to your account"
                    icon={FolderKanban}
                  />

                  <StatCard
                    title="Active projects"
                    value={dashboard.projects.active}
                    description="Projects currently in progress"
                    icon={CircleDot}
                  />
                </>
              )}

              <StatCard
                title="Total tasks"
                value={dashboard.tasks.total}
                description="All tasks visible to your account"
                icon={ListTodo}
              />

              <StatCard
                title="Completed tasks"
                value={dashboard.tasks.completed}
                description="Tasks successfully completed"
                icon={CheckCircle2}
              />

              {dashboard.users && (
                <>
                  <StatCard
                    title="Total users"
                    value={dashboard.users.total}
                    description="Registered TaskFlow users"
                    icon={Users}
                  />

                  <StatCard
                    title="Active users"
                    value={dashboard.users.active}
                    description="Users currently able to sign in"
                    icon={UserCheck}
                  />
                </>
              )}
            </div>
          </section>

          {/* Task status cards */}
          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Task performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A breakdown of task status and completion.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="To do"
                value={dashboard.tasks.todo}
                description="Tasks waiting to be started"
                icon={Clock3}
              />

              <StatCard
                title="In progress"
                value={dashboard.tasks.inProgress}
                description="Tasks currently being worked on"
                icon={Gauge}
              />

              <StatCard
                title="Overdue"
                value={dashboard.tasks.overdue}
                description="Incomplete tasks past their due date"
                icon={TriangleAlert}
              />

              <StatCard
                title="Completion rate"
                value={`${completionPercentage}%`}
                description="Percentage of completed tasks"
                icon={CheckCircle2}
              />
            </div>
          </section>

          {/* Progress panel */}
          <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-600">
                    Overall progress
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Task completion
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Progress calculated from all tasks visible to
                    your account.
                  </p>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                  <span className="text-xl font-bold text-indigo-700">
                    {completionPercentage}%
                  </span>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">
                    Completion progress
                  </span>

                  <span className="font-semibold text-slate-900">
                    {dashboard.tasks.completed} of{" "}
                    {dashboard.tasks.total}
                  </span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-700"
                    style={{
                      width: `${completionPercentage}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    To do
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {dashboard.tasks.todo}
                  </p>
                </div>

                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    In progress
                  </p>

                  <p className="mt-2 text-2xl font-bold text-indigo-700">
                    {dashboard.tasks.inProgress}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Completed
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {dashboard.tasks.completed}
                  </p>
                </div>
              </div>
            </article>

            {/* Quick summary */}
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                Workspace summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Key information for your account.
              </p>

              <dl className="mt-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <dt className="text-sm text-slate-500">
                    Account role
                  </dt>

                  <dd className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {formatRole(user.role)}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <dt className="text-sm text-slate-500">
                    Active projects
                  </dt>

                  <dd className="font-bold text-slate-900">
                    {dashboard.projects?.active ?? 0}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <dt className="text-sm text-slate-500">
                    Tasks in progress
                  </dt>

                  <dd className="font-bold text-slate-900">
                    {dashboard.tasks.inProgress}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-500">
                    Overdue tasks
                  </dt>

                  <dd
                    className={
                      dashboard.tasks.overdue > 0
                        ? "font-bold text-red-600"
                        : "font-bold text-emerald-600"
                    }
                  >
                    {dashboard.tasks.overdue}
                  </dd>
                </div>
              </dl>
            </article>
          </section>
        </>
      )}
    </div>
  );
}