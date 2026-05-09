-- Add audit fields to all existing tables

-- Function to safely add columns
CREATE OR REPLACE FUNCTION add_audit_columns(target_table text) RETURNS void AS $$
BEGIN
    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = target_table AND column_name = 'created_by') THEN
        EXECUTE 'ALTER TABLE ' || target_table || ' ADD COLUMN created_by INTEGER REFERENCES users(id)';
    END IF;

    -- Add updated_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = target_table AND column_name = 'updated_by') THEN
        EXECUTE 'ALTER TABLE ' || target_table || ' ADD COLUMN updated_by INTEGER REFERENCES users(id)';
    END IF;

    -- Add created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = target_table AND column_name = 'created_at') THEN
        EXECUTE 'ALTER TABLE ' || target_table || ' ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = target_table AND column_name = 'updated_at') THEN
        EXECUTE 'ALTER TABLE ' || target_table || ' ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all identified tables
SELECT add_audit_columns('patients');
SELECT add_audit_columns('physicians');
SELECT add_audit_columns('medical_officers');
SELECT add_audit_columns('nurses');
SELECT add_audit_columns('suppliers');
SELECT add_audit_columns('referred_persons');
SELECT add_audit_columns('vouchers');
SELECT add_audit_columns('voucher_items');
SELECT add_audit_columns('voucher_referrals');
SELECT add_audit_columns('clinic_referral_transactions');
SELECT add_audit_columns('patient_clinical_notes');
SELECT add_audit_columns('gp_packages');
SELECT add_audit_columns('gp_package_items');
SELECT add_audit_columns('laboratory_test_pricing');
SELECT add_audit_columns('laboratories');
SELECT add_audit_columns('appointments');
SELECT add_audit_columns('refer_clinics');
SELECT add_audit_columns('voucher_settings');
SELECT add_audit_columns('item_categories');
SELECT add_audit_columns('item_subcategories');
SELECT add_audit_columns('stock_items');
SELECT add_audit_columns('stock_batches');
SELECT add_audit_columns('stock_transactions');
SELECT add_audit_columns('purchases');
SELECT add_audit_columns('purchase_items');

-- Clean up helper function
DROP FUNCTION add_audit_columns(text);
