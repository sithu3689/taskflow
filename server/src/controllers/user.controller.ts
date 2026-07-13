import bcrypt from "bcrypt";
import type { Request, Response } from "express";

import { prisma } from "../config/prisma.js";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../schemas/user.schema.js";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
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

export async function createUser(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const validationResult = createUserSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid user information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password, role } = validationResult.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      response.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: safeUserSelect,
    });

    response.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to create the user.",
    });
  }
}

export async function getUsers(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: safeUserSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve users.",
    });
  }
}

export async function getUserById(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: safeUserSelect,
    });

    if (!user) {
      response.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to retrieve the user.",
    });
  }
}

export async function updateUser(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });
      return;
    }

    const validationResult = updateUserSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid user information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      response.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const { email } = validationResult.data;

    if (email && email !== existingUser.email) {
      const emailOwner = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (emailOwner) {
        response.status(409).json({
          success: false,
          message: "Another user already uses this email.",
        });
        return;
      }
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: validationResult.data,
      select: safeUserSelect,
    });

    response.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to update the user.",
    });
  }
}

export async function updateUserStatus(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const id = getStringParam(request, "id");

    if (!id) {
      response.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });
      return;
    }

    const validationResult = updateUserStatusSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        success: false,
        message: "Invalid status information.",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    if (
      request.user?.userId === id &&
      validationResult.data.isActive === false
    ) {
      response.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      response.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: validationResult.data.isActive,
      },
      select: safeUserSelect,
    });

    response.status(200).json({
      success: true,
      message: user.isActive
        ? "User activated successfully."
        : "User deactivated successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    response.status(500).json({
      success: false,
      message: "Unable to update the user status.",
    });
  }
}