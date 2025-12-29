import pool from "../config/db.js";

/**
 * 🧾 Create Audit Log
 */
export const logAudit = async ({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  ipAddress
}) => {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
      (tenant_id, user_id, action, entity_type, entity_id, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [tenantId, userId, action, entityType, entityId, ipAddress || null]
    );
  } catch (err) {
    // ❗ Never crash main flow due to audit failure
    console.error("Audit log error:", err.message);
  }
};
