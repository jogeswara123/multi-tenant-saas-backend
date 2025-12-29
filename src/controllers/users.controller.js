import bcrypt from "bcrypt";
import pool from "../config/db.js";

/**
 * 👥 Add User to Tenant
 * POST /api/tenants/:tenantId/users
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, fullName, role = "user" } = req.body;
    const tenantId = req.tenantId;

    // 1️⃣ Validate
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // 2️⃣ Check subscription limit
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
      [tenantId]
    );

    const tenantResult = await pool.query(
      "SELECT max_users FROM tenants WHERE id = $1",
      [tenantId]
    );

    const userCount = Number(countResult.rows[0].count);
    const maxUsers = tenantResult.rows[0].max_users;

    if (userCount >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: "User limit reached for your subscription plan"
      });
    }

    // 3️⃣ Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4️⃣ Insert user
    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, full_name, role, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role, is_active, created_at
      `,
      [email, passwordHash, fullName, role, tenantId]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email already exists in this tenant"
      });
    }

    console.error("Create user error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
/**
 * 👥 List Users in Tenant
 * GET /api/tenants/:tenantId/users
 */
export const listUsers = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      search = "",
      role,
      page = 1,
      limit = 50
    } = req.query;

    const safeLimit = Math.min(Number(limit), 100);
    const offset = (Number(page) - 1) * safeLimit;

    const filters = [];
    const values = [tenantId];
    let idx = 2;

    if (search) {
      filters.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (role) {
      filters.push(`role = $${idx}`);
      values.push(role);
      idx++;
    }

    const whereClause = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const usersQuery = `
      SELECT id, email, full_name, role, is_active, created_at
      FROM users
      WHERE tenant_id = $1
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE tenant_id = $1
      ${whereClause}
    `;

    const usersResult = await pool.query(usersQuery, [...values, safeLimit, offset]);
    const countResult = await pool.query(countQuery, values);

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / safeLimit),
          total,
          limit: safeLimit
        }
      }
    });
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
/**
 * ✏️ Update User
 * PUT /api/users/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const { userId, role } = req.user;
    const tenantId = req.tenantId;

    // Fetch target user
    const targetRes = await pool.query(
      `
      SELECT id, role, tenant_id
      FROM users
      WHERE id = $1
      `,
      [targetUserId]
    );

    if (targetRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const targetUser = targetRes.rows[0];

    // Tenant check (extra safety)
    if (targetUser.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Cross-tenant update forbidden"
      });
    }

    // Permissions
    const isSelf = userId === targetUserId;

    if (role === "user" && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile"
      });
    }

    // Build allowed updates
    const updates = [];
    const values = [];
    let idx = 1;

    if (req.body.fullName) {
      updates.push(`full_name = $${idx}`);
      values.push(req.body.fullName);
      idx++;
    }

    if (role === "tenant_admin") {
      if (req.body.role) {
        updates.push(`role = $${idx}`);
        values.push(req.body.role);
        idx++;
      }
      if (typeof req.body.isActive === "boolean") {
        updates.push(`is_active = $${idx}`);
        values.push(req.body.isActive);
        idx++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update"
      });
    }

    values.push(targetUserId);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${idx}
      RETURNING id, email, full_name, role, is_active, created_at
    `;

    const result = await pool.query(updateQuery, values);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
