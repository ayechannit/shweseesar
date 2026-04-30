const db = require('./db');

async function testAllDates() {
  try {
    const res = await db.query(`
      SELECT 
        v.created_at,
        vi.subtotal,
        vi.lab_commission_pct,
        (vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100) as row_profit
      FROM voucher_items vi
      JOIN vouchers v ON vi.voucher_id = v.id
      WHERE vi.item_type = 'INVESTIGATION'
    `);
    
    console.table(res.rows);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

testAllDates();