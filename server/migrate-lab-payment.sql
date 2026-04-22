ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS lab_cost_price DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS lab_payment_status VARCHAR(20) DEFAULT 'Pending'; -- 'Pending', 'Paid', 'N/A'
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS lab_paid_at TIMESTAMP;
