import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { tenantIsolation } from "../middleware/tenant.middleware.js";
import {
  createTask,
  listTasksByProject,
  updateTaskStatus
} from "../controllers/tasks.controller.js";

const router = express.Router();

/**
 * 📃 LIST TASKS BY PROJECT
 * GET /api/projects/:projectId/tasks
 */
// GET tasks by projectId (query param)
router.get("/tasks", authenticate, tenantIsolation, async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: "projectId is required"
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM tasks
      WHERE project_id = $1
      ORDER BY created_at DESC
      `,
      [projectId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("List tasks error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * ➕ CREATE TASK
 * POST /api/projects/:projectId/tasks
 */
router.post(
  "/projects/:projectId/tasks",
  authenticate,
  tenantIsolation,
  createTask
);

/**
 * 🔁 UPDATE TASK STATUS
 * PATCH /api/tasks/:taskId/status
 */
router.patch(
  "/tasks/:taskId/status",
  authenticate,
  tenantIsolation,
  updateTaskStatus
);

export default router;
