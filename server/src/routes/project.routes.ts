import { Router } from "express";

import {
  createProject,
  getProjectById,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const projectRouter = Router();

/*
  Every project route requires a valid JWT.
*/
projectRouter.use(authenticate);

/*
  Create a project.

  The controller should enforce which roles may create projects.
*/
projectRouter.post("/", createProject);

/*
  List projects visible to the current user.

  Admin:
  - all projects

  Project Manager:
  - projects they manage

  Team Member:
  - projects they belong to
*/
projectRouter.get("/", getProjects);

/*
  View one accessible project.
*/
projectRouter.get("/:id", getProjectById);

/*
  Update a project.

  The controller allows:
  - administrators
  - the assigned project manager
*/
projectRouter.patch("/:id", updateProject);

export default projectRouter;