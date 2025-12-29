import pool from "../config/db.js";
import { logAudit } from "../services/audit.service.js";

/**
 * 📦 Create Project
 * POST /api/projects
 */
export const createProject = async (req, res) => {
  try {
    const { name, description, status = "active" } = req.body;
    const { userId } = req.user;
    const tenantId = req.tenantId;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required"
      });
    }

    // 🔒 Enforce subscription limit
    const tenantRes = await pool.query(
      "SELECT max_projects FROM tenants WHERE id = $1",
      [tenantId]
    );

    const projectCountRes = await pool.query(
      "SELECT COUNT(*) FROM projects WHERE tenant_id = $1",
      [tenantId]
    );

    if (
      Number(projectCountRes.rows[0].count) >=
      tenantRes.rows[0].max_projects
    ) {
      return res.status(403).json({
        success: false,
        message: "Project limit reached for this subscription"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO projects (tenant_id, name, description, status, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, tenant_id, name, description, status, created_by, created_at
      `,
      [tenantId, name, description, status, userId]
    );

    // 🧾 Audit log
    await logAudit({
      tenantId,
      userId,
      action: "CREATE_PROJECT",
      entityType: "project",
      entityId: result.rows[0].id,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 📃 List Projects
 * GET /api/projects
 */
export const listProjects = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, search } = req.query;

    const filters = [`p.tenant_id = $1`];
    const values = [tenantId];
    let idx = 2;

    if (status) {
      filters.push(`p.status = $${idx++}`);
      values.push(status);
    }

    if (search) {
      filters.push(`LOWER(p.name) LIKE $${idx++}`);
      values.push(`%${search.toLowerCase()}%`);
    }

    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.created_at,
        u.full_name AS created_by_name,
        COUNT(t.id) AS task_count,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_task_count
      FROM projects p
      JOIN users u ON p.created_by = u.id
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE ${filters.join(" AND ")}
      GROUP BY p.id, u.full_name
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: { projects: result.rows }
    });

  } catch (err) {
    console.error("List projects error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✏️ Update Project
 * PUT /api/projects/:projectId
 */
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.user;
    const tenantId = req.tenantId;

    const projectRes = await pool.query(
      `SELECT id, created_by, tenant_id FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const project = projectRes.rows[0];

    if (project.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "Cross-tenant access forbidden" });
    }

    if (role !== "tenant_admin" && project.created_by !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to update project" });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (req.body.name) {
      updates.push(`name = $${idx++}`);
      values.push(req.body.name);
    }
    if (req.body.description) {
      updates.push(`description = $${idx++}`);
      values.push(req.body.description);
    }
    if (req.body.status) {
      updates.push(`status = $${idx++}`);
      values.push(req.body.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(projectId);

    const result = await pool.query(
      `
      UPDATE projects
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING id, name, description, status, updated_at
      `,
      values
    );

    // 🧾 Audit log
    await logAudit({
      tenantId,
      userId,
      action: "UPDATE_PROJECT",
      entityType: "project",
      entityId: projectId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: "Project updated successfully",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 🗑️ Delete Project
 * DELETE /api/projects/:projectId
 */
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.user;
    const tenantId = req.tenantId;

    const projectRes = await pool.query(
      `SELECT id, created_by, tenant_id FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const project = projectRes.rows[0];

    if (project.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "Cross-tenant access forbidden" });
    }

    if (role !== "tenant_admin" && project.created_by !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to delete project" });
    }

    // 🧾 Audit BEFORE delete
    await logAudit({
      tenantId,
      userId,
      action: "DELETE_PROJECT",
      entityType: "project",
      entityId: projectId,
      ipAddress: req.ip
    });

    await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);

    res.json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
