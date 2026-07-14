"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UserRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";

type ProjectStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface ProjectMember {
  id: string;
  joinedAt: string;
  user: User;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  managerId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  manager: User;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  members: ProjectMember[];
}

interface ProjectsResponse {
  success: boolean;
  message?: string;
  data?: {
    projects: Project[];
    count: number;
  };
}

interface ProjectResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  data?: {
    project: Project;
  };
}

interface UsersResponse {
  success: boolean;
  message?: string;
  data?: {
    users: User[];
    count: number;
  };
}

const initialForm = {
  name: "",
  description: "",
  managerId: "",
  status: "PLANNED" as ProjectStatus,
  startDate: "",
  endDate: "",
};

function formatDate(date: string | null): string {
  if (!date) {
    return "Not set";
  }

  return new Date(date).toLocaleDateString();
}

function statusClasses(status: ProjectStatus): string {
   switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";

    case "COMPLETED":
      return "bg-indigo-100 text-indigo-700";

    case "ON_HOLD":
      return "bg-amber-100 text-amber-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}


export default function ProjectsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(
    null,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [form, setForm] = useState(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canCreateProject =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "PROJECT_MANAGER";

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const getAuthentication = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("taskflowUser");

    if (!token || !storedUser) {
      return null;
    }

    try {
      return {
        token,
        user: JSON.parse(storedUser) as StoredUser,
      };
    } catch {
      return null;
    }
  }, []);

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("taskflowUser");
    router.replace("/login");
  }, [router]);

  const loadProjects = useCallback(async () => {
    const authentication = getAuthentication();

    if (!authentication) {
      redirectToLogin();
      return;
    }

    setCurrentUser(authentication.user);

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/projects`, {
        headers: {
          Authorization: `Bearer ${authentication.token}`,
        },
      });

      const result = (await response.json()) as ProjectsResponse;

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to load projects.");
      }

      setProjects(result.data.projects);
    } catch (error) {
      console.error("Load projects error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load projects.",
      );
    }
  }, [apiUrl, getAuthentication, redirectToLogin]);

  const loadManagers = useCallback(async () => {
    const authentication = getAuthentication();

    if (!authentication || authentication.user.role !== "ADMIN") {
      return;
    }

    if (!apiUrl) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          Authorization: `Bearer ${authentication.token}`,
        },
      });

      const result = (await response.json()) as UsersResponse;

      if (!response.ok || !result.success || !result.data) {
        return;
      }

      const eligibleManagers = result.data.users.filter(
        (user) =>
          user.isActive &&
          (user.role === "ADMIN" ||
            user.role === "PROJECT_MANAGER"),
      );

      setManagers(eligibleManagers);
    } catch (error) {
      console.error("Load managers error:", error);
    }
  }, [apiUrl, getAuthentication]);

  useEffect(() => {
    async function initialise() {
      setIsLoading(true);
      setError("");

      await Promise.all([loadProjects(), loadManagers()]);

      setIsLoading(false);
    }

    void initialise();
  }, [loadManagers, loadProjects]);

  useEffect(() => {
    if (
      currentUser?.role === "PROJECT_MANAGER" &&
      !form.managerId
    ) {
      setForm((current) => ({
        ...current,
        managerId: currentUser.id,
      }));
    }
  }, [currentUser, form.managerId]);

  const visibleManagers = useMemo(() => {
    if (currentUser?.role === "PROJECT_MANAGER") {
      return currentUser
        ? [
            {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              isActive: currentUser.isActive,
            },
          ]
        : [];
    }

    return managers;
  }, [currentUser, managers]);

  async function handleCreateProject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const authentication = getAuthentication();

    if (!authentication) {
      redirectToLogin();
      return;
    }

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        managerId: form.managerId,
        status: form.status,
        startDate: form.startDate
          ? new Date(`${form.startDate}T00:00:00.000Z`).toISOString()
          : undefined,
        endDate: form.endDate
          ? new Date(`${form.endDate}T00:00:00.000Z`).toISOString()
          : undefined,
      };

      const response = await fetch(`${apiUrl}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authentication.token}`,
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as ProjectResponse;

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        const firstValidationError = result.errors
          ? Object.values(result.errors)
              .flat()
              .find((message): message is string => Boolean(message))
          : undefined;

        throw new Error(
          firstValidationError ||
            result.message ||
            "Unable to create project.",
        );
      }

      setProjects((current) => [
        result.data!.project,
        ...current,
      ]);

      setForm({
        ...initialForm,
        managerId:
          currentUser?.role === "PROJECT_MANAGER"
            ? currentUser.id
            : "",
      });

      setSuccessMessage("Project created successfully.");
    } catch (error) {
      console.error("Create project error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <p className="mt-4 text-slate-600">Loading projects...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      

      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        {canCreateProject && (
          <section className="h-fit rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Create project
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Assign an active project manager and project dates.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={handleCreateProject}
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Project name
                </label>

                <input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  minLength={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="manager"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Project manager
                </label>

                <select
                  id="manager"
                  value={form.managerId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      managerId: event.target.value,
                    }))
                  }
                  required
                  disabled={currentUser?.role === "PROJECT_MANAGER"}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none disabled:bg-slate-100"
                >
                  <option value="">Select manager</option>

                  {visibleManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} —{" "}
                      {manager.role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>

                <select
                  id="status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Start date
                  </label>

                  <input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    End date
                  </label>

                  <input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isSubmitting ? "Creating..." : "Create project"}
              </button>
            </form>
          </section>
        )}

        <section
          className={
            canCreateProject ? "" : "lg:col-span-2"
          }
        >
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Available projects
            </h2>

            <p className="text-sm text-slate-500">
              {projects.length} project
              {projects.length === 1 ? "" : "s"} visible to your
              account
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {project.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Managed by {project.manager.name}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                    project.status,
                    )}`}
                >
                         {project.status.replaceAll("_", " ")}
                 </span>
                </div>

                <p className="mt-4 min-h-12 text-sm text-slate-600">
                  {project.description || "No description provided."}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Start date</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {formatDate(project.startDate)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">End date</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {formatDate(project.endDate)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Members</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {project.members.length}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Created by</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {project.createdBy.name}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}

            {projects.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm xl:col-span-2">
                No projects were found.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}