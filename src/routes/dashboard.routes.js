import express from "express";
import pool from "../config/db.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { tenantIsolation } from "../middleware/tenant.middleware.js";

const router = express.Router();

router.get(
  "/dashboard/stats",
  authenticate,
  tenantIsolation,
  async (req, res) => {
    const tenantId = req.tenantId;

    const projects = await pool.query(
      "SELECT COUNT(*) FROM projects WHERE tenant_id = $1",
      [tenantId]
    );

    const tasks = await pool.query(
      "SELECT COUNT(*) FROM tasks WHERE tenant_id = $1",
      [tenantId]
    );

    const users = await pool.query(
      "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        projects: Number(projects.rows[0].count),
        tasks: Number(tasks.rows[0].count),
        users: Number(users.rows[0].count),
      },
    });
  }
);

export default router;
