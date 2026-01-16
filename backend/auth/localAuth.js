const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// db.js
const pool = require("../db");



async function signupUser(email, password, displayName) {
  if (!email || !password) {
  throw new Error("Email and password required");
}

if (password.length < 8) {
  throw new Error("Password must be at least 8 characters");
}

  const hash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `
    INSERT INTO users (email, password_hash, auth_provider, display_name)
    VALUES ($1, $2, 'local', $3)
    ON CONFLICT (email)
    DO NOTHING
    RETURNING id, email

    `,
    [email, hash, displayName]
  );
if (result.rows.length === 0) {
  throw new Error("Email already registered");
}


  const user = result.rows[0];

  return jwt.sign(
  {
    sub: user.id,
    email: user.email,
    provider: "local",
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
    issuer: "your-app",
    audience: "frontend",
  }
);

}

async function loginUser(email, password) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 AND auth_provider = 'local'`,
    [email]
  );
  const DUMMY_HASH =
  "$2b$12$C1K9yE8uYpJkR8O2P9QZ1eY5z6XzqvFvJcN6J4Xj5WZKpZ0y7qM6S";


  const user = result.rows[0];
const hash = user ? user.password_hash : DUMMY_HASH;

const match = await bcrypt.compare(password, hash);

if (!user || !match) {
  throw new Error("Invalid credentials");
}


  return jwt.sign(
  {
    sub: user.id,
    email: user.email,
    provider: "local",
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
    issuer: "your-app",
    audience: "frontend",
  }
);

}

module.exports = { signupUser, loginUser };
