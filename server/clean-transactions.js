const db = require('./db');

async function cleanTransactions() {
  const client = await db.pool.connect();
  
  console.log('Starting transaction cleanup...');
  
  try {
    await client.query('BEGIN');

    // 1. Clear Voucher related tables
    console.log('Clearing vouchers and related tables...');
    await client.query('TRUNCATE TABLE vouchers CASCADE');
    // TRUNCATE CASCADE on vouchers will automatically clear:
    // - voucher_items
    // - voucher_referrals

    // 2. Clear Purchase related tables
    console.log('Clearing purchases and related tables...');
    await client.query('TRUNCATE TABLE purchases CASCADE');
    // TRUNCATE CASCADE on purchases will automatically clear:
    // - purchase_items

    // 3. Clear Stock tracking tables
    console.log('Clearing stock batches and transactions...');
    await client.query('TRUNCATE TABLE stock_transactions CASCADE');
    await client.query('TRUNCATE TABLE stock_batches CASCADE');

    // 4. Clear Clinic Referral Transactions
    console.log('Clearing clinic referral transactions...');
    await client.query('TRUNCATE TABLE clinic_referral_transactions CASCADE');

    // 5. Clear Appointments
    console.log('Clearing appointments...');
    await client.query('TRUNCATE TABLE appointments CASCADE');

    // Reset sequences (optional but good practice)
    console.log('Resetting sequences...');
    await client.query('ALTER SEQUENCE vouchers_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE purchases_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE stock_transactions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE stock_batches_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE clinic_referral_transactions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1');

    await client.query('COMMIT');
    console.log('✅ Successfully cleared all transaction records. Master data remains intact.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clean transactions:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanTransactions();