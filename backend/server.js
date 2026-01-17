require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const googleAuth = require("./route/auth");
const jwtMiddleware = require("./auth/jwtMiddleware");
const pool = require("./db");

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseKey && !supabaseUrl.startsWith("TODO")) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("⚠️ Supabase credentials missing or invalid. Storage features will not work.");
}

// ---------- INIT APP ----------
const app = express();

// ---------- FIREBASE ----------
const serviceAccount =
  process.env.NODE_ENV === "production"
    ? require("/etc/secrets/serviceAccountKey.json")
    : require("./serviceAccountKey.json");

// Guard against double initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

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


// Test database connection


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
      user: "/api/user/me, /api/user/profile, /api/user/avatar, /api/user/location"
    }
  });
});

app.post("/api/events/upload-image", jwtMiddleware, async (req, res) => {
  const { imageBase64 } = req.body;
  const { id: userId } = req.user;

  if (!imageBase64) {
    return res.status(400).json({ error: "Image required" });
  }

  try {
    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const filePath = `event-images/${userId}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(filePath, buffer, {
        contentType: "image/jpeg"
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    res.json({ success: true, image_url: data.publicUrl });
  } catch (err) {
    console.error("Event image upload error:", err);
    res.status(500).json({ error: "Failed to upload event image" });
  }
});


// ---------- TOKEN VERIFICATION ENDPOINT ----------
app.get("/auth/verify", jwtMiddleware, (req, res) => {
  // jwtMiddleware must set: req.user = { id, email, provider }
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});
app.get("/api/user/me", jwtMiddleware, async (req, res) => {
  const { id } = req.user;

  try {
    const result = await pool.query(
      `SELECT id, email, display_name, photo_url, is_host
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});
app.put("/api/user/profile", jwtMiddleware, async (req, res) => {
  const { id } = req.user;
  const { display_name, bio, organization, phone, social_links } = req.body;

  if (display_name && display_name.length > 100) {
    return res.status(400).json({ error: "Display name too long" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           organization = COALESCE($3, organization),
           phone = COALESCE($4, phone),
           social_links = COALESCE($5, social_links),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, display_name, photo_url, bio, organization, phone, social_links`,
      [display_name || null, bio || null, organization || null, phone || null, social_links || null, id]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});


// ---------- PROTECTED ROUTES ----------

// Store user location
app.post("/api/user/location", jwtMiddleware, async (req, res) => {
  const { latitude, longitude } = req.body;
  const { id } = req.user; // use id (UUID) per updated schema

  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing location" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET latitude = $1,
           longitude = $2,
           location_updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, latitude, longitude`,
      [latitude, longitude, id]
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
app.post("/api/user/avatar", jwtMiddleware, async (req, res) => {
  const { imageBase64 } = req.body;
  const { id: userId } = req.user;

  if (!imageBase64) {
    return res.status(400).json({ error: "Image required" });
  }

  try {
    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const filePath = `avatars/${userId}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: true
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    await pool.query(
      `UPDATE users SET photo_url = $1 WHERE id = $2`,
      [data.publicUrl, userId]
    );

    res.json({ success: true, photo_url: data.publicUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

// Get events hosted by the current user
app.get("/api/user/events", jwtMiddleware, async (req, res) => {
  const { id } = req.user;

  try {
    const result = await pool.query(
      `SELECT id, title, event_date, category, image_url, views 
       FROM events 
       WHERE host_id = $1 
       ORDER BY event_date DESC`,
      [id]
    );

    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error("Get user events error:", err);
    res.status(500).json({ error: "Failed to fetch user events" });
  }
});


// Nearby events
app.get("/api/events/nearby", jwtMiddleware, async (req, res) => {
  const {
    latitude,
    longitude,
    radius = 50,
    category,
    dateFrom,
    dateTo,
    search // New parameter
  } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Missing location" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const rad = parseFloat(radius);

  if (![lat, lng, rad].every(Number.isFinite)) {
    return res.status(400).json({ error: "Invalid numeric parameters" });
  }

  try {
    const params = [];
    let idx = 1;

    // distance filter (mandatory)
    let where = [
      `(6371 * acos(
        cos(radians($${idx})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($${idx + 1})) +
        sin(radians($${idx})) * sin(radians(latitude))
      )) < $${idx + 2}`
    ];

    params.push(lat, lng, rad);
    idx += 3;

    // category filter
    if (category && category !== "all") {
      where.push(`category = $${idx}`);
      params.push(category);
      idx++;
    }

    // search filter (title, desc, or category)
    if (search) {
      where.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR category ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    // date filters
    if (dateFrom) {
      where.push(`event_date >= $${idx}`);
      params.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      where.push(`event_date <= $${idx}`);
      params.push(dateTo);
      idx++;
    }

    const query = `
      SELECT id, title, description, category, venue_name, address,
             latitude, longitude, event_date, created_at, image_url,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance
      FROM events
      WHERE ${where.join(" AND ")}
      ORDER BY distance
      LIMIT 50
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      events: result.rows
    });
  } catch (err) {
    console.error("Nearby events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});


// Get all events (public)
// Get all events (public)
app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, category, venue_name, address,
              latitude, longitude, event_date, created_at, image_url
       FROM events
       WHERE event_date >= CURRENT_DATE
       ORDER BY event_date ASC
       LIMIT 100`
    );

    res.json({
      success: true,
      events: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});


// Get single event
app.get("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const result = await pool.query(
      `SELECT e.*, 
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(r.id) as review_count
       FROM events e
       LEFT JOIN reviews r ON e.id = r.event_id
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Event not found" });

    // Convert string decimals to numbers
    const event = result.rows[0];
    event.avg_rating = parseFloat(parseFloat(event.avg_rating).toFixed(1));
    event.review_count = parseInt(event.review_count);

    res.json({ success: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Get reviews
app.get("/api/events/:eventId/reviews", async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, u.display_name as user_name 
             FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.event_id = $1 
             ORDER BY r.created_at DESC`,
      [eventId]
    );
    res.json({ success: true, reviews: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Create event (with image_url)
app.post("/api/events", jwtMiddleware, async (req, res) => {
  const {
    title,
    description,
    category,
    venue_name,
    address,
    latitude,
    longitude,
    event_date,
    image_url
  } = req.body;

  const { id: userId } = req.user;

  if (!title || !category || !latitude || !longitude || !event_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (
        title,
        description,
        category,
        venue_name,
        address,
        latitude,
        longitude,
        event_date,
        image_url,
        host_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [
        title,
        description || null,
        category,
        venue_name || null,
        address || null,
        latitude,
        longitude,
        event_date,
        image_url || null,
        userId
      ]
    );

    res.status(201).json({
      success: true,
      event_id: result.rows[0].id
    });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Submit review
app.post("/api/events/:eventId/reviews", jwtMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const { rating, comment } = req.body;
  const { id: userId } = req.user; // user's UUID

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating (1-5)" });
  }

  // Validate eventId is a UUID (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!eventId || !uuidRegex.test(eventId)) {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (event_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_id, user_id, rating, comment, created_at`,
      [eventId, userId, rating, comment]
    );

    res.json({ success: true, review: result.rows[0] });
  } catch (err) {
    console.error("Review submission error:", err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// ---------- TICKETS & JOINING ----------

// Get events user has joined
app.get("/api/user/tickets", jwtMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  try {
    const result = await pool.query(
      `SELECT e.*, t.status, t.created_at as joined_at
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    res.json({ success: true, tickets: result.rows });
  } catch (err) {
    console.error("Fetch tickets error:", err);
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

// Join an event
app.post("/api/events/:eventId/join", jwtMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const { id: userId } = req.user;

  try {
    const result = await pool.query(
      `INSERT INTO tickets (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING id, status, created_at`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "You have already joined this event" });
    }

    res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    console.error("Join event error:", err);
    res.status(500).json({ error: "Failed to join event" });
  }
});

// ---------- CHAT ----------

// Send chat message
app.post("/api/events/:eventId/chat", jwtMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const { text } = req.body;
  const { id: userId } = req.user;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (event_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING id, text, created_at`,
      [eventId, userId, text]
    );

    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get chat history
app.get("/api/events/:eventId/chat", jwtMiddleware, async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.*, u.display_name as user_name, u.photo_url
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.event_id = $1
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [eventId]
    );
    res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error("Fetch chat error:", err);
    res.status(500).json({ error: "Failed to load chat history" });
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
