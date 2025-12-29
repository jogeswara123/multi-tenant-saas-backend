import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

console.log("🔥 AUTH CONTROLLER FILE LOADED 🔥");


export const login = async (req, res) => {
  const { email, password, tenantSubdomain } = req.body;
  console.log("🔥 LOGIN FUNCTION HIT 🔥");
console.log("REQ BODY:", req.body);

  try {
    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // ================================
    // SUPER ADMIN LOGIN (NO TENANT)
    // ================================
    if (!tenantSubdomain) {
      const superAdminQuery = `
        SELECT id, email, password_hash, role
        FROM users
        WHERE email = $1
          AND role = 'super_admin'
      `;

      const { rows } = await pool.query(superAdminQuery, [email]);

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      const user = rows[0];

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      const token = generateToken({
        userId: user.id,
        tenantId: null,
        role: user.role
      });

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: null
          },
          token,
          expiresIn: 86400
        }
      });
    }

    // =================================
    // TENANT USER LOGIN (NORMAL USERS)
    // =================================
    const tenantQuery = `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.role,
        u.tenant_id,
        t.subdomain,
        t.status
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1
        AND LOWER(t.subdomain) = LOWER($2)
    `;

    const { rows } = await pool.query(tenantQuery, [
      email,
      tenantSubdomain.trim()
    ]);

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid tenant"
      });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tenant inactive"
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id
        },
        token,
        expiresIn: 86400
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR FULL 👉", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};
