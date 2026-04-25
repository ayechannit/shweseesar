CREATE TABLE IF NOT EXISTS refer_clinics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    opd_commission DECIMAL(12, 2) DEFAULT 0.00,
    ot_commission DECIMAL(12, 2) DEFAULT 0.00,
    admission_commission DECIMAL(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
