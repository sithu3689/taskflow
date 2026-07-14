"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UserRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  success: boolean;
  message?: string;
  data?: {
    users: User[];
    count: number;
  };
}

interface UserResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  data?: {
    user: User;
  };
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "TEAM_MEMBER" as UserRole,
};

export default function UsersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(
    null,
  );
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getAuthentication = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("taskflowUser");

    if (!token || !storedUser) {
      return null;
    }

    try {
      const user = JSON.parse(storedUser) as StoredUser;

      return {
        token,
        user,
      };
    } catch {
      return null;
    }
  }, []);

  const handleUnauthorised = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("taskflowUser");
    router.replace("/login");
  }, [router]);

  const loadUsers = useCallback(async () => {
    setError("");

    const authentication = getAuthentication();

    if (!authentication) {
      handleUnauthorised();
      return;
    }

    setCurrentUser(authentication.user);

    if (authentication.user.role !== "ADMIN") {
      setError("Only administrators can access user management.");
      setIsLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          Authorization: `Bearer ${authentication.token}`,
        },
      });

      const result = (await response.json()) as UsersResponse;

      if (response.status === 401) {
        handleUnauthorised();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to load users.");
      }

      setUsers(result.data.users);
    } catch (error) {
      console.error("Load users error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAuthentication, handleUnauthorised]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const authentication = getAuthentication();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!authentication) {
      handleUnauthorised();
      return;
    }

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authentication.token}`,
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as UserResponse;

      if (response.status === 401) {
        handleUnauthorised();
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
            "Unable to create user.",
        );
      }

      setUsers((currentUsers) => [
        result.data!.user,
        ...currentUsers,
      ]);

      setForm(initialForm);
      setSuccessMessage("User created successfully.");
    } catch (error) {
      console.error("Create user error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create user.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(user: User) {
    setError("");
    setSuccessMessage("");
    setUpdatingUserId(user.id);

    const authentication = getAuthentication();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!authentication) {
      handleUnauthorised();
      return;
    }

    if (!apiUrl) {
      setError("Frontend API URL is not configured.");
      setUpdatingUserId(null);
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/users/${user.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authentication.token}`,
          },
          body: JSON.stringify({
            isActive: !user.isActive,
          }),
        },
      );

      const result = (await response.json()) as UserResponse;

      if (response.status === 401) {
        handleUnauthorised();
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to update user status.",
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUserItem) =>
          currentUserItem.id === result.data!.user.id
            ? result.data!.user
            : currentUserItem,
        ),
      );

      setSuccessMessage(result.message || "User status updated.");
    } catch (error) {
      console.error("Update status error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update user status.",
      );
    } finally {
      setUpdatingUserId(null);
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

          <p className="mt-4 text-slate-600">Loading users...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              TaskFlow
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              User Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create accounts and control system access.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Create user
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create an administrator, project manager or team member.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={handleCreateUser}
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                minLength={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Temporary password
              </label>

              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Role
              </label>

              <select
                id="role"
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="PROJECT_MANAGER">
                  Project Manager
                </option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isSubmitting ? "Creating..." : "Create user"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                System users
              </h2>

              <p className="text-sm text-slate-500">
                {users.length} registered user
                {users.length === 1 ? "" : "s"}
              </p>
            </div>

            {currentUser && (
              <p className="text-sm text-slate-500">
                Signed in as {currentUser.email}
              </p>
            )}
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

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      User
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {user.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {user.role.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled={
                            updatingUserId === user.id ||
                            user.id === currentUser?.id
                          }
                          onClick={() => void handleStatusChange(user)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                            user.isActive
                              ? "border border-red-200 text-red-600 hover:bg-red-50"
                              : "border border-green-200 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {updatingUserId === user.id
                            ? "Updating..."
                            : user.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No users were found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}