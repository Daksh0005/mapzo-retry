const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugEvent() {
    try {
        const res = await pool.query("SELECT * FROM events WHERE title ILIKE '%Mapzo Launch Party%'");
        console.log("Found Events:", res.rows.length);
        res.rows.forEach(e => {
            console.log("ID:", e.id);
            console.log("Title:", e.title);
            console.log("Start:", e.event_date);
            console.log("End:", e.end_time);
            console.log("Lat:", e.latitude, typeof e.latitude);
            console.log("Lng:", e.longitude, typeof e.longitude);
            console.log("Image:", e.image_url);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugEvent();
