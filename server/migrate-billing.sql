-- Table: vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    payment_status VARCHAR(20) DEFAULT 'Paid',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: voucher_items
CREATE TABLE IF NOT EXISTS voucher_items (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
    item_type VARCHAR(50), -- 'PHARMACY', 'PACKAGE', 'INVESTIGATION', 'SERVICE'
    item_id INTEGER, -- Refers to stock_items.id or gp_packages.id
    name VARCHAR(255), -- Snapshot at time of sale
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    laboratory_id INTEGER REFERENCES laboratories(id), -- For investigation items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: voucher_referrals
CREATE TABLE IF NOT EXISTS voucher_referrals (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
    referred_person_id INTEGER REFERENCES referred_persons(id),
    referral_type VARCHAR(50), -- 'Physician', 'Agent', etc.
    percentage DECIMAL(5, 2) DEFAULT 0.00,
    amount DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
