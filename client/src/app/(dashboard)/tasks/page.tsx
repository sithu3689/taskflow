"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UserRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";

type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface ProjectSummary {
  id: string;
  name: string;
  managerId: string;
}

interface ProjectMember {
  id: string;
  userId?: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate: string | null;
  projectId: string;
  assignedToId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface TasksResponse {
  success: boolean;
  message?: string;
  data?: {
    tasks: Task[];
    count: number;
  };
}

interface TaskResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  data?: {
    task: Task;
  };
}

interface ProjectsResponse {
  success: boolean;
  message?: string;
  data?: {
    projects: ProjectSummary[];
    count: number;
  };
}

interface MembersResponse {
  success: boolean;
  message?: string;
  data?: ProjectMember[];
  count?: number;
}

const initialForm = {
  title: "",
  description: "",
  projectId: "",
  assignedToId: "",
  priority: "MEDIUM" as TaskPriority,
  status: "TODO" as TaskStatus,
  progress: 0,
  dueDate: "",
};

function formatStatus(status: TaskStatus): string {
  return status.replaceAll("_", " ");
}

function formatDate(date: string | null): string {
  if (!date) {
    return "Not set";
  }

  return new Date(date).toLocaleDateString();
}

function priorityClasses(priority: TaskPriority): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-700";

    case "HIGH":
      return "bg-orange-100 text-orange-700";

    case "MEDIUM":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function TasksPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<StoredUser | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [form, setForm] = useState(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const canCreateTask =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "PROJECT_MANAGER";

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

  const loadTasks = useCallback(async () => {
    const authentication = getAuthentication();

    if (!authentication) {
      redirectToLogin();
      return;
    }

    setCurrentUser(authentication.user);

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      return;
    }

    const response = await fetch(`${apiUrl}/tasks`, {
      headers: {
        Authorization: `Bearer ${authentication.token}`,
      },
    });

    const result = (await response.json()) as TasksResponse;

    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Unable to load tasks.");
    }

    setTasks(result.data.tasks);
  }, [apiUrl, getAuthentication, redirectToLogin]);

  const loadProjects = useCallback(async () => {
    const authentication = getAuthentication();

    if (!authentication || !apiUrl) {
      return;
    }

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

    if (response.ok && result.success && result.data) {
      setProjects(result.data.projects);
    }
  }, [apiUrl, getAuthentication, redirectToLogin]);

  useEffect(() => {
    async function initialise() {
      setIsLoading(true);
      setError("");

      try {
        await Promise.all([loadTasks(), loadProjects()]);
      } catch (error) {
        console.error("Tasks page loading error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load task information.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void initialise();
  }, [loadProjects, loadTasks]);

  async function loadProjectMembers(projectId: string) {
    setMembers([]);

    if (!projectId) {
      return;
    }

    const authentication = getAuthentication();

    if (!authentication || !apiUrl) {
      return;
    }

    setIsLoadingMembers(true);

    try {
      const response = await fetch(
        `${apiUrl}/projects/${projectId}/members`,
        {
          headers: {
            Authorization: `Bearer ${authentication.token}`,
          },
        },
      );

      const result = (await response.json()) as MembersResponse;

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to load project members.",
        );
      }

      setMembers(
        result.data.filter((member) => member.user.isActive),
      );
    } catch (error) {
      console.error("Load project members error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load project members.",
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleProjectChange(projectId: string) {
    setForm((current) => ({
      ...current,
      projectId,
      assignedToId: "",
    }));

    setError("");

    await loadProjectMembers(projectId);
  }

  async function handleCreateTask(
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
        title: form.title,
        description: form.description || undefined,
        projectId: form.projectId,
        assignedToId: form.assignedToId || undefined,
        priority: form.priority,
        status: form.status,
        progress: form.progress,
        dueDate: form.dueDate
          ? new Date(
              `${form.dueDate}T00:00:00.000Z`,
            ).toISOString()
          : undefined,
      };

      const response = await fetch(`${apiUrl}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authentication.token}`,
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as TaskResponse;

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        const firstValidationError = result.errors
          ? Object.values(result.errors)
              .flat()
              .find(
                (message): message is string => Boolean(message),
              )
          : undefined;

        throw new Error(
          firstValidationError ||
            result.message ||
            "Unable to create task.",
        );
      }

      setTasks((current) => [
        result.data!.task,
        ...current,
      ]);

      setForm(initialForm);
      setMembers([]);
      setSuccessMessage("Task created successfully.");
    } catch (error) {
      console.error("Create task error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create task.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateProgress(task: Task, progress: number) {
    const authentication = getAuthentication();

    if (!authentication) {
      redirectToLogin();
      return;
    }

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      return;
    }

    setUpdatingTaskId(task.id);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/tasks/${task.id}/progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authentication.token}`,
          },
          body: JSON.stringify({ progress }),
        },
      );

      const result = (await response.json()) as TaskResponse;

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to update task progress.",
        );
      }

      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === result.data!.task.id
            ? result.data!.task
            : currentTask,
        ),
      );

      setSuccessMessage("Task progress updated successfully.");
    } catch (error) {
      console.error("Update task progress error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update task progress.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function canUpdateTask(task: Task): boolean {
    if (!currentUser) {
      return false;
    }

    return (
      currentUser.role === "ADMIN" ||
      task.project.managerId === currentUser.id ||
      task.assignedToId === currentUser.id
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />

          <p className="mt-4 text-slate-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-sm font-semibold text-blue-600">
            TaskFlow
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Tasks
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create, assign and monitor project tasks.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[380px_1fr]">
        {canCreateTask && (
          <section className="h-fit rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Create task
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Assign a project member and set task priority.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={handleCreateTask}
            >
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Task title
                </label>

                <input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
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
                  htmlFor="project"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Project
                </label>

                <select
                  id="project"
                  value={form.projectId}
                  onChange={(event) =>
                    void handleProjectChange(event.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                >
                  <option value="">Select project</option>

                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="assignedTo"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Assign to
                </label>

                <select
                  id="assignedTo"
                  value={form.assignedToId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      assignedToId: event.target.value,
                    }))
                  }
                  disabled={!form.projectId || isLoadingMembers}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none disabled:bg-slate-100"
                >
                  <option value="">
                    {isLoadingMembers
                      ? "Loading members..."
                      : "Unassigned"}
                  </option>

                  {members.map((member) => (
                    <option
                      key={member.user.id}
                      value={member.user.id}
                    >
                      {member.user.name} —{" "}
                      {member.user.role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="priority"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Priority
                  </label>

                  <select
                    id="priority"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority:
                          event.target.value as TaskPriority,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dueDate"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Due date
                  </label>

                  <input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isSubmitting ? "Creating..." : "Create task"}
              </button>
            </form>
          </section>
        )}

        <section className={canCreateTask ? "" : "lg:col-span-2"}>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Available tasks
            </h2>

            <p className="text-sm text-slate-500">
              {tasks.length} task
              {tasks.length === 1 ? "" : "s"} visible to your account
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {successMessage}
            </div>
          )}

          <div className="space-y-5">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {task.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Project: {task.project.name}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClasses(
                        task.priority,
                      )}`}
                    >
                      {task.priority}
                    </span>

                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {formatStatus(task.status)}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600">
                  {task.description || "No description provided."}
                </p>

                <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Assigned to</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {task.assignedTo?.name || "Unassigned"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Due date</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {formatDate(task.dueDate)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Progress</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {task.progress}%
                    </dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${task.progress}%`,
                      }}
                    />
                  </div>
                </div>

                {canUpdateTask(task) && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[0, 25, 50, 75, 100].map((progress) => (
                      <button
                        key={progress}
                        type="button"
                        disabled={updatingTaskId === task.id}
                        onClick={() =>
                          void updateProgress(task, progress)
                        }
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                          task.progress === progress
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {progress}%
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {tasks.length === 0 && (
              <div className="rounded-2xl bg-white p-12 text-center text-slate-500 shadow-sm">
                No tasks were found.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}