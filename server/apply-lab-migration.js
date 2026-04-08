const db = require('./db');

async function applyMigration() {
  try {
    console.log('Adding status and result_file_path to voucher_items...');
    await db.query(`
      ALTER TABLE voucher_items 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS result_file_path TEXT;
    `);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

applyMigration();
