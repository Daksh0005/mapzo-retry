const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function initDB() {
    try {
        const sqlPath = path.join(__dirname, '..', 'db.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('⏳ Running db.sql...');
        await pool.query(sql);
        console.log('✅ Database initialization successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        process.exit(1);
    }
}

initDB();
