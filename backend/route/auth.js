// DEV: log incoming body for debug
console.log('/auth/google called - body:', req.body);

const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const { Pool } = require("pg");

const { signupUser, loginUser } = require("../auth/localAuth");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

/* =========================
   LOCAL AUTH
========================= */

router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const token = await signupUser(email, password, displayName);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/* =========================
   GOOGLE AUTH
========================= */

router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Missing Google ID token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const email = decoded.email;
    const displayName = decoded.name || email.split("@")[0];

    if (!email) {
      return res.status(400).json({ error: "Google account has no email" });
    }

    const result = await pool.query(
      `
      INSERT INTO users (email, display_name, auth_provider)
      VALUES ($1, $2, 'google')
      ON CONFLICT (email)
      DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id, email
      `,
      [email, displayName]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email },
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
