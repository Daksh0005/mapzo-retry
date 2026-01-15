const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function signupUser(email, password, displayName) {
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
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function loginUser(email, password) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 AND auth_provider = 'local'`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    throw new Error("Invalid credentials");
  }

  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { signupUser, loginUser };
