ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5, 2) DEFAULT 0.00;
