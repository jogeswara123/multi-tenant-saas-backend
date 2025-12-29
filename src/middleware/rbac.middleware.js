/**
 * 🧑‍⚖️ Role-Based Access Control (RBAC)
 * Usage: requireRole('tenant_admin')
 *        requireAnyRole(['tenant_admin', 'user'])
 */

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions"
      });
    }
    next();
  };
};

export const requireAnyRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions"
      });
    }
    next();
  };
};
