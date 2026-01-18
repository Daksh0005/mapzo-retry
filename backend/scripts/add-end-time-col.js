const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Creating end_time column in events table...");

        await pool.query(`
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
        `);

        console.log("✅ end_time column added successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
