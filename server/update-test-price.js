const db = require('./db');

async function updatePrice() {
  try {
    const res = await db.query("UPDATE stock_items SET default_purchase_price = 5000 WHERE name = 'BT TEST UPDATED' RETURNING *;");
    console.log('--- Updated Item ---');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updatePrice();
