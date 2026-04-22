const db = require('./db');

async function checkPrices() {
  try {
    const res = await db.query(`
      SELECT si.id, si.name, ic.name as cat_name, si.default_purchase_price, si.default_sale_price 
      FROM stock_items si
      JOIN item_subcategories isc ON si.subcategory_id = isc.id
      JOIN item_categories ic ON isc.category_id = ic.id
      WHERE ic.name ILIKE '%INVESTIGATION%' OR ic.name ILIKE '%Service%' 
      LIMIT 10;
    `);
    console.log('--- Investigation/Service Prices ---');
    console.table(res.rows);

    const voucherRes = await db.query("SELECT id, name, lab_cost_price, lab_payment_status FROM voucher_items WHERE item_type = 'INVESTIGATION' ORDER BY id DESC LIMIT 5;");
    console.log('--- Recent Voucher Investigation Items ---');
    console.table(voucherRes.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPrices();
