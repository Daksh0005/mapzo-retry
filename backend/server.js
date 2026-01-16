require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const admin = require("firebase-admin");

const googleAuth = require("./route/auth");
const jwtMiddleware = require("./auth/jwtMiddleware");

// ---------- INIT APP ----------
const app = express();

// ---------- FIREBASE ----------
const serviceAccount =
  process.env.NODE_ENV === "production"
    ? require("/etc/secrets/serviceAccountKey.json")
    : require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ---------- CORS - FIXED ----------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5500",
  "https://www.mapzo.in",
  "https://mapzo.in",
  "https://mapzo-frontend.vercel.app" // Add your Vercel URL
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return cb(null, true);
    
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      cb(null, true);
    } else {
      console.log("🚫 CORS blocked:", origin);
      cb(new Error("CORS blocked"));
    }
  },
  credentials: true
}));

app.use(express.json());

// ---------- DATABASE ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// ---------- AUTH ROUTES ----------
app.use("/auth", googleAuth);

// ---------- HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.json({ 
    status: "Backend running", 
    timestamp: new Date(),
    endpoints: {
      auth: "/auth/login, /auth/signup, /auth/google",
      events: "/api/events, /api/events/nearby",
      user: "/api/user/location"
    }
  });
});

// ---------- TOKEN VERIFICATION ENDPOINT ----------
app.get("/auth/verify", jwtMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    user: {
      email: req.user.email,
      userId: req.user.userId,
      displayName: req.user.displayName || req.user.email.split('@')[0]
    }
  });
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
       RETURNING id, email, latitude, longitude`,
      [latitude, longitude, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Location update error:", err);
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
      SELECT id, title, description, category, location, 
             latitude, longitude, event_date, created_at,
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
      AND event_date >= CURRENT_DATE
      ORDER BY distance
      LIMIT 50
    `;

    const result = await pool.query(query, [
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    ]);

    res.json({ success: true, events: result.rows, count: result.rows.length });
  } catch (err) {
    console.error("Nearby events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get all events (public)
app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, category, location,
              latitude, longitude, event_date, created_at
       FROM events 
       WHERE event_date >= CURRENT_DATE
       ORDER BY event_date ASC 
       LIMIT 100`
    );
    
    res.json({ success: true, events: result.rows, count: result.rows.length });
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Submit review
app.post("/api/events/:eventId/reviews", jwtMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const { rating, comment } = req.body;
  const { email } = req.user;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating (1-5)" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (event_id, user_email, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_id, user_email, rating, comment, created_at`,
      [eventId, email, rating, comment || null]
    );

    res.json({ success: true, review: result.rows[0] });
  } catch (err) {
    console.error("Review submission error:", err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});