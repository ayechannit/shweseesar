-- Create Subcategories Table
CREATE TABLE IF NOT EXISTS item_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES item_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_id, name)
);

-- Insert Default Subcategories
INSERT INTO item_subcategories (category_id, name)
SELECT id, 'General Pharmacy' FROM item_categories WHERE name = 'Pharmacy'
ON CONFLICT DO NOTHING;

INSERT INTO item_subcategories (category_id, name)
SELECT id, 'Consumables' FROM item_categories WHERE name = 'Pharmacy'
ON CONFLICT DO NOTHING;

INSERT INTO item_subcategories (category_id, name)
SELECT id, 'Consultation' FROM item_categories WHERE name = 'Service'
ON CONFLICT DO NOTHING;

INSERT INTO item_subcategories (category_id, name)
SELECT id, 'Blood Test' FROM item_categories WHERE name = 'Laboratory Test'
ON CONFLICT DO NOTHING;

-- Update stock_items table to link to subcategory instead
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES item_subcategories(id);

-- Optional: If you had data, you'd map category_id to a default subcategory here.
-- Since this is fresh, we just drop the old category_id.
ALTER TABLE stock_items DROP COLUMN IF EXISTS category_id;
