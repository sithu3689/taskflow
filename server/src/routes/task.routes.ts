import { Router } from "express";

import {
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateTask,
  updateTaskProgress,
} from "../controllers/task.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const taskRouter = Router();

// All task routes require authentication.
taskRouter.use(authenticate);

// Create a task.
taskRouter.post("/", createTask);

// List tasks visible to the logged-in user.
taskRouter.get("/", getTasks);

// View one task.
taskRouter.get("/:id", getTaskById);

// Update task details.
taskRouter.patch("/:id", updateTask);

// Update only task progress.
taskRouter.patch("/:id/progress", updateTaskProgress);

// Delete a task.
taskRouter.delete("/:id", deleteTask);

export default taskRouter;