const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function backfill() {
    try {
        console.log("Backfilling end_time for legacy events...");

        // Update all events where end_time is NULL
        // Set end_time = event_date + 4 hours
        const result = await pool.query(`
            UPDATE events 
            SET end_time = event_date + INTERVAL '4 hours'
            WHERE end_time IS NULL
        `);

        console.log(`✅ Backfilled ${result.rowCount} events.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Backfill failed:", err);
        process.exit(1);
    }
}

backfill();
