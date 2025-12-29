import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { tenantIsolation } from "../middleware/tenant.middleware.js";
import { createProject } from "../controllers/projects.controller.js";
import { listProjects } from "../controllers/projects.controller.js";
import { updateProject } from "../controllers/projects.controller.js";
import { deleteProject } from "../controllers/projects.controller.js";

const router = express.Router();

router.post(
  "/projects",
  authenticate,
  tenantIsolation,
  createProject
);
router.get(
  "/projects",
  authenticate,
  tenantIsolation,
  listProjects
);
router.put(
  "/projects/:projectId",
  authenticate,
  tenantIsolation,
  updateProject
);
router.delete(
  "/projects/:projectId",
  authenticate,
  tenantIsolation,
  deleteProject
);

export default router;
