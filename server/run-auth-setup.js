const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigrations() {
  const migrations = [
    'migrate-auth.sql',
    'migrate-audit-fields.sql'
  ];

  for (const migration of migrations) {
    try {
      console.log(`Running ${migration}...`);
      const sqlPath = path.join(__dirname, migration);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await db.query(sql);
      console.log(`${migration} completed successfully.`);
    } catch (err) {
      console.error(`Error running ${migration}:`, err);
      process.exit(1);
    }
  }
  process.exit(0);
}

runMigrations();
