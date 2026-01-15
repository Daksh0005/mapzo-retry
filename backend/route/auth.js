const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const { Pool } = require("pg");

const router = express.Router();

// DB pool (same DATABASE_URL as server.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// POST /auth/google
router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Missing Google ID token" });
  }

  try {
    // 1️⃣ Verify Google ID token
    const decoded = await admin.auth().verifyIdToken(idToken);

    const email = decoded.email;
    const displayName = decoded.name || email.split("@")[0];

    if (!email) {
      return res.status(400).json({ error: "Google account has no email" });
    }

    // 2️⃣ Insert or fetch user
    const result = await pool.query(
      `
      INSERT INTO users (email, display_name, auth_provider, is_verified)
      VALUES ($1, $2, 'google', true)
      ON CONFLICT (email)
      DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id, email
      `,
      [email, displayName]
    );

    const user = result.rows[0];

    // 3️⃣ Issue JWT (same format as local auth)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

module.exports = router;
