const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'migrate-lab-commission-pct.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running laboratory commission pct migration...');
    await db.query(sql);
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
