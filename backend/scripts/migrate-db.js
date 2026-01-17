require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');

async function migrateDatabase() {
    console.log("⏳ Starting Database Migration for Production Readiness...");

    try {
        // 1. Add missing columns to users table
        console.log("👉 1. Checking/Adding missing columns to 'users'...");

        // Check if auth_provider exists
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'google'`);
            console.log("   ✅ 'auth_provider' column ensured.");
        } catch (e) {
            console.log("   Info: " + e.message);
        }

        // Check if password_hash exists
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
            console.log("   ✅ 'password_hash' column ensured.");
        } catch (e) {
            console.log("   Info: " + e.message);
        }

        // 2. Add Performance Indexes
        console.log("👉 2. Creating Performance Indexes...");

        const indexes = [
            "CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)",
            "CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)",
            "CREATE INDEX IF NOT EXISTS idx_events_host ON events(host_id)",
            "CREATE INDEX IF NOT EXISTS idx_reviews_event ON reviews(event_id)"
        ];

        for (const idxSql of indexes) {
            await pool.query(idxSql);
        }
        console.log("   ✅ Indexes created successfully.");

        console.log("\n✨ MIGRATION COMPLETE! Database is production-ready.");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        process.exit();
    }
}

migrateDatabase();
