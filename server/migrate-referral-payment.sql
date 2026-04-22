ALTER TABLE voucher_referrals ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE voucher_referrals ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
