require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function createChatSchema() {
    console.log("🔧 Creating event_messages table with IST timezone...");

    try {
        // Create event_messages table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS event_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL CHECK (char_length(message) <= 500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
      );
    `);

        console.log("✅ event_messages table created");

        // Create indexes for performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_messages_event_id 
      ON event_messages(event_id, created_at DESC);
    `);

        console.log("✅ Indexes created");

        // Test insert
        console.log("🧪 Testing IST timezone...");
        const testResult = await pool.query(`
      SELECT NOW() AT TIME ZONE 'Asia/Kolkata' as ist_time
    `);
        console.log("✅ Current IST time:", testResult.rows[0].ist_time);

        console.log("🎉 Chat schema migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

createChatSchema();
