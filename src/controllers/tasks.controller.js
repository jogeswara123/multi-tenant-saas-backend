import pool from "../config/db.js";

/**
 * 📃 LIST TASKS BY PROJECT
 * GET /api/projects/:projectId/tasks
 */
export const listTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tenantId = req.tenantId;

    const result = await pool.query(
      `
      SELECT
        id,
        project_id,
        tenant_id,
        title,
        description,
        status,
        priority,
        assigned_to,
        due_date,
        created_at,
        updated_at
      FROM tasks
      WHERE project_id = $1
        AND tenant_id = $2
      ORDER BY created_at DESC
      `,
      [projectId, tenantId]
    );

    res.json({
      success: true,
      data: {
        tasks: result.rows
      }
    });
  } catch (err) {
    console.error("List tasks error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * ➕ CREATE TASK
 * POST /api/projects/:projectId/tasks
 */
export const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tenantId = req.tenantId;
    const { userId } = req.user;

    const {
      title,
      description = null,
      priority = "medium",
      due_date = null,
      assigned_to = null
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required"
      });
    }

    // 🔒 Ensure project belongs to tenant
    const projectCheck = await pool.query(
      `
      SELECT id
      FROM projects
      WHERE id = $1 AND tenant_id = $2
      `,
      [projectId, tenantId]
    );

    if (projectCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO tasks (
        project_id,
        tenant_id,
        title,
        description,
        priority,
        assigned_to,
        due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        project_id,
        tenant_id,
        title,
        description,
        status,
        priority,
        assigned_to,
        due_date,
        created_at,
        updated_at
      `,
      [
        projectId,
        tenantId,
        title,
        description,
        priority,
        assigned_to,
        due_date
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * 🔁 UPDATE TASK STATUS
 * PATCH /api/tasks/:taskId/status
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const tenantId = req.tenantId;
    const { status } = req.body;

    const allowedStatuses = ["todo", "in_progress", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status"
      });
    }

    const result = await pool.query(
      `
      UPDATE tasks
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
        AND tenant_id = $3
      RETURNING
        id,
        status,
        updated_at
      `,
      [status, taskId, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
