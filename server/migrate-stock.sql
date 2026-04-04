-- Table: stock_items
CREATE TABLE IF NOT EXISTS stock_items (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- Pharmacy, Service, Ultrasound, X-ray, Other
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50), -- Tab, Bottle, Service, etc.
    min_stock_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: stock_batches (for FEFO tracking)
CREATE TABLE IF NOT EXISTS stock_batches (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES stock_items(id) ON DELETE CASCADE,
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    purchase_price DECIMAL(12, 2) DEFAULT 0.00,
    sale_price DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: stock_transactions
CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES stock_items(id),
    batch_id INTEGER REFERENCES stock_batches(id),
    type VARCHAR(10) NOT NULL, -- 'IN' (Purchase), 'OUT' (Sale/Usage), 'ADJUST'
    quantity INTEGER NOT NULL,
    reason TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);