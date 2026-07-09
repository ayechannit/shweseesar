-- Add columns for Ultrasound and X-ray commissions to refer_clinics
ALTER TABLE refer_clinics ADD COLUMN IF NOT EXISTS ultrasound_commission DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE refer_clinics ADD COLUMN IF NOT EXISTS xray_commission DECIMAL(12, 2) DEFAULT 0.00;

-- Drop old visit type constraint from clinic_referral_transactions
ALTER TABLE clinic_referral_transactions DROP CONSTRAINT IF EXISTS clinic_referral_transactions_visit_type_check;

-- Add updated visit type constraint that includes ULTRASOUND and XRAY
ALTER TABLE clinic_referral_transactions ADD CONSTRAINT clinic_referral_transactions_visit_type_check 
CHECK (visit_type IN ('OPD', 'OT', 'ADMISSION', 'ULTRASOUND', 'XRAY'));
