const db = require('./db');

async function testVoucherAge() {
  try {
    const result = await db.query(`
      SELECT v.id, v.voucher_number, p.name as patient_name, p.patient_code, p.date_of_birth,
             EXTRACT(YEAR FROM AGE(p.date_of_birth)) as patient_age
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      ORDER BY v.created_at DESC
      LIMIT 5
    `);
    
    console.log('--- DB API RESULT TEST ---');
    result.rows.forEach(row => {
      console.log(`Voucher: ${row.voucher_number}`);
      console.log(`Patient: ${row.patient_name}`);
      console.log(`DOB: ${row.date_of_birth}`);
      console.log(`Calculated Age Field (patient_age): ${row.patient_age}`);
      console.log(`Type of patient_age: ${typeof row.patient_age}`);
      console.log('--------------------------');
    });
  } catch (err) {
    console.error('DB TEST ERROR:', err);
  } finally {
    process.exit();
  }
}

testVoucherAge();
