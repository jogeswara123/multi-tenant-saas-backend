import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

console.log("🔥 AUTH CONTROLLER FILE LOADED 🔥");

export const login = async (req, res) => {
  const { email, password, tenantSubdomain } = req.body;

  console.log("🔥 LOGIN FUNCTION HIT 🔥");
  console.log("REQ BODY:", req.body);

  try {
    // =====================
    // VALIDATION
    // =====================
    if (!email || !password || !tenantSubdomain) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and tenantSubdomain are required"
      });
    }

    // =====================
    // TENANT USER LOGIN
    // =====================
    const query = `
      SELECT 
        u.id,
        u.email,
        u.password,
        u.role,
        u.tenant_id
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1
        AND LOWER(t.subdomain) = LOWER($2)
    `;

    const result = await pool.query(query, [
      email,
      tenantSubdomain.trim()
    ]);

    // ❌ USER NOT FOUND
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = result.rows[0];

    // ❌ PASSWORD CHECK
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // =====================
    // TOKEN GENERATION
    // =====================
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    });

    // ✅ SUCCESS
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
    console.error("LOGIN ERROR FULL 👉", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
