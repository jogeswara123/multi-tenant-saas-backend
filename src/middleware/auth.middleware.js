import jwt from "jsonwebtoken";

/**
 * 🔐 JWT Authentication Middleware
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("AUTH HEADER 👉", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing"
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("JWT TOKEN 👉", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED JWT 👉", decoded);

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    next();
  } catch (err) {
    console.error("JWT ERROR 👉", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

