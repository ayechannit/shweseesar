const db = require('./db');

async function checkSettings() {
  try {
    const res = await db.query('SELECT * FROM voucher_settings WHERE id = 1');
    if (res.rows.length > 0) {
      console.log('Voucher Settings found:');
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('No voucher settings found with id = 1.');
      // Check if table exists
      const tableCheck = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voucher_settings')");
      console.log('Table voucher_settings exists:', tableCheck.rows[0].exists);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error checking settings:');
    console.error(err);
    process.exit(1);
  }
}

checkSettings();
