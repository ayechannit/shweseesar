-- Table: gp_packages
CREATE TABLE IF NOT EXISTS gp_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: gp_package_items (Items included in the package)
CREATE TABLE IF NOT EXISTS gp_package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES gp_packages(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES stock_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
