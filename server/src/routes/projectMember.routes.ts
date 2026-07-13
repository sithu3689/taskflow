import { Router } from "express";

import {
  addMember,
  getMembers,
  removeMember,
} from "../controllers/projectMember.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Add member
router.post("/:id/members", addMember);

// View members
router.get("/:id/members", getMembers);

// Remove member
router.delete("/:id/members/:userId", removeMember);

export default router;