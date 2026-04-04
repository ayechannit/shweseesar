-- Extend stock_items with pricing configuration
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS default_purchase_price DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS default_sale_price DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(50) DEFAULT 'MANUAL'; -- 'MANUAL', 'MARKUP_PERCENT'
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5, 2) DEFAULT 0.00;
