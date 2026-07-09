-- Drop strict check constraint on visit_type to support comma-separated multiple visit types
ALTER TABLE clinic_referral_transactions DROP CONSTRAINT IF EXISTS clinic_referral_transactions_visit_type_check;
