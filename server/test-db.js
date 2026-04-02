const db = require('./db');

async function testConnection() {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('Database connection successful!');
    console.log('Current time from DB:', res.rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:');
    console.error(err);
    process.exit(1);
  }
}

testConnection();
