ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS lab_commission_pct DECIMAL(5, 2) DEFAULT 0.00;
