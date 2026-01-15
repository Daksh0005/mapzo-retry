const jwt = require("jsonwebtoken");

module.exports = function jwtMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
