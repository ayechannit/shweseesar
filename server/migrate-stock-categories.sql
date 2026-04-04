-- Create Categories Table
CREATE TABLE IF NOT EXISTS item_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Categories (Using Laboratory Test instead of Ultrasound/X-ray)
INSERT INTO item_categories (name) VALUES 
('Pharmacy'), ('Service'), ('Laboratory Test'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- Update stock_items table
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(100) UNIQUE;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES item_categories(id);

-- Drop the old hardcoded category column
ALTER TABLE stock_items DROP COLUMN IF EXISTS category;
