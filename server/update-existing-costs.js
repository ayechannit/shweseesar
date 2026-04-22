const db = require('./db');

async function updateVoucherItems() {
  try {
    const res = await db.query(`
      UPDATE voucher_items 
      SET lab_cost_price = 5000 
      WHERE name = 'BT TEST UPDATED' AND item_type = 'INVESTIGATION' AND lab_cost_price = 0;
    `);
    console.log(`Updated ${res.rowCount} existing records.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateVoucherItems();
