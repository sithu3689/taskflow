import type { Request, Response } from "express";
import { Role, TaskStatus } from "../../generated/prisma/client.js";

import { prisma } from "../config/prisma.js";
import {
  createTaskSchema,
  updateTaskProgressSchema,
  updateTaskSchema,
} from "../schemas/task.schema.js";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  progress: true,
  dueDate: true,
  projectId: true,
  assignedToId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      name: true,
      managerId: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

function getStringParam(
  request: Request,
  parameterName: string,
): string | null {
  const value = request.params[parameterName];

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value;
}

async function userCanAccessProject(
  userId: string,
  role: Role,
  projectId: string,
): Promise<boolean> {
  if (role === Role.ADMIN) {
    return true;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      managerId: true,
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!project) {
    return false;
  }

  return (
    project.managerId === userId ||
    project.members.length > 0
  );
}

export async function createTask(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    if (
      request.user.role !== Role.ADMIN &&
      request.user.role !== Role.PROJECT_MANAGER
    ) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to create tasks.",
      });
      return;
    }

    const validationResult = createTaskSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid task information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const {
      title,
      description,
      projectId,
      assignedToId,
      status,
      priority,
      progress,
      dueDate,
    } = validationResult.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        managerId: true,
      },
    });

    if (!project) {
      response.status(404).json({
        success: false,
        message: "Project not found.",
      });
      return;
    }

    if (
      request.user.role === Role.PROJECT_MANAGER &&
      project.managerId !== request.user.userId
    ) {
      response.status(403).json({
        success: false,
        message: "You can create tasks only for projects you manage.",
      });
      return;
    }

    if (assignedToId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: assignedToId,
          },
        },
        include: {
          user: true,
        },
      });

      if (!membership) {
        response.status(400).json({
          success: false,
          message: "Assigned user must be a member of the project.",
        });
        return;
      }

      if (!membership.user.isActive) {
        response.status(400).json({
          success: false,
          message: "Assigned user is inactive.",
        });
        return;
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assignedToId,
        createdById: request.user.userId,
        status,
        priority,
        progress,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      select: taskSelect,
    });

    response.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: { task },
    });
  } catch (error) {
    console.error("Create task error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to create the task.",
    });
  }
}

export async function getTasks(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const where =
      request.user.role === Role.ADMIN
        ? {}
        : request.user.role === Role.PROJECT_MANAGER
          ? {
              project: {
                managerId: request.user.userId,
              },
            }
          : {
              assignedToId: request.user.userId,
            };

    const tasks = await prisma.task.findMany({
      where,
      select: taskSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve tasks.",
    });
  }
}

export async function getTaskById(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid task ID is required.",
      });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      select: taskSelect,
    });

    if (!task) {
      response.status(404).json({
        success: false,
        message: "Task not found.",
      });
      return;
    }

    const canAccess = await userCanAccessProject(
      request.user.userId,
      request.user.role,
      task.projectId,
    );

    const isAssignee = task.assignedToId === request.user.userId;

    if (!canAccess && !isAssignee) {
      response.status(403).json({
        success: false,
        message: "You do not have access to this task.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error("Get task error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve the task.",
    });
  }
}

export async function updateTask(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid task ID is required.",
      });
      return;
    }

    const validationResult = updateTaskSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid task information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      response.status(404).json({
        success: false,
        message: "Task not found.",
      });
      return;
    }

    const canManage =
      request.user.role === Role.ADMIN ||
      existingTask.project.managerId === request.user.userId;

    if (!canManage) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to update this task.",
      });
      return;
    }

    const { assignedToId, dueDate, ...otherData } =
      validationResult.data;

    if (assignedToId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existingTask.projectId,
            userId: assignedToId,
          },
        },
        include: {
          user: true,
        },
      });

      if (!membership || !membership.user.isActive) {
        response.status(400).json({
          success: false,
          message:
            "Assigned user must be an active member of the project.",
        });
        return;
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...otherData,
        ...(assignedToId !== undefined && { assignedToId }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
      },
      select: taskSelect,
    });

    response.status(200).json({
      success: true,
      message: "Task updated successfully.",
      data: { task },
    });
  } catch (error) {
    console.error("Update task error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to update the task.",
    });
  }
}

export async function updateTaskProgress(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid task ID is required.",
      });
      return;
    }

    const validationResult =
      updateTaskProgressSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid progress value.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      response.status(404).json({
        success: false,
        message: "Task not found.",
      });
      return;
    }

    const canUpdate =
      request.user.role === Role.ADMIN ||
      task.project.managerId === request.user.userId ||
      task.assignedToId === request.user.userId;

    if (!canUpdate) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to update task progress.",
      });
      return;
    }

    const progress = validationResult.data.progress;

    const status =
      progress === 100
        ? TaskStatus.COMPLETED
        : progress > 0
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.TODO;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        progress,
        status,
      },
      select: taskSelect,
    });

    response.status(200).json({
      success: true,
      message: "Task progress updated successfully.",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error("Update task progress error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to update task progress.",
    });
  }
}

export async function deleteTask(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid task ID is required.",
      });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      response.status(404).json({
        success: false,
        message: "Task not found.",
      });
      return;
    }

    const canDelete =
      request.user.role === Role.ADMIN ||
      task.project.managerId === request.user.userId;

    if (!canDelete) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to delete this task.",
      });
      return;
    }

    await prisma.task.delete({
      where: { id },
    });

    response.status(200).json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to delete the task.",
    });
  }
}