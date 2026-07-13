import type { Request, Response } from "express";
import { Role } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";

export async function addMember(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const projectId = request.params.id as string;
    const { userId } = request.body;

    if (!userId) {
      response.status(400).json({
        success: false,
        message: "User ID is required.",
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      response.status(404).json({
        success: false,
        message: "Project not found.",
      });
      return;
    }

    const canManage =
      request.user.role === Role.ADMIN ||
      project.managerId === request.user.userId;

    if (!canManage) {
      response.status(403).json({
        success: false,
        message: "You do not have permission.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      response.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const existing = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (existing) {
      response.status(409).json({
        success: false,
        message: "User is already a member.",
      });
      return;
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
      },
    });

    response.status(201).json({
      success: true,
      message: "Member added successfully.",
      data: member,
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}
export async function getMembers(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const projectId = request.params.id as string;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
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
      },
    });

    if (!project) {
      response.status(404).json({
        success: false,
        message: "Project not found.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      count: project.members.length,
      data: project.members,
    });

  } catch (error) {
    console.error(error);

    response.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}
export async function removeMember(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const projectId = request.params.id as string;
    const userId = request.params.userId as string;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      response.status(404).json({
        success: false,
        message: "Project not found.",
      });
      return;
    }

    const canManage =
      request.user.role === Role.ADMIN ||
      project.managerId === request.user.userId;

    if (!canManage) {
      response.status(403).json({
        success: false,
        message: "You do not have permission.",
      });
      return;
    }

    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!member) {
      response.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    await prisma.projectMember.delete({
      where: {
        id: member.id,
      },
    });

    response.status(200).json({
      success: true,
      message: "Member removed successfully.",
    });

  } catch (error) {
    console.error(error);

    response.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}