const db = require('./db');

async function checkExeDashboard() {
  try {
    const res = await db.query(`
      SELECT COALESCE(SUM(vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100), 0) as lab_profit 
      FROM voucher_items vi
      JOIN vouchers v ON vi.voucher_id = v.id
      WHERE vi.item_type = 'INVESTIGATION' 
      AND DATE(v.created_at) BETWEEN '2026-04-01' AND '2026-04-30'
    `);
    console.log("Lab Profit:", res.rows[0].lab_profit);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkExeDashboard();