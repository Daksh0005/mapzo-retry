require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');

const ADMIN_EMAILS = [
    "shreyashmishra506@gmail.com",
    "realdaksharora@gmail.com",
    "iitianshreyash25@gmail.com",
    "aadityasingh1439@gmail.com",
    "913kaushiknarayankv42020@gmail.com"
];

async function grantAdminAccess() {
    console.log("⏳ Checking and granting admin access to:", ADMIN_EMAILS);

    try {
        for (const email of ADMIN_EMAILS) {
            const res = await pool.query(
                `UPDATE users SET is_host = TRUE WHERE email = $1 RETURNING email, is_host`,
                [email]
            );
            if (res.rowCount > 0) {
                console.log(`✅ Granted host access to: ${email}`);
            } else {
                console.log(`⚠️ User not found (will be set on next login): ${email}`);
            }
        }
    } catch (err) {
        console.error("❌ Error granting admin access:", err);
    } finally {
        process.exit();
    }
}

grantAdminAccess();
