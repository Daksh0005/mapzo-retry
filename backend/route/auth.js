const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * POST /auth/google
 */
router.post("/google", async (req, res) => {
  const { token } = req.body; // Firebase ID token

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    const email = decoded.email;
    const name = decoded.name || email.split("@")[0];

    const result = await pool.query(
      `INSERT INTO users (email, display_name, auth_provider)
       VALUES ($1, $2, 'google')
       ON CONFLICT (email)
       DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [email, name]
    );

    const jwtToken = jwt.sign(
      { userId: result.rows[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: jwtToken });

  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

module.exports = router;
