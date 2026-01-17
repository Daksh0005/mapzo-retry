require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');

async function verifySchemaFlow() {
    console.log("⏳ Starting Schema Flow Verification...");

    const testEmail = "test-user-" + Date.now() + "@example.com";

    try {
        // 1. Verify User Sync (UPSERT)
        console.log(`👉 1. Simulating User Sync for: ${testEmail}`);
        const userResult = await pool.query(
            `INSERT INTO users (email, display_name, photo_url, is_host)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id, email, is_host`,
            [testEmail, "Schema Tester", "https://example.com/photo.jpg", true]
        );

        const user = userResult.rows[0];
        console.log("✅ User Synced successfully:", user);

        // 2. Verify Event Creation (FK Reference to User.id)
        console.log(`👉 2. Simulating Event Creation for Host ID: ${user.id}`);
        const eventResult = await pool.query(
            `INSERT INTO events (
        host_id, title, description, category, venue_name, address, 
        latitude, longitude, event_date, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title`,
            [
                user.id,
                "Schema Test Event",
                "Testing DB schema constraints",
                "tech",
                "Test Venue",
                "123 Test St",
                22.3, 87.3,
                new Date(Date.now() + 86400000), // tomorrow
                "https://example.com/event.jpg"
            ]
        );

        console.log("✅ Event Created successfully:", eventResult.rows[0]);

        // 3. Cleanup Test Data
        console.log("👉 3. Cleaning up test data...");
        await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
        console.log("✅ Cleanup complete.");

        console.log("\n✨ DATABASE SCHEMA VERIFICATION PASSED! ✨");
        console.log("Both Users and Events tables are correctly mapped to each other via UUIDs.");

    } catch (err) {
        console.error("❌ Schema Verification Failed:", err);
    } finally {
        process.exit();
    }
}

verifySchemaFlow();
