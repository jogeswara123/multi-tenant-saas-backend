/**
 * 🏢 Tenant Isolation Middleware
 * Ensures users can only access their own tenant's data
 */
export const tenantIsolation = (req, res, next) => {
  const { tenantId, role } = req.user;

  // ✅ Super admin can access all tenants
  if (role === "super_admin") {
    return next();
  }

  // ❌ Non-super-admin MUST have tenantId
  if (!tenantId) {
    return res.status(403).json({
      success: false,
      message: "Tenant context missing"
    });
  }

  // 🔒 Attach tenantId to request (trusted source)
  req.tenantId = tenantId;

  next();
};
