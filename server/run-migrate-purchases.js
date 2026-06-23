const db = require('./db');
const fs = require('fs');

async function run() {
  try {
    const sql = `
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    paid_amount DECIMAL(12, 2) DEFAULT 0.00,
    balance_amount DECIMAL(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity INTEGER NOT NULL,
    purchase_price DECIMAL(12, 2) DEFAULT 0.00,
    sale_price DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) DEFAULT 0.00
);
`;
    await db.query(sql);
    console.log('Purchases tables created');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
