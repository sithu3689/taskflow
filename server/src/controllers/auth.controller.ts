import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { loginSchema } from "../schemas/auth.schema.js";
import { generateAccessToken } from "../utils/jwt.js";

export async function login(
  request: Request,
  response: Response,
): Promise<void> {
    try{
  const validationResult = loginSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      success: false,
      message: "Invalid login information.",
      errors: validationResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = validationResult.data;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    response.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
    return;
  }

  if (!user.isActive) {
    response.status(403).json({
      success: false,
      message: "Your account has been deactivated.",
    });
    return;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    response.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
    return;
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  response.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    },
  });
} catch (error) {
  console.error("Login error:", error);

  response.status(500).json({
    success: false,
    message: "Unable to complete login.",
  });
}
}