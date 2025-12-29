import express from "express";
import { createUser, listUsers } from "../controllers/users.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { tenantIsolation } from "../middleware/tenant.middleware.js";
import { requireAnyRole, requireRole } from "../middleware/rbac.middleware.js";
import { updateUser } from "../controllers/users.controller.js";

const router = express.Router();

// List users (tenant_admin + user)
router.get(
  "/tenants/:tenantId/users",
  authenticate,
  tenantIsolation,
  requireAnyRole(["tenant_admin", "user"]),
  listUsers
);

// Create user (tenant_admin only)
router.post(
  "/tenants/:tenantId/users",
  authenticate,
  tenantIsolation,
  requireRole("tenant_admin"),
  createUser
);
router.put(
  "/users/:userId",
  authenticate,
  tenantIsolation,
  requireAnyRole(["tenant_admin", "user"]),
  updateUser
);

export default router;
