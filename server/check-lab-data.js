const db = require('./db');

async function checkLabData() {
  try {
    const res = await db.query(`
      SELECT vi.id, vi.name, vi.subtotal, vi.lab_cost_price, vi.lab_commission_pct, vi.laboratory_id 
      FROM voucher_items vi
      WHERE vi.item_type = 'INVESTIGATION'
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkLabData();