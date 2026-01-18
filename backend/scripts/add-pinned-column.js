require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');

async function migratePinnedColumn() {
    console.log("⏳ Adding 'is_pinned' column to events table...");

    try {
        await pool.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE
        `);

        // Add index for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_events_pinned 
            ON events(is_pinned) WHERE is_pinned = TRUE
        `);

        console.log("✅ 'is_pinned' column added successfully.");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        process.exit();
    }
}

migratePinnedColumn();
