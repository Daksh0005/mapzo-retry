const jwt = require("jsonwebtoken");

module.exports = function jwtMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "your-app",
      audience: "frontend",
    });

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      provider: decoded.provider,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("JWT verification error:", err);
    }

    return res.status(401).json({ error: "Invalid token" });
  }
};
