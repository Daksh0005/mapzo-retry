require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Credentials missing!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    console.log("⏳ Testing Supabase Storage Upload...");

    // Create a dummy buffer (text file)
    const buffer = Buffer.from("Test file content", 'utf-8');
    const fileName = `test-upload-${Date.now()}.txt`;

    // 1. Test event-images bucket
    console.log("👉 Attempting to upload to 'event-images'...");
    const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, buffer, {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error("❌ 'event-images' Upload Error:", error.message);
        if (error.message.includes("Bucket not found")) {
            console.error("💡 It seems the 'event-images' bucket does not exist. Please create it in your Supabase Dashboard.");
        }
    } else {
        console.log("✅ 'event-images' Upload Success:", data);

        // Get URL
        const { data: urlData } = supabase.storage
            .from('event-images')
            .getPublicUrl(fileName);

        console.log("🔗 Public URL:", urlData.publicUrl);
    }

    // 2. Test avatars bucket
    console.log("\n👉 Attempting to upload to 'avatars'...");
    const { data: avatarData, error: avatarError } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
            contentType: 'text/plain',
            upsert: true
        });

    if (avatarError) {
        console.error("❌ 'avatars' Upload Error:", avatarError.message);
        if (avatarError.message.includes("Bucket not found")) {
            console.error("💡 It seems the 'avatars' bucket does not exist. Please create it in your Supabase Dashboard.");
        }
    } else {
        console.log("✅ 'avatars' Upload Success:", avatarData);
    }
}

testUpload();
