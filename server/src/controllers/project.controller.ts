import type { Request, Response } from "express";
import { Role } from "../../generated/prisma/client.js";

import { prisma } from "../config/prisma.js";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema.js";

const projectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  startDate: true,
  endDate: true,
  managerId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  members: {
    select: {
      id: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  },
} as const;

function getStringParam(
  request: Request,
  parameterName: string,
): string | null {
  const parameter = request.params[parameterName];

  if (typeof parameter !== "string" || parameter.trim() === "") {
    return null;
  }

  return parameter;
}

export async function createProject(
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
     // Only Admin and Project Managers can create projects
    if (
      request.user.role !== Role.ADMIN &&
      request.user.role !== Role.PROJECT_MANAGER
    ) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to create projects.",
      });
      return;
    }


    const validationResult = createProjectSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid project information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const {
      name,
      description,
      managerId,
      status,
      startDate,
      endDate,
    } = validationResult.data;

    if (
      startDate &&
      endDate &&
      new Date(endDate) < new Date(startDate)
    ) {
      response.status(400).json({
        success: false,
        message: "End date cannot be earlier than start date.",
      });
      return;
    }

    const manager = await prisma.user.findUnique({
      where: {
        id: managerId,
      },
    });

    if (!manager) {
      response.status(404).json({
        success: false,
        message: "Project manager not found.",
      });
      return;
    }

    if (!manager.isActive) {
      response.status(400).json({
        success: false,
        message: "The selected project manager is inactive.",
      });
      return;
    }

    if (
      manager.role !== Role.PROJECT_MANAGER &&
      manager.role !== Role.ADMIN
    ) {
      response.status(400).json({
        success: false,
        message:
          "The selected user must be an administrator or project manager.",
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        managerId,
        createdById: request.user.userId,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,

        members: {
          create: {
            userId: managerId,
          },
        },
      },
      select: projectSelect,
    });

    response.status(201).json({
      success: true,
      message: "Project created successfully.",
      data: {
        project,
      },
    });
  } catch (error) {
    console.error("Create project error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to create the project.",
    });
  }
}

export async function getProjects(
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
              managerId: request.user.userId,
            }
          : {
              members: {
                some: {
                  userId: request.user.userId,
                },
              },
            };

    const projects = await prisma.project.findMany({
      where,
      select: projectSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: {
        projects,
        count: projects.length,
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve projects.",
    });
  }
}

export async function getProjectById(
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
        message: "A valid project ID is required.",
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: {
        id,
      },
      select: projectSelect,
    });

    if (!project) {
      response.status(404).json({
        success: false,
        message: "Project not found.",
      });
      return;
    }

    const isAdmin = request.user.role === Role.ADMIN;
    const isManager = project.managerId === request.user.userId;
    const isMember = project.members.some(
      (membership) => membership.user.id === request.user?.userId,
    );

    if (!isAdmin && !isManager && !isMember) {
      response.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error("Get project error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve the project.",
    });
  }
}

export async function updateProject(
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
        message: "A valid project ID is required.",
      });
      return;
    }

    const validationResult = updateProjectSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid project information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    if (Object.keys(validationResult.data).length === 0) {
      response.status(400).json({
        success: false,
        message: "At least one field must be provided.",
      });
      return;
    }

    const existingProject = await prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!existingProject) {
      response.status(404).json({
        success: false,
        message: "Project not found.",
      });
      return;
    }

    const canManageProject =
      request.user.role === Role.ADMIN ||
      existingProject.managerId === request.user.userId;

    if (!canManageProject) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to update this project.",
      });
      return;
    }

    const {
      name,
      description,
      status,
      managerId,
      startDate,
      endDate,
    } = validationResult.data;

    const effectiveStartDate =
      startDate !== undefined
        ? new Date(startDate)
        : existingProject.startDate;

    const effectiveEndDate =
      endDate !== undefined
        ? new Date(endDate)
        : existingProject.endDate;

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      effectiveEndDate < effectiveStartDate
    ) {
      response.status(400).json({
        success: false,
        message: "End date cannot be earlier than start date.",
      });
      return;
    }

    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: {
          id: managerId,
        },
      });

      if (!manager) {
        response.status(404).json({
          success: false,
          message: "Project manager not found.",
        });
        return;
      }

      if (
        !manager.isActive ||
        (manager.role !== Role.PROJECT_MANAGER &&
          manager.role !== Role.ADMIN)
      ) {
        response.status(400).json({
          success: false,
          message:
            "The selected manager must be an active administrator or project manager.",
        });
        return;
      }
    }

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(managerId !== undefined && { managerId }),
        ...(startDate !== undefined && {
          startDate: new Date(startDate),
        }),
        ...(endDate !== undefined && {
          endDate: new Date(endDate),
        }),
      },
      select: projectSelect,
    });

    response.status(200).json({
      success: true,
      message: "Project updated successfully.",
      data: {
        project,
      },
    });
  } catch (error) {
    console.error("Update project error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to update the project.",
    });
  }
}