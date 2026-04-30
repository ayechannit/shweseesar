const db = require('./db');

async function checkLabs() {
  try {
    const res = await db.query(`
      SELECT * FROM laboratories
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkLabs();