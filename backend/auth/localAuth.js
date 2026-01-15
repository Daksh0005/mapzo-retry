const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4   // 👈 FORCE IPv4
});


/**
 * POST /auth/signup
 */
router.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_provider, display_name)
       VALUES ($1, $2, 'local', $3)
       RETURNING id, email`,
      [email, passwordHash, displayName || null]
    );

    const token = jwt.sign(
      { userId: result.rows[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token });

  } catch (err) {
  console.error("SIGNUP ERROR:", err);
  res.status(500).json({ error: err.message });
}
});

/**
 * POST /auth/login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  const user = result.rows[0];

  if (!user || user.auth_provider !== "local") {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

module.exports = router;
