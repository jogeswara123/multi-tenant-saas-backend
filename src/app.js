import "dotenv/config"; // ✅ MUST BE FIRST

import express from "express";
import cors from "cors";

import pool from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/users.routes.js";
import projectRoutes from "./routes/projects.routes.js";
import taskRoutes from "./routes/tasks.routes.js";
import auditRoutes from "./routes/audit.routes.js";

import { authenticate } from "./middleware/auth.middleware.js";
import { tenantIsolation } from "./middleware/tenant.middleware.js";
import { requireRole, requireAnyRole } from "./middleware/rbac.middleware.js";
import adminRoutes from "./routes/admin.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";


const app = express();

/**
 * 🔑 CORS CONFIG (FINAL & CORRECT)
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  "http://frontend:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // allow ANY local LAN IP
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://192.168.") ||
      origin.startsWith("http://10.") ||
      origin.startsWith("http://172.")
    ) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true
}));



/**
 * 🧩 BODY PARSER
 */
app.use(express.json());

/**
 * 🔍 HEALTH CHECK
 */
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    // DO NOT crash app
    res.json({ status: "ok", database: "disconnected" });
  }
});


/**
 * 🧪 TEST ROUTES
 */
app.get("/api/test/protected", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Protected route accessed",
    user: req.user
  });
});

app.get(
  "/api/test/tenant",
  authenticate,
  tenantIsolation,
  (req, res) => {
    res.json({
      success: true,
      tenantIdFromJWT: req.user.tenantId,
      tenantIdInjected: req.tenantId || "super_admin_access"
    });
  }
);

app.get(
  "/api/test/admin-only",
  authenticate,
  tenantIsolation,
  requireRole("tenant_admin"),
  (req, res) => {
    res.json({ success: true, message: "Tenant admin access granted" });
  }
);

app.get(
  "/api/test/user-or-admin",
  authenticate,
  tenantIsolation,
  requireAnyRole(["tenant_admin", "user"]),
  (req, res) => {
    res.json({ success: true, message: "User/Admin access granted" });
  }
);

app.get(
  "/api/test/super-admin",
  authenticate,
  requireRole("super_admin"),
  (req, res) => {
    res.json({ success: true, message: "Super admin access granted" });
  }
);

/**
 * 🔐 API ROUTES
 */
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", projectRoutes);
app.use("/api", taskRoutes);
app.use("/api", auditRoutes);
app.use("/api", adminRoutes);
app.use("/api", dashboardRoutes);

/**
 * 🚀 START SERVER
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});
