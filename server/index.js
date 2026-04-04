const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Allowed master data tables to prevent SQL injection
const ALLOWED_TABLES = [
  'patients',
  'physicians',
  'medical_officers',
  'nurses',
  'suppliers',
  'referred_persons',
  'item_categories',
  'item_subcategories',
  'laboratories'
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

// --- Reception Module Routes ---

// Patient Search
app.get('/api/reception/patients/search', async (req, res) => {
  const { query } = req.query; // Search by name, phone_number, patient_code
  const { dob } = req.query;   // Search by date_of_birth exactly
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let baseSql = 'FROM patients WHERE is_active = true';
    const params = [];
    let paramIndex = 1;

    if (query) {
      baseSql += ` AND (name ILIKE $${paramIndex} OR phone_number ILIKE $${paramIndex} OR patient_code ILIKE $${paramIndex})`;
      params.push(`%${query}%`);
      paramIndex++;
    }

    if (dob) {
      baseSql += ` AND date_of_birth = $${paramIndex}`;
      params.push(dob);
      paramIndex++;
    }

    // Get total count
    const countRes = await db.query(`SELECT COUNT(*) ${baseSql}`, params);
    const total = parseInt(countRes.rows[0].count);

    // Get paginated data
    const dataSql = `SELECT * ${baseSql} ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const result = await db.query(dataSql, [...params, limit, offset]);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET: Appointments (with related patient and physician data)
app.get('/api/appointments', async (req, res) => {
  const date = req.query.date; // Optional: filter by specific date
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  try {
    let baseSql = `
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN physicians doc ON a.physician_id = doc.id
      WHERE a.is_active = true
    `;
    const params = [];

    if (date) {
      // Filter by exactly this date (ignoring time)
      baseSql += ' AND DATE(a.appointment_date) = $1';
      params.push(date);
    }

    // Get total count
    const countRes = await db.query(`SELECT COUNT(*) ${baseSql}`, params);
    const total = parseInt(countRes.rows[0].count);

    // Get paginated data
    const dataSql = `
      SELECT 
        a.*,
        p.name as patient_name, p.patient_code, p.phone_number as patient_phone,
        doc.name as physician_name
      ${baseSql}
      ORDER BY a.appointment_date ASC, a.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const result = await db.query(dataSql, [...params, limit, offset]);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('APPOINTMENT GET ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST: Book Appointment
app.post('/api/appointments', async (req, res) => {
  const { patient_id, physician_id, appointment_date, reason } = req.body;
  if (!patient_id || !physician_id || !appointment_date) {
    return res.status(400).json({ error: 'Missing required appointment fields' });
  }

  try {
    const query = `
      INSERT INTO appointments (patient_id, physician_id, appointment_date, reason, status)
      VALUES ($1, $2, $3, $4, 'Scheduled')
      RETURNING *;
    `;
    const values = [patient_id, physician_id, appointment_date, reason || ''];
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('APPOINTMENT BOOK ERROR:', err);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// PUT: Update Appointment Status
app.put('/api/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const query = `
      UPDATE appointments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *;
    `;
    const result = await db.query(query, [status, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('APPOINTMENT UPDATE ERROR:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE: Cancel/Delete Appointment
app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      UPDATE appointments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING id;
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    console.error('APPOINTMENT DELETE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// --- Stock Management Module Routes ---

// List all stock items with current aggregate quantity
app.get('/api/stock/items', async (req, res) => {
  const { subcategory_id, category_id } = req.query; 
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE si.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (subcategory_id) {
      whereClause += ` AND si.subcategory_id = $${paramIndex}`;
      params.push(subcategory_id);
      paramIndex++;
    } else if (category_id) {
      whereClause += ` AND ic.id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Get total count
    const countSql = `
      SELECT COUNT(DISTINCT si.id) 
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      ${whereClause}
    `;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count);

    // Get paginated data
    let dataSql = `
      SELECT 
        si.*, 
        isc.name as subcategory_name, 
        ic.name as category_name,
        ic.id as category_id,
        COALESCE(SUM(sb.quantity), 0) as total_quantity
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      LEFT JOIN stock_batches sb ON si.id = sb.item_id AND sb.quantity > 0
      ${whereClause}
      GROUP BY si.id, isc.name, ic.name, ic.id 
      ORDER BY ic.name, isc.name, si.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await db.query(dataSql, [...params, limit, offset]);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add new stock item
app.post('/api/stock/items', async (req, res) => {
  const { 
    subcategory_id, item_code, name, unit, min_stock_level,
    default_purchase_price, default_sale_price, pricing_method, markup_percentage 
  } = req.body;
  
  try {
    const query = `
      INSERT INTO stock_items (
        subcategory_id, item_code, name, unit, min_stock_level,
        default_purchase_price, default_sale_price, pricing_method, markup_percentage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const result = await db.query(query, [
      subcategory_id, item_code, name, unit, min_stock_level || 0,
      default_purchase_price || 0, default_sale_price || 0, 
      pricing_method || 'MANUAL', markup_percentage || 0
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// GET: All batches for a specific item (for management/editing)
app.get('/api/stock/batches/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const countRes = await db.query(
      'SELECT COUNT(*) FROM stock_batches WHERE item_id = $1 AND quantity > 0',
      [itemId]
    );
    const total = parseInt(countRes.rows[0].count);

    // Get paginated data
    const result = await db.query(
      'SELECT * FROM stock_batches WHERE item_id = $1 AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST LIMIT $2 OFFSET $3',
      [itemId, limit, offset]
    );

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// POST: Add new stock batch (Purchase/Stock IN)
app.post('/api/stock/purchase', async (req, res) => {
  const { item_id, batch_number, expiry_date, quantity, purchase_price, sale_price } = req.body;
  try {
    // 1. Create the batch
    const batchQuery = `
      INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const batchRes = await db.query(batchQuery, [item_id, batch_number, expiry_date, quantity, purchase_price, sale_price]);
    const batchId = batchRes.rows[0].id;

    // 2. Log transaction
    await db.query(
      'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason) VALUES ($1, $2, $3, $4, $5)',
      [item_id, batchId, 'IN', quantity, 'Purchase Entry']
    );

    res.status(201).json({ message: 'Stock received', batch_id: batchId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// FEFO Sale Implementation
app.post('/api/stock/sell', async (req, res) => {
  const { item_id, quantity_to_sell, reason } = req.body;
  if (!item_id || !quantity_to_sell) return res.status(400).json({ error: 'Invalid data' });

  try {
    // 1. Check total stock
    const stockRes = await db.query('SELECT SUM(quantity) as total FROM stock_batches WHERE item_id = $1', [item_id]);
    const totalAvailable = parseInt(stockRes.rows[0].total) || 0;
    if (totalAvailable < quantity_to_sell) return res.status(400).json({ error: 'Insufficient stock' });

    // 2. FEFO: Get batches ordered by expiry date
    const batchesRes = await db.query(
      'SELECT * FROM stock_batches WHERE item_id = $1 AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST',
      [item_id]
    );

    let remainingToSell = parseInt(quantity_to_sell);
    const transactions = [];

    // Begin deduction using FEFO
    for (const batch of batchesRes.rows) {
      if (remainingToSell <= 0) break;

      const takeFromThisBatch = Math.min(batch.quantity, remainingToSell);
      
      // Update batch quantity
      await db.query('UPDATE stock_batches SET quantity = quantity - $1 WHERE id = $2', [takeFromThisBatch, batch.id]);
      
      // Log transaction
      await db.query(
        'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason) VALUES ($1, $2, $3, $4, $5)',
        [item_id, batch.id, 'OUT', -takeFromThisBatch, reason || 'Sale']
      );

      remainingToSell -= takeFromThisBatch;
    }

    res.json({ message: 'Stock deducted using FEFO' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sale transaction failed' });
  }
});

// --- Pricing Module Routes ---

// GET: All items with pricing info
app.get('/api/pricing/items', async (req, res) => {
  const { category_id, subcategory_id } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE si.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (subcategory_id) {
      whereClause += ` AND si.subcategory_id = $${paramIndex}`;
      params.push(subcategory_id);
      paramIndex++;
    } else if (category_id) {
      whereClause += ` AND ic.id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }
    
    // Get total count
    const countSql = `
      SELECT COUNT(*) 
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      ${whereClause}
    `;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count);

    // Get paginated data
    let dataSql = `
      SELECT 
        si.id, si.item_code, si.name as item_name, si.unit,
        si.default_purchase_price, si.default_sale_price,
        si.pricing_method, si.markup_percentage,
        isc.name as subcategory_name, 
        ic.name as category_name,
        ic.id as category_id
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      ${whereClause}
      ORDER BY ic.name, isc.name, si.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await db.query(dataSql, [...params, limit, offset]);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Pricing GET error:', err);
    res.status(500).json({ error: 'Failed to fetch pricing items' });
  }
});

// PUT: Update pricing for a specific item
app.put('/api/pricing/items/:id', async (req, res) => {
  const { id } = req.params;
  let { default_purchase_price, default_sale_price, pricing_method, markup_percentage } = req.body;
  
  if (!pricing_method) pricing_method = 'MANUAL';
  
  // Calculate sale price based on rules if needed
  if (pricing_method === 'MARKUP_PERCENT') {
    const markup = parseFloat(markup_percentage) || 0;
    const purchasePrice = parseFloat(default_purchase_price) || 0;
    default_sale_price = purchasePrice + (purchasePrice * (markup / 100));
  }

  try {
    const query = `
      UPDATE stock_items
      SET 
        default_purchase_price = $1,
        default_sale_price = $2,
        pricing_method = $3,
        markup_percentage = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND is_active = true
      RETURNING *;
    `;
    const values = [default_purchase_price || 0, default_sale_price || 0, pricing_method, markup_percentage || 0, id];
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Pricing UPDATE error:', err);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// GET: Export Pricing to CSV
app.get('/api/pricing/export', async (req, res) => {
  try {
    const query = `
      SELECT 
        si.item_code, si.name as item_name,
        ic.name as category, isc.name as subcategory,
        si.default_purchase_price, si.default_sale_price,
        si.pricing_method, si.markup_percentage
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      WHERE si.is_active = true
      ORDER BY ic.name, isc.name, si.name
    `;
    const result = await db.query(query);
    
    let csvData = 'Item Code,Item Name,Category,Subcategory,Purchase Price,Sale Price,Pricing Method,Markup Percentage\n';
    result.rows.forEach(row => {
      // Escape commas in names
      const name = `"${row.item_name || ''}"`;
      const cat = `"${row.category || ''}"`;
      const subcat = `"${row.subcategory || ''}"`;
      
      csvData += `${row.item_code || ''},${name},${cat},${subcat},${row.default_purchase_price},${row.default_sale_price},${row.pricing_method},${row.markup_percentage}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('stock_pricing.csv');
    res.send(csvData);
  } catch (err) {
    console.error('CSV Export error:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// POST: Import Pricing from CSV
app.post('/api/pricing/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Delete temp file
      fs.unlinkSync(req.file.path);

      let successCount = 0;
      let errorCount = 0;

      for (const row of results) {
        // Find by Item Code (or Name as fallback)
        const itemCode = row['Item Code'];
        if (!itemCode) {
          errorCount++;
          continue;
        }

        const purchasePrice = parseFloat(row['Purchase Price']) || 0;
        let salePrice = parseFloat(row['Sale Price']) || 0;
        const pricingMethod = row['Pricing Method'] || 'MANUAL';
        const markup = parseFloat(row['Markup Percentage']) || 0;

        if (pricingMethod === 'MARKUP_PERCENT') {
           salePrice = purchasePrice + (purchasePrice * (markup / 100));
        }

        try {
          const updateRes = await db.query(`
            UPDATE stock_items 
            SET 
              default_purchase_price = $1,
              default_sale_price = $2,
              pricing_method = $3,
              markup_percentage = $4,
              updated_at = CURRENT_TIMESTAMP
            WHERE item_code = $5 AND is_active = true
            RETURNING id
          `, [purchasePrice, salePrice, pricingMethod, markup, itemCode]);
          
          if (updateRes.rows.length > 0) {
             successCount++;
          } else {
             errorCount++;
          }
        } catch (err) {
          console.error(`Failed to update ${itemCode}:`, err);
          errorCount++;
        }
      }

      res.json({ message: 'Import completed', success: successCount, failed: errorCount });
    });
});

// GET: Sample CSV for Import
app.get('/api/pricing/sample', (req, res) => {
  const csvData = 'Item Code,Item Name,Category,Subcategory,Purchase Price,Sale Price,Pricing Method,Markup Percentage\n' +
    'ITM001,Example Medicine,Pharmacy,General Pharmacy,10.00,12.00,MARKUP_PERCENT,20\n' +
    'ITM002,Another Item,Pharmacy,Consumables,50.00,65.00,MANUAL,0\n';
  
  res.header('Content-Type', 'text/csv');
  res.attachment('sample_stock_pricing.csv');
  res.send(csvData);
});

// --- GP Package Module Routes ---

// GET: All packages with their items
app.get('/api/gp-packages', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const countRes = await db.query('SELECT COUNT(*) FROM gp_packages WHERE is_active = true');
    const total = parseInt(countRes.rows[0].count);

    // Get paginated packages
    const packagesRes = await db.query(
      'SELECT * FROM gp_packages WHERE is_active = true ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const packages = packagesRes.rows;

    for (let pkg of packages) {
      const itemsRes = await db.query(`
        SELECT pi.*, si.name as item_name, si.unit
        FROM gp_package_items pi
        JOIN stock_items si ON pi.item_id = si.id
        WHERE pi.package_id = $1 AND pi.is_active = true
      `, [pkg.id]);
      pkg.items = itemsRes.rows;
    }

    res.json({
      data: packages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('GP Packages GET error:', err);
    res.status(500).json({ error: 'Failed to fetch GP packages' });
  }
});

// POST: Create a new GP package
app.post('/api/gp-packages', async (req, res) => {
  const { name, price, items } = req.body; // items is an array of { item_id, quantity }
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    // Start transaction
    await db.query('BEGIN');

    const pkgRes = await db.query(
      'INSERT INTO gp_packages (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    const newPkg = pkgRes.rows[0];

    if (items && Array.isArray(items)) {
      for (let item of items) {
        await db.query(
          'INSERT INTO gp_package_items (package_id, item_id, quantity) VALUES ($1, $2, $3)',
          [newPkg.id, item.item_id, item.quantity]
        );
      }
    }

    await db.query('COMMIT');
    res.status(201).json(newPkg);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('GP Packages POST error:', err);
    res.status(500).json({ error: 'Failed to create GP package' });
  }
});

// PUT: Update an existing GP package
app.put('/api/gp-packages/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, items } = req.body;

  try {
    await db.query('BEGIN');

    await db.query(
      'UPDATE gp_packages SET name = $1, price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, price, id]
    );

    // Simplest approach: Delete old items and insert new ones
    await db.query('DELETE FROM gp_package_items WHERE package_id = $1', [id]);

    if (items && Array.isArray(items)) {
      for (let item of items) {
        await db.query(
          'INSERT INTO gp_package_items (package_id, item_id, quantity) VALUES ($1, $2, $3)',
          [id, item.item_id, item.quantity]
        );
      }
    }

    await db.query('COMMIT');
    res.json({ message: 'Package updated successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('GP Packages PUT error:', err);
    res.status(500).json({ error: 'Failed to update GP package' });
  }
});

// DELETE: Soft delete a GP package
app.delete('/api/gp-packages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE gp_packages SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    console.error('GP Packages DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete GP package' });
  }
});

// --- Billing & Voucher Module Routes ---

// Helper for stock deduction (FEFO)
const deductStock = async (client, itemId, quantityToDeduct, reason) => {
  // 1. Check total stock
  const stockRes = await client.query('SELECT SUM(quantity) as total FROM stock_batches WHERE item_id = $1', [itemId]);
  const totalAvailable = parseInt(stockRes.rows[0].total) || 0;
  if (totalAvailable < quantityToDeduct) {
    throw new Error(`Insufficient stock for item ID ${itemId}`);
  }

  // 2. FEFO: Get batches ordered by expiry date
  const batchesRes = await client.query(
    'SELECT * FROM stock_batches WHERE item_id = $1 AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST',
    [itemId]
  );

  let remainingToDeduct = parseInt(quantityToDeduct);

  for (const batch of batchesRes.rows) {
    if (remainingToDeduct <= 0) break;

    const takeFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
    
    await client.query('UPDATE stock_batches SET quantity = quantity - $1 WHERE id = $2', [takeFromThisBatch, batch.id]);
    
    await client.query(
      'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason) VALUES ($1, $2, $3, $4, $5)',
      [itemId, batch.id, 'OUT', -takeFromThisBatch, reason]
    );

    remainingToDeduct -= takeFromThisBatch;
  }
};

// GET: All vouchers (paginated)
app.get('/api/billing/vouchers', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const countRes = await db.query('SELECT COUNT(*) FROM vouchers');
    const total = parseInt(countRes.rows[0].count);

    const result = await db.query(`
      SELECT v.*, p.name as patient_name, p.patient_code
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// GET: Single voucher details
app.get('/api/billing/vouchers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const voucherRes = await db.query(`
      SELECT v.*, p.name as patient_name, p.patient_code, p.phone_number as patient_phone
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE v.id = $1
    `, [id]);
    
    if (voucherRes.rows.length === 0) return res.status(404).json({ error: 'Voucher not found' });
    const voucher = voucherRes.rows[0];

    const itemsRes = await db.query(`
      SELECT vi.*, l.name as laboratory_name
      FROM voucher_items vi
      LEFT JOIN laboratories l ON vi.laboratory_id = l.id
      WHERE vi.voucher_id = $1
    `, [id]);
    voucher.items = itemsRes.rows;

    const referralsRes = await db.query(`
      SELECT vr.*, rp.name as referred_person_name
      FROM voucher_referrals vr
      LEFT JOIN referred_persons rp ON vr.referred_person_id = rp.id
      WHERE vr.voucher_id = $1
    `, [id]);
    voucher.referrals = referralsRes.rows;

    res.json(voucher);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch voucher details' });
  }
});

// POST: Create Voucher
app.post('/api/billing/vouchers', async (req, res) => {
  const { 
    patient_id, items, referrals, 
    total_amount, discount_amount, net_amount, 
    payment_method, notes 
  } = req.body;

  // Generate Voucher Number: VOU-YYMMDD-RAND
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const voucher_number = `VOU-${datePart}-${randPart}`;

  const client = await db.pool?.connect() || db; // Handle if using pool or direct query

  try {
    await db.query('BEGIN');

    // 1. Insert Voucher
    const vRes = await db.query(`
      INSERT INTO vouchers (voucher_number, patient_id, total_amount, discount_amount, net_amount, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [voucher_number, patient_id, total_amount, discount_amount, net_amount, payment_method, notes]);
    const voucherId = vRes.rows[0].id;

    // 2. Insert Items & Deduct Stock
    for (const item of items) {
      await db.query(`
        INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal, laboratory_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [voucherId, item.item_type, item.item_id, item.name, item.quantity, item.unit_price, item.subtotal, item.laboratory_id]);

      if (item.item_type === 'PHARMACY') {
        await deductStock(db, item.item_id, item.quantity, `Voucher sale ${voucher_number}`);
      } else if (item.item_type === 'PACKAGE') {
        // Find package components
        const pkgItems = await db.query('SELECT * FROM gp_package_items WHERE package_id = $1 AND is_active = true', [item.item_id]);
        for (const pi of pkgItems.rows) {
          const totalQty = pi.quantity * item.quantity;
          await deductStock(db, pi.item_id, totalQty, `Voucher Package ${item.name} (${voucher_number})`);
        }
      }
    }

    // 3. Insert Referrals
    if (referrals && Array.isArray(referrals)) {
      for (const ref of referrals) {
        await db.query(`
          INSERT INTO voucher_referrals (voucher_id, referred_person_id, referral_type, percentage, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [voucherId, ref.referred_person_id, ref.referral_type, ref.percentage, ref.amount]);
      }
    }

    await db.query('COMMIT');
    res.status(201).json({ id: voucherId, voucher_number });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('VOUCHER CREATE ERROR:', err);
    res.status(500).json({ error: 'Failed to create voucher', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});