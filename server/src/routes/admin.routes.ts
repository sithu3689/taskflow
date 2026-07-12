import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const adminRouter = Router();

adminRouter.get(
  "/test",
  authenticate,
  authorize(Role.ADMIN),
  (request, response) => {
    response.status(200).json({
      success: true,
      message: "Admin-only route accessed successfully.",
      user: request.user,
    });
  },
);

export default adminRouter;