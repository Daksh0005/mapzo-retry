require('dotenv').config(); // Loads .env from root if run as 'node backend/scripts/fix-bucket.js'

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log("Checking Env Vars...");
    console.log("URL:", supabaseUrl ? "Found" : "Missing");
    console.log("KEY:", supabaseKey ? "Found" : "Missing");
    console.error("❌ Missing Supabase Credentials. Make sure .env is loaded.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBucket() {
    console.log("🛠️ Attempting to make 'event-images' bucket PUBLIC...");

    // 1. Try updating existing bucket
    const { data, error } = await supabase.storage.updateBucket('event-images', {
        public: true,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: ['image/jpeg', 'image/png']
    });

    if (error) {
        console.error("⚠️ Update failed:", error.message);

        // 2. If it doesn't exist, Create it
        if (error.message.includes('not found')) {
            console.log("Bucket not found. Creating it...");
            const { data: createData, error: createError } = await supabase.storage.createBucket('event-images', {
                public: true,
                file_size_limit: 10485760,
                allowed_mime_types: ['image/jpeg', 'image/png']
            });

            if (createError) {
                console.error("❌ Create failed:", createError.message);
            } else {
                console.log("✅ Bucket 'event-images' created and set to PUBLIC.");
            }
        }
    } else {
        console.log("✅ Success! Bucket 'event-images' is now PUBLIC.");
    }
}

fixBucket();
