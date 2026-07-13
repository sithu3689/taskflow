import type { Request, Response } from "express";
import {
  ProjectStatus,
  Role,
  TaskStatus,
} from "../../generated/prisma/client.js";

import { prisma } from "../config/prisma.js";

export async function getDashboard(
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

    const now = new Date();

    if (request.user.role === Role.ADMIN) {
      const [
        totalUsers,
        activeUsers,
        totalProjects,
        activeProjects,
        totalTasks,
        todoTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            isActive: true,
          },
        }),
        prisma.project.count(),
        prisma.project.count({
          where: {
            status: ProjectStatus.ACTIVE,
          },
        }),
        prisma.task.count(),
        prisma.task.count({
          where: {
            status: TaskStatus.TODO,
          },
        }),
        prisma.task.count({
          where: {
            status: TaskStatus.IN_PROGRESS,
          },
        }),
        prisma.task.count({
          where: {
            status: TaskStatus.COMPLETED,
          },
        }),
        prisma.task.count({
          where: {
            dueDate: {
              lt: now,
            },
            status: {
              not: TaskStatus.COMPLETED,
            },
          },
        }),
      ]);

      const completionPercentage =
        totalTasks === 0
          ? 0
          : Math.round((completedTasks / totalTasks) * 100);

      response.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
          },
          projects: {
            total: totalProjects,
            active: activeProjects,
          },
          tasks: {
            total: totalTasks,
            todo: todoTasks,
            inProgress: inProgressTasks,
            completed: completedTasks,
            overdue: overdueTasks,
            completionPercentage,
          },
        },
      });
      return;
    }

    if (request.user.role === Role.PROJECT_MANAGER) {
      const projectFilter = {
        managerId: request.user.userId,
      };

      const taskFilter = {
        project: projectFilter,
      };

      const [
        totalProjects,
        activeProjects,
        totalTasks,
        todoTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      ] = await Promise.all([
        prisma.project.count({
          where: projectFilter,
        }),
        prisma.project.count({
          where: {
            ...projectFilter,
            status: ProjectStatus.ACTIVE,
          },
        }),
        prisma.task.count({
          where: taskFilter,
        }),
        prisma.task.count({
          where: {
            ...taskFilter,
            status: TaskStatus.TODO,
          },
        }),
        prisma.task.count({
          where: {
            ...taskFilter,
            status: TaskStatus.IN_PROGRESS,
          },
        }),
        prisma.task.count({
          where: {
            ...taskFilter,
            status: TaskStatus.COMPLETED,
          },
        }),
        prisma.task.count({
          where: {
            ...taskFilter,
            dueDate: {
              lt: now,
            },
            status: {
              not: TaskStatus.COMPLETED,
            },
          },
        }),
      ]);

      const completionPercentage =
        totalTasks === 0
          ? 0
          : Math.round((completedTasks / totalTasks) * 100);

      response.status(200).json({
        success: true,
        data: {
          projects: {
            total: totalProjects,
            active: activeProjects,
          },
          tasks: {
            total: totalTasks,
            todo: todoTasks,
            inProgress: inProgressTasks,
            completed: completedTasks,
            overdue: overdueTasks,
            completionPercentage,
          },
        },
      });
      return;
    }

    const assignedTaskFilter = {
      assignedToId: request.user.userId,
    };

    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
    ] = await Promise.all([
      prisma.task.count({
        where: assignedTaskFilter,
      }),
      prisma.task.count({
        where: {
          ...assignedTaskFilter,
          status: TaskStatus.TODO,
        },
      }),
      prisma.task.count({
        where: {
          ...assignedTaskFilter,
          status: TaskStatus.IN_PROGRESS,
        },
      }),
      prisma.task.count({
        where: {
          ...assignedTaskFilter,
          status: TaskStatus.COMPLETED,
        },
      }),
      prisma.task.count({
        where: {
          ...assignedTaskFilter,
          dueDate: {
            lt: now,
          },
          status: {
            not: TaskStatus.COMPLETED,
          },
        },
      }),
    ]);

    const completionPercentage =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    response.status(200).json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          todo: todoTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          completionPercentage,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard information.",
    });
  }
}