const db = require('./db');

async function checkStock() {
  try {
    const res = await db.query(`
      SELECT id, name, default_purchase_price, default_sale_price 
      FROM stock_items 
      WHERE name = 'Blood Glucose Test'
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkStock();