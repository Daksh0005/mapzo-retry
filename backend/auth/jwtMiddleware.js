const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const pool = require("../db");

module.exports = async function jwtMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7).trim();

  // 1. Try verifying as our Backend JWT
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

    return next();
  } catch (err) {
    // If it's not our JWT, try verifying as Firebase Token
    try {
      const decodedFirebase = await admin.auth().verifyIdToken(token);

      // We need the Supabase UUID for the user. 
      // Look it up by email.
      const result = await pool.query(
        "SELECT id, is_host FROM users WHERE email = $1",
        [decodedFirebase.email]
      );

      if (result.rows.length === 0) {
        // User not in DB yet - this shouldn't happen if sync works, 
        // but let's be safe.
        return res.status(404).json({ error: "User not synced to backend" });
      }

      req.user = {
        id: result.rows[0].id, // Supabase UUID
        email: decodedFirebase.email,
        provider: "google",
      };

      return next();
    } catch (firebaseErr) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Auth verification failed:", firebaseErr.message);
      }
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }
};
