require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware: Verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Backend running', timestamp: new Date() });
});

// POST /api/user/location - Store user location when button clicked
app.post('/api/user/location', verifyToken, async (req, res) => {
  const { latitude, longitude } = req.body;
  const email = req.user.email;
  const displayName = req.user.name || email.split('@')[0];

  if (!email || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing email or location' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (email, display_name, latitude, longitude, location_updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (email)
       DO UPDATE SET 
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         location_updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [email, displayName, latitude, longitude]
    );
    
    res.json({ 
      success: true, 
      user: result.rows[0],
      message: 'Location saved successfully'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// GET /api/events/nearby - Fetch nearby events
app.get('/api/events/nearby', verifyToken, async (req, res) => {
  const { latitude, longitude, radius = 50 } = req.query;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing location parameters' });
  }

  try {
    // Haversine formula to calculate distance in km
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
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    ]);
    
    res.json({
      success: true,
      count: result.rows.length,
      events: result.rows
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:eventId/reviews - Get all reviews for an event
app.get('/api/events/:eventId/reviews', async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*, u.display_name 
       FROM reviews r
       LEFT JOIN users u ON r.user_email = u.email
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      reviews: result.rows
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/events/:eventId/reviews - Submit a review
app.post('/api/events/:eventId/reviews', verifyToken, async (req, res) => {
  const { eventId } = req.params;
  const { rating, comment } = req.body;
  const userEmail = req.user.email;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // First, ensure user exists in users table
    await pool.query(
      `INSERT INTO users (email, display_name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [userEmail, req.user.name || userEmail.split('@')[0]]
    );

    // Insert review
    const result = await pool.query(
      `INSERT INTO reviews (event_id, user_email, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventId, userEmail, rating, comment]
    );
    
    res.json({
      success: true,
      review: result.rows[0],
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/events - Get all events (for initial page load)
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events ORDER BY event_date ASC'
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      events: result.rows
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});