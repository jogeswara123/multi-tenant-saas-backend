import pool from "../config/db.js";

/**
 * 👤 Get Current Logged-in User
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const { userId, tenantId, role } = req.user;

    // 1️⃣ Fetch user
    const userResult = await pool.query(
      `
      SELECT id, email, full_name, role, is_active, tenant_id, created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    // 2️⃣ Fetch tenant (only if not super_admin)
    let tenant = null;

    if (role !== "super_admin") {
      const tenantResult = await pool.query(
        `
        SELECT 
          id,
          name,
          subdomain,
          status,
          subscription_plan,
          max_users,
          max_projects,
          created_at
        FROM tenants
        WHERE id = $1
        `,
        [tenantId]
      );

      if (tenantResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found"
        });
      }

      tenant = tenantResult.rows[0];
    }

    // 3️⃣ Response
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        tenant
      }
    });

  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
