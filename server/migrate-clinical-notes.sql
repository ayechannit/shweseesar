CREATE TABLE IF NOT EXISTS patient_clinical_notes (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    diagnosis TEXT,
    treatment TEXT,
    ongoing_plan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
