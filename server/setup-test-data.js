const db = require('./db');

async function setupTestData() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Truncating tables...');
    await client.query(`
      TRUNCATE 
        clinic_referral_transactions,
        purchase_items,
        purchases,
        voucher_referrals,
        voucher_items,
        vouchers,
        gp_package_items,
        gp_packages,
        appointments,
        laboratory_test_pricing,
        stock_transactions,
        stock_batches,
        stock_items,
        item_subcategories,
        item_categories,
        refer_clinics,
        laboratories,
        referred_persons,
        suppliers,
        nurses,
        medical_officers,
        physicians,
        patients
      RESTART IDENTITY CASCADE;
    `);

    console.log('Inserting master data...');
    
    // 1. Patients
    const patients = await client.query(`
      INSERT INTO patients (name, phone_number, date_of_birth, gender, patient_code, address)
      VALUES 
        ('Kyaw Kyaw', '09123456789', '1990-05-15', 'Male', 'PT-260425-0001', 'No. 123, Pyay Road, Yangon'),
        ('Su Su', '09234567890', '1995-10-20', 'Female', 'PT-260425-0002', 'No. 456, Kabar Aye Pagoda Road, Yangon'),
        ('Aung Aung', '09345678901', '1985-01-10', 'Male', 'PT-260425-0003', 'No. 789, Insein Road, Yangon'),
        ('Mya Mya', '09456789012', '2000-12-25', 'Female', 'PT-260425-0004', 'No. 101, Sule Pagoda Road, Yangon')
      RETURNING id;
    `);

    // 2. Physicians
    const physicians = await client.query(`
      INSERT INTO physicians (name, specialty, phone_number, email)
      VALUES 
        ('Dr. Hla Hla', 'General Physician', '095551111', 'hlahla@example.com'),
        ('Dr. Tun Tun', 'Pediatrician', '095552222', 'tuntun@example.com'),
        ('Dr. Zaw Zaw', 'Cardiologist', '095553333', 'zawzaw@example.com')
      RETURNING id;
    `);

    // 3. Laboratories
    const labs = await client.query(`
      INSERT INTO laboratories (name, phone_number, address, contact_person, commission_percentage)
      VALUES 
        ('Mega Lab', '097771111', 'Yangon', 'U Ba', 20.00),
        ('City Lab', '097772222', 'Yangon', 'Daw Mya', 15.00),
        ('Alpha Diagnostics', '097773333', 'Yangon', 'U Ko', 25.00)
      RETURNING id;
    `);

    // 4. Refer Clinics (External)
    const referClinics = await client.query(`
      INSERT INTO refer_clinics (name, opd_commission, ot_commission, admission_commission)
      VALUES 
        ('Grand Hantha', 5000, 50000, 100000),
        ('Pun Hlaing', 7000, 70000, 150000),
        ('Victoria Hospital', 6000, 60000, 120000)
      RETURNING id;
    `);

    // 5. Referred Persons (Incoming Referrals)
    const referrers = await client.query(`
      INSERT INTO referred_persons (name, organization, phone_number, referral_percentage)
      VALUES 
        ('U Maung Maung', 'Independent Agent', '098881111', 10.00),
        ('Daw Aye Aye', 'Local Clinic', '098882222', 15.00),
        ('Dr. Myo Myo', 'Private GP', '098883333', 12.00)
      RETURNING id;
    `);

    // 6. Suppliers
    const suppliers = await client.query(`
      INSERT INTO suppliers (company_name, contact_person, phone_number, address)
      VALUES 
        ('AA Medical', 'U Kyaw', '099991111', 'Yangon'),
        ('Pacific Medical', 'Daw Ni', '099992222', 'Yangon'),
        ('OK Pharmacy Wholesaler', 'U Myint', '099993333', 'Yangon')
      RETURNING id;
    `);

    // 7. Item Categories & Subcategories
    const catPharmacy = await client.query("INSERT INTO item_categories (name) VALUES ('PHARMACY') RETURNING id");
    const catService = await client.query("INSERT INTO item_categories (name) VALUES ('Service') RETURNING id");
    const catLab = await client.query("INSERT INTO item_categories (name) VALUES ('Laboratory Test') RETURNING id");

    const subAntibiotics = await client.query("INSERT INTO item_subcategories (category_id, name) VALUES ($1, 'Antibiotics') RETURNING id", [catPharmacy.rows[0].id]);
    const subVitamins = await client.query("INSERT INTO item_subcategories (category_id, name) VALUES ($1, 'Vitamins') RETURNING id", [catPharmacy.rows[0].id]);
    const subConsultation = await client.query("INSERT INTO item_subcategories (category_id, name) VALUES ($1, 'Consultation') RETURNING id", [catService.rows[0].id]);
    const subBloodTest = await client.query("INSERT INTO item_subcategories (category_id, name) VALUES ($1, 'Blood Test') RETURNING id", [catLab.rows[0].id]);

    // 8. Stock Items
    const itemAmoxicillin = await client.query(`
      INSERT INTO stock_items (subcategory_id, item_code, name, unit, min_stock_level, default_purchase_price, default_sale_price)
      VALUES ($1, 'MED-001', 'Amoxicillin 500mg', 'Capsule', 100, 150, 250) RETURNING id
    `, [subAntibiotics.rows[0].id]);

    const itemParacetamol = await client.query(`
      INSERT INTO stock_items (subcategory_id, item_code, name, unit, min_stock_level, default_purchase_price, default_sale_price)
      VALUES ($1, 'MED-002', 'Paracetamol 500mg', 'Tablet', 200, 20, 50) RETURNING id
    `, [subAntibiotics.rows[0].id]);

    const itemVitaminC = await client.query(`
      INSERT INTO stock_items (subcategory_id, item_code, name, unit, min_stock_level, default_purchase_price, default_sale_price)
      VALUES ($1, 'MED-003', 'Vitamin C 1000mg', 'Tablet', 50, 200, 400) RETURNING id
    `, [subVitamins.rows[0].id]);

    const itemCBC = await client.query(`
      INSERT INTO stock_items (subcategory_id, item_code, name, unit, min_stock_level, default_purchase_price, default_sale_price)
      VALUES ($1, 'LAB-001', 'Complete Blood Count (CBC)', 'Test', 0, 5000, 8000) RETURNING id
    `, [subBloodTest.rows[0].id]);

    const itemGlucose = await client.query(`
      INSERT INTO stock_items (subcategory_id, item_code, name, unit, min_stock_level, default_purchase_price, default_sale_price)
      VALUES ($1, 'LAB-002', 'Blood Glucose Test', 'Test', 0, 3000, 6000) RETURNING id
    `, [subBloodTest.rows[0].id]);

    const itemConsult = await client.query(`
      INSERT INTO stock_items (subcategory_id, item_code, name, unit, min_stock_level, default_purchase_price, default_sale_price)
      VALUES ($1, 'SRV-001', 'GP Consultation', 'Session', 0, 0, 10000) RETURNING id
    `, [subConsultation.rows[0].id]);

    // 9. Stock Batches
    const today = new Date();
    const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);
    const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1);
    const lastMonth = new Date(today); lastMonth.setMonth(today.getMonth() - 1);
    const expiringSoon = new Date(today); expiringSoon.setDate(today.getDate() + 15);

    // Amoxicillin - 2 batches (one expiring soon)
    await client.query(`
      INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price)
      VALUES 
        ($1, 'B001', $2, 500, 150, 250),
        ($1, 'B002', $3, 200, 150, 250)
    `, [itemAmoxicillin.rows[0].id, nextYear, expiringSoon]);

    // Paracetamol - 1 batch, low stock
    await client.query(`
      INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price)
      VALUES ($1, 'B003', $2, 50, 20, 50)
    `, [itemParacetamol.rows[0].id, nextYear]);

    // Vitamin C - 1 batch, healthy stock
    await client.query(`
      INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price)
      VALUES ($1, 'B004', $2, 300, 200, 400)
    `, [itemVitaminC.rows[0].id, nextYear]);

    // 10. Laboratory Test Pricing
    await client.query(`
      INSERT INTO laboratory_test_pricing (laboratory_id, item_id, purchase_price, commission_percentage)
      VALUES 
        ($1, $2, 4500, 25.00), -- CBC at Mega Lab
        ($1, $3, 2500, 25.00)  -- Glucose at Mega Lab
    `, [labs.rows[0].id, itemCBC.rows[0].id, itemGlucose.rows[0].id]);

    // 11. GP Packages
    const pkgGeneral = await client.query("INSERT INTO gp_packages (name, price) VALUES ('General Health Screening', 25000) RETURNING id");
    await client.query(`
      INSERT INTO gp_package_items (package_id, item_id, quantity)
      VALUES 
        ($1, $2, 1), -- GP Consult
        ($1, $3, 1), -- CBC
        ($1, $4, 1)  -- Glucose
    `, [pkgGeneral.rows[0].id, itemConsult.rows[0].id, itemCBC.rows[0].id, itemGlucose.rows[0].id]);

    // 12. Purchases
    const purchase1 = await client.query(`
      INSERT INTO purchases (invoice_number, supplier_id, total_amount, paid_amount, balance_amount, payment_method)
      VALUES ('PUR-260401-001', $1, 100000, 80000, 20000, 'KPay') RETURNING id
    `, [suppliers.rows[0].id]);
    
    const purchase2 = await client.query(`
      INSERT INTO purchases (invoice_number, supplier_id, total_amount, paid_amount, balance_amount, payment_method)
      VALUES ('PUR-260410-002', $1, 50000, 50000, 0, 'Cash') RETURNING id
    `, [suppliers.rows[1].id]);

    // 13. Vouchers (Transactions)
    // Voucher 1: 3 days ago, mix of items
    const date3DaysAgo = new Date(today); date3DaysAgo.setDate(today.getDate() - 3);
    const v1 = await client.query(`
      INSERT INTO vouchers (voucher_number, patient_id, physician_id, total_amount, discount_amount, net_amount, created_at)
      VALUES ('VOU-260422-0001', $1, $2, 15000, 0, 15000, $3) RETURNING id
    `, [patients.rows[0].id, physicians.rows[0].id, date3DaysAgo]);

    await client.query(`
      INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal)
      VALUES ($1, 'PHARMACY', $2, 'Amoxicillin 500mg', 10, 250, 2500)
    `, [v1.rows[0].id, itemAmoxicillin.rows[0].id]);

    await client.query(`
      INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal, laboratory_id, lab_cost_price, lab_payment_status)
      VALUES ($1, 'INVESTIGATION', $2, 'Complete Blood Count (CBC)', 1, 8000, 8000, $3, 4500, 'Pending')
    `, [v1.rows[0].id, itemCBC.rows[0].id, labs.rows[0].id]);

    await client.query(`
      INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal)
      VALUES ($1, 'SERVICE', $2, 'GP Consultation', 1, 4500, 4500)
    `, [v1.rows[0].id, itemConsult.rows[0].id]);

    // Voucher 2: 1 day ago, package and referral
    const date1DayAgo = new Date(today); date1DayAgo.setDate(today.getDate() - 1);
    const v2 = await client.query(`
      INSERT INTO vouchers (voucher_number, patient_id, physician_id, total_amount, discount_amount, net_amount, created_at)
      VALUES ('VOU-260424-0002', $1, $2, 25000, 1000, 24000, $3) RETURNING id
    `, [patients.rows[1].id, physicians.rows[1].id, date1DayAgo]);

    await client.query(`
      INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal)
      VALUES ($1, 'PACKAGE', $2, 'General Health Screening', 1, 25000, 25000)
    `, [v2.rows[0].id, pkgGeneral.rows[0].id]);

    await client.query(`
      INSERT INTO voucher_referrals (voucher_id, referred_person_id, referral_type, amount, payment_status)
      VALUES ($1, $2, 'Agent', 2500, 'Pending')
    `, [v2.rows[0].id, referrers.rows[0].id]);

    // 14. External Clinic Referrals
    await client.query(`
      INSERT INTO clinic_referral_transactions (patient_id, refer_clinic_id, visit_type, commission_amount, payment_status, created_at)
      VALUES 
        ($1, $2, 'OT', 50000, 'Paid', $4),
        ($1, $3, 'ADMISSION', 150000, 'Pending', $5)
    `, [patients.rows[2].id, referClinics.rows[0].id, referClinics.rows[1].id, date3DaysAgo, date1DayAgo]);

    // 15. Stock Transactions (Logs)
    await client.query(`
      INSERT INTO stock_transactions (item_id, type, quantity, reason)
      VALUES 
        ($1, 'IN', 700, 'Initial Stock Amoxicillin'),
        ($2, 'IN', 50, 'Initial Stock Paracetamol'),
        ($3, 'IN', 300, 'Initial Stock Vitamin C'),
        ($1, 'OUT', 10, 'Sale VOU-260422-0001')
    `, [itemAmoxicillin.rows[0].id, itemParacetamol.rows[0].id, itemVitaminC.rows[0].id]);

    await client.query('COMMIT');
    console.log('Test data setup completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error setting up test data:', err);
  } finally {
    client.release();
  }
}

setupTestData();
