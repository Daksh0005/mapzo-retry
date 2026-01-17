require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');

// List of random events to pick from
const SAMPLE_EVENTS = [
    {
        title: "Mapzo Launch Party 🚀",
        desc: "Join us for the official launch of Mapzo! Free drinks and coding talks.",
        cat: "party",
        venue: "Tech Park Plaza",
        lat: 28.6139,
        lng: 77.2090, // Delhi
        img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30"
    },
    {
        title: "Sunset Music Festival 🎸",
        desc: "Live bands, good vibes, and open air music under the stars.",
        cat: "music",
        venue: "Open Air Theatre",
        lat: 19.0760,
        lng: 72.8777, // Mumbai
        img: "https://images.unsplash.com/photo-1459749411177-8c4750bb0c1f"
    },
    {
        title: "Weekend Coding Bootcamp 💻",
        desc: "Learn React and Node.js in 48 hours. Bring your laptop!",
        cat: "tech",
        venue: "Co-Work Hub",
        lat: 12.9716,
        lng: 77.5946, // Bangalore
        img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97"
    }
];

async function seedData() {
    console.log("🌱 Starting Data Seed...");

    try {
        // 1. Get the first user from DB (or failing that, create a dummy one)
        let userId;
        const userRes = await pool.query("SELECT id FROM users LIMIT 1");

        if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            console.log(`✅ Found existing user to be host: ${userId}`);
        } else {
            console.log("⚠️ No users found. Creating a temporary host...");
            const newUser = await pool.query(
                `INSERT INTO users (email, display_name, is_host) 
                 VALUES ('seeder@mapzo.in', 'Mapzo Seeder', true) 
                 RETURNING id`
            );
            userId = newUser.rows[0].id;
        }

        // 2. Insert Random Event
        const evt = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];

        console.log(`👉 Creating Event: "${evt.title}"...`);

        const result = await pool.query(
            `INSERT INTO events (
                host_id, title, description, category, venue_name, address,
                latitude, longitude, event_date, image_url
             ) VALUES ($1, $2, $3, $4, $5, 'Seeded Address', $6, $7, NOW() + INTERVAL '3 days', $8)
             RETURNING id`,
            [userId, evt.title, evt.desc, evt.cat, evt.venue, evt.lat, evt.lng, evt.img]
        );

        console.log(`🎉 SUCCESS! Event Created with ID: ${result.rows[0].id}`);
        console.log("Check the map!");

    } catch (err) {
        console.error("❌ Seeding Failed:", err);
    } finally {
        process.exit();
    }
}

seedData();
