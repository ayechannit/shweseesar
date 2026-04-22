const db = require('./db');

async function checkCategories() {
  try {
    const res = await db.query("SELECT * FROM item_categories;");
    console.log('--- All Categories ---');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCategories();
