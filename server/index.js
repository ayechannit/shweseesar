const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Allowed master data tables to prevent SQL injection
const ALLOWED_TABLES = [
  'patients',
  'physicians',
  'medical_officers',
  'nurses',
  'suppliers',
  'referred_persons'
];

// Helper function to validate table name
const validateTable = (req, res, next) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: 'Invalid master data type' });
  }
  next();
};

// --- Generic CRUD Routes for Master Data ---

// GET: Retrieve paginated active records
app.get('/api/master-data/:table', validateTable, async (req, res) => {
  const { table } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total count for pagination
    const countRes = await db.query(`SELECT COUNT(*) FROM ${table} WHERE is_active = true`);
    const total = parseInt(countRes.rows[0].count);

    // Get paginated data
    const result = await db.query(
      `SELECT * FROM ${table} WHERE is_active = true ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('DATABASE ERROR:', err);
    res.status(500).json({ error: 'Database query failed', details: err.message });
  }
});

// POST: Create a new record
app.post('/api/master-data/:table', validateTable, async (req, res) => {
  const { table } = req.params;
  const data = req.body;
  
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No data provided' });
  }

  // Filter out id, created_at, updated_at, is_active if they happen to be sent
  const safeData = { ...data };
  delete safeData.id;
  delete safeData.created_at;
  delete safeData.updated_at;
  delete safeData.is_active;

  // Auto-generate patient_code
  if (table === 'patients' && !safeData.patient_code) {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    safeData.patient_code = `PT-${datePart}-${randomPart}`;
  }

  const columns = Object.keys(safeData);
  const values = Object.values(safeData);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *;
  `;

  try {
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert record' });
  }
});

// PUT: Update an existing record
app.put('/api/master-data/:table/:id', validateTable, async (req, res) => {
  const { table, id } = req.params;
  const data = req.body;
  
  const safeData = { ...data };
  delete safeData.id;
  delete safeData.created_at;
  delete safeData.updated_at;
  delete safeData.is_active;

  if (Object.keys(safeData).length === 0) {
    return res.status(400).json({ error: 'No data to update' });
  }

  const columns = Object.keys(safeData);
  const values = Object.values(safeData);
  
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  
  // Add ID to the end of the values array
  values.push(id);
  const idPlaceholder = `$${values.length}`;

  const query = `
    UPDATE ${table}
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${idPlaceholder} AND is_active = true
    RETURNING *;
  `;

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or already deleted' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE: Soft delete a record
app.delete('/api/master-data/:table/:id', validateTable, async (req, res) => {
  const { table, id } = req.params;
  
  const query = `
    UPDATE ${table}
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id;
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or already deleted' });
    }
    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});