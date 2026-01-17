const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const pool = require("../db");

const { signupUser, loginUser } = require("../auth/localAuth");

const router = express.Router();


/* =========================
   LOCAL AUTH
========================= */
const ADMIN_EMAILS = [
  "shreyashmishra506@gmail.com",
  "realdaksharora@gmail.com",
  "iitianshreyash25@gmail.com",
  "aadityasingh1439@gmail.com",
  "913kaushiknarayankv42020@gmail.com"
];

router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const token = await signupUser(email, password, displayName);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
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

  if (!idToken) return res.status(400).json({ error: "Missing Google ID token" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    const displayName = decoded.name || email.split("@")[0];
    const photoUrl = decoded.picture;

    // Check if user is admin/host
    const isHost = ADMIN_EMAILS.includes(email);

    // Upsert user to Supabase
    // Note: 'auth_provider' column might not exist in your new schema, check db.sql. 
    // db.sql uses: id, email, display_name, photo_url, is_host
    // We map Firebase UID to Supabase ID? No, Supabase ID is UUID default.
    // Ideally we should use Firebase UID as ID if we want consistency, 
    // but your schema has 'id UUID DEFAULT uuid_generate_v4()'.
    // We'll trust email as unique identifier for this migration.

    // However, for strict foreign key constraints, using uuid for ID is good.
    // If we want to link Firebase Auth, we usually store firebase_uid in users table.
    // Assuming we just sync by email for now.

    const result = await pool.query(
      `INSERT INTO users (email, display_name, photo_url, is_host)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET 
         display_name = EXCLUDED.display_name,
         photo_url = EXCLUDED.photo_url,
         is_host = CASE WHEN users.is_host THEN true ELSE EXCLUDED.is_host END
       RETURNING id, email, is_host`,
      [email, displayName, photoUrl, isHost]
    );

    const user = result.rows[0];

    // Create a backend JWT for our API
    const token = jwt.sign(
      {
        id: user.id, // Supabase UUID
        email: user.email,
        provider: "google"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });

  } catch (err) {
    console.error("Auth Sync Error:", err);
    res.status(401).json({ error: "Auth failed" });
  }
});

module.exports = router;
