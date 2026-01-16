const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const pool = require("../db");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}



const { signupUser, loginUser } = require("../auth/localAuth");

const router = express.Router();


/* =========================
   LOCAL AUTH
========================= */

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

  if (!idToken) {
    return res.status(400).json({ error: "Missing Google ID token" });
  }

  try {
      const decoded = await admin.auth().verifyIdToken(idToken);

      const email = decoded.email;

    if (!email) {
      return res.status(400).json({ error: "Google account has no email" });
    }

    const displayName = decoded.name?.slice(0, 50) || email.split("@")[0];


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
  {
    sub: user.id,
    email: user.email,
    provider: "google",
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
    issuer: "your-app",
    audience: "frontend",
  }
);


    res.json({ token });

  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

module.exports = router;
