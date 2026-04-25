CREATE TABLE IF NOT EXISTS clinic_referral_transactions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    refer_clinic_id INTEGER REFERENCES refer_clinics(id),
    visit_type VARCHAR(50) NOT NULL CHECK (visit_type IN ('OPD', 'OT', 'ADMISSION')),
    commission_amount DECIMAL(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
