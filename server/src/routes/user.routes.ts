import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  updateUserStatus,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const userRouter = Router();

userRouter.use(authenticate);
userRouter.use(authorize(Role.ADMIN));

userRouter.post("/", createUser);
userRouter.get("/", getUsers);
userRouter.get("/:id", getUserById);
userRouter.patch("/:id", updateUser);
userRouter.patch("/:id/status", updateUserStatus);

export default userRouter;