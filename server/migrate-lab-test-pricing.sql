CREATE TABLE IF NOT EXISTS laboratory_test_pricing (
    id SERIAL PRIMARY KEY,
    laboratory_id INTEGER REFERENCES laboratories(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES stock_items(id) ON DELETE CASCADE,
    purchase_price DECIMAL(12, 2) DEFAULT 0.00,
    commission_percentage DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(laboratory_id, item_id)
);
