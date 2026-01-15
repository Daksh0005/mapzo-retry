require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const admin = require("firebase-admin");

const localAuth = require("./auth/localAuth");
const googleAuth = require("./route/auth");
const jwtMiddleware = require("./auth/jwtMiddleware");

// ---------- INIT APP ----------
const app = express();
app.use("/auth", googleAuth);

// ---------- CORS ----------
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://www.mapzo.in",
    "https://mapzo.in",
    "https://*.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());

// ---------- FIREBASE (ONLY FOR GOOGLE AUTH) ----------
const serviceAccount =
  process.env.NODE_ENV === "production"
    ? require("/etc/secrets/serviceAccountKey.json")
    : require("./serviceAccountKey.json"); //CHANGE THE SERVICEACCOUNTKEY 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ---------- DATABASE ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ---------- AUTH ROUTES ----------
app.use("/auth", localAuth);   // /auth/signup , /auth/login
app.use("/auth", googleAuth);  // /auth/google

// ---------- HEALTH ----------
app.get("/", (req, res) => {
  res.json({ status: "Backend running", timestamp: new Date() });
});

// ---------- PROTECTED ROUTES ----------

// Store user location
app.post("/api/user/location", jwtMiddleware, async (req, res) => {
  const { latitude, longitude } = req.body;
  const { email } = req.user;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing location" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET latitude = $1,
           longitude = $2,
           location_updated_at = CURRENT_TIMESTAMP
       WHERE email = $3
       RETURNING *`,
      [latitude, longitude, email]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save location" });
  }
});

// Nearby events
app.get("/api/events/nearby", jwtMiddleware, async (req, res) => {
  const { latitude, longitude, radius = 50 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Missing location" });
  }

  try {
    const query = `
      SELECT *,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance
      FROM events
      WHERE (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) < $3
      ORDER BY distance
      LIMIT 50
    `;

    const result = await pool.query(query, [
      latitude,
      longitude,
      radius
    ]);

    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get all events (public)
app.get("/api/events", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM events ORDER BY event_date ASC"
  );
  res.json({ success: true, events: result.rows });
});

// Submit review
app.post("/api/events/:eventId/reviews", jwtMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const { rating, comment } = req.body;
  const { email } = req.user;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (event_id, user_email, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventId, email, rating, comment]
    );

    res.json({ success: true, review: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
