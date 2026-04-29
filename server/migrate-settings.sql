CREATE TABLE IF NOT EXISTS voucher_settings (
    id SERIAL PRIMARY KEY,
    margin_top VARCHAR(50) DEFAULT '10px',
    margin_right VARCHAR(50) DEFAULT '10px',
    margin_bottom VARCHAR(50) DEFAULT '10px',
    margin_left VARCHAR(50) DEFAULT '10px',
    width VARCHAR(50) DEFAULT '100%',
    height VARCHAR(50) DEFAULT 'auto',
    icon_path VARCHAR(255),
    address TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO voucher_settings (id, address, description) 
VALUES (1, 'Shwe See Sar Clinic, Yangon', 'Thank you for your visit.') 
ON CONFLICT (id) DO NOTHING;
