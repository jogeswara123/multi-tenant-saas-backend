import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { tenantIsolation } from "../middleware/tenant.middleware.js";
import { requireAnyRole } from "../middleware/rbac.middleware.js";
import { listAuditLogs } from "../controllers/audit.controller.js";

const router = express.Router();

router.get(
  "/audit-logs",
  authenticate,
  tenantIsolation,
  requireAnyRole(["tenant_admin", "super_admin"]),
  listAuditLogs
);

export default router;
