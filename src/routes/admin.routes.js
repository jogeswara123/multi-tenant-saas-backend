import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import pool from "../config/db.js";

const router = express.Router();

/**
 * 🔐 SUPER ADMIN STATS
 * GET /api/admin/stats
 */
router.get(
  "/admin/stats",
  authenticate,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const totalTenants = await pool.query("SELECT COUNT(*) FROM tenants");
      const activeTenants = await pool.query(
        "SELECT COUNT(*) FROM tenants WHERE status = 'active'"
      );
      const suspendedTenants = await pool.query(
        "SELECT COUNT(*) FROM tenants WHERE status = 'suspended'"
      );
      const totalUsers = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role != 'super_admin'"
      );

      res.json({
        success: true,
        data: {
          totalTenants: Number(totalTenants.rows[0].count),
          activeTenants: Number(activeTenants.rows[0].count),
          suspendedTenants: Number(suspendedTenants.rows[0].count),
          totalUsers: Number(totalUsers.rows[0].count)
        }
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
/**
 * 🏢 LIST ALL TENANTS
 * GET /api/admin/tenants
 */
router.get(
  "/admin/tenants",
  authenticate,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          t.id,
          t.name,
          t.subdomain,
          t.status,
          t.subscription_plan,
          t.max_users,
          t.max_projects,
          COUNT(u.id) AS total_users
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (err) {
      console.error("List tenants error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
/**
 * ✏️ UPDATE TENANT
 * PATCH /api/admin/tenants/:tenantId
 */
router.patch(
  "/admin/tenants/:tenantId",
  authenticate,
  requireRole("super_admin"),
  async (req, res) => {
    const { tenantId } = req.params;
    const { status, subscriptionPlan, maxUsers, maxProjects } = req.body;

    try {
      const updates = [];
      const values = [];
      let i = 1;

      if (status) {
        updates.push(`status = $${i++}`);
        values.push(status);
      }
      if (subscriptionPlan) {
        updates.push(`subscription_plan = $${i++}`);
        values.push(subscriptionPlan);
      }
      if (maxUsers) {
        updates.push(`max_users = $${i++}`);
        values.push(maxUsers);
      }
      if (maxProjects) {
        updates.push(`max_projects = $${i++}`);
        values.push(maxProjects);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update"
        });
      }

      values.push(tenantId);

      const result = await pool.query(
        `
        UPDATE tenants
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${i}
        RETURNING *
        `,
        values
      );

      res.json({
        success: true,
        message: "Tenant updated successfully",
        data: result.rows[0]
      });
    } catch (err) {
      console.error("Update tenant error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);


export default router;
