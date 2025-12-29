import pool from "../config/db.js";

/**
 * 📜 List Audit Logs
 * GET /api/audit-logs
 */
export const listAuditLogs = async (req, res) => {
  try {
    const { role } = req.user;
    const tenantId = req.tenantId;
    const { action, entityType } = req.query;

    const filters = [];
    const values = [];
    let idx = 1;

    if (role !== "super_admin") {
      filters.push(`tenant_id = $${idx++}`);
      values.push(tenantId);
    }

    if (action) {
      filters.push(`action = $${idx++}`);
      values.push(action);
    }

    if (entityType) {
      filters.push(`entity_type = $${idx++}`);
      values.push(entityType);
    }

    const whereClause = filters.length
      ? `WHERE ${filters.join(" AND ")}`
      : "";

    const result = await pool.query(
      `
      SELECT
        id,
        tenant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        ip_address,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
      `,
      values
    );

    res.json({
      success: true,
      data: { logs: result.rows }
    });

  } catch (err) {
    console.error("List audit logs error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
