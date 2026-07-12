import type { NextFunction, Request, Response } from "express";
import type { Role } from "../../generated/prisma/client.js";

export function authorize(...allowedRoles: Role[]) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
      return;
    }

    next();
  };
}