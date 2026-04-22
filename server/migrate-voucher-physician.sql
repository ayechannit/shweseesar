ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS physician_id INTEGER REFERENCES physicians(id);
