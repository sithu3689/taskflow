import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../../generated/prisma/client.js";

interface AccessTokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader) {
    response.status(401).json({
      success: false,
      message: "Authorization header is required.",
    });
    return;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    response.status(401).json({
      success: false,
      message: "Authorization header must use the Bearer token format.",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    response.status(500).json({
      success: false,
      message: "JWT configuration is missing.",
    });
    return;
  }

  try {
    const decodedToken = jwt.verify(
      token,
      secret,
    ) as AccessTokenPayload;

    request.user = {
      userId: decodedToken.userId,
      email: decodedToken.email,
      role: decodedToken.role,
    };

    next();
  } catch {
    response.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
}