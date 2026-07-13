import { Router } from "express";

import { getDashboard } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get("/", getDashboard);

export default dashboardRouter;