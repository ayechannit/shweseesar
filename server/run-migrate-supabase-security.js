const db = require('./db');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrate-supabase-security.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running Supabase security grants migration...');
    await db.query(sql);
    console.log('Supabase security grants applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.message.includes('role "anon" does not exist')) {
      console.warn('Note: This script is intended for Supabase environments. If you are running locally, these roles may not exist.');
    }
  } finally {
    process.exit();
  }
}

run();
