const db = require('./db');

async function testQuery() {
  try {
    const res = await db.query(`
      SELECT 
        vi.id, 
        vi.subtotal, 
        vi.lab_commission_pct,
        (vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100) as row_profit
      FROM voucher_items vi
      WHERE vi.item_type = 'INVESTIGATION'
    `);
    
    console.table(res.rows);

    const aggRes = await db.query(`
      SELECT COALESCE(SUM(vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100), 0) as total_profit
      FROM voucher_items vi
      WHERE vi.item_type = 'INVESTIGATION'
    `);
    
    console.log("Total Profit calculated by DB:", aggRes.rows[0].total_profit);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

testQuery();