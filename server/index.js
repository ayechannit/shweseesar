const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorize, JWT_SECRET } = require('./middleware/auth');
const { uploadToS3, getS3SignedUrl } = require('./s3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage });
const s3Upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// GET: Get S3 signed URL for a file
app.get('/api/files/signed-url', authenticateToken, async (req, res) => {
  const { key, name } = req.query;
  if (!key) return res.status(400).json({ error: 'File key is required' });

  try {
    const url = await getS3SignedUrl(key, name);
    res.json({ url });
  } catch (err) {
    console.error('SIGNED URL ERROR:', err);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

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
  'laboratories',
  'refer_clinics'
];

// Helper function to validate table name
const validateTable = (req, res, next) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: 'Invalid master data type' });
  }
  next();
};

// --- Settings Routes ---
app.get('/api/settings/voucher', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM voucher_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('SETTINGS GET ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings/voucher', authenticateToken, authorize(['manage_settings']), s3Upload.single('icon'), async (req, res) => {
  const { margin_top, margin_right, margin_bottom, margin_left, width, height, address, description } = req.body;
  let icon_path = req.body.icon_path || null;

  if (req.file) {
    try {
      icon_path = await uploadToS3(req.file);
    } catch (err) {
      console.error('S3 ICON UPLOAD ERROR:', err);
      return res.status(500).json({ error: 'Failed to upload icon to S3' });
    }
  }

  try {
    const query = `
      UPDATE voucher_settings
      SET margin_top = $1, margin_right = $2, margin_bottom = $3, margin_left = $4, width = $5, height = $6, address = $7, description = $8, icon_path = COALESCE($9, icon_path), updated_at = CURRENT_TIMESTAMP, updated_by = $10
      WHERE id = 1
      RETURNING *
    `;
    const result = await db.query(query, [margin_top, margin_right, margin_bottom, margin_left, width, height, address, description, icon_path, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('SETTINGS UPDATE ERROR:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
// --- Generic CRUD Routes for Master Data ---

// GET: Retrieve paginated active records
app.get('/api/master-data/:table', authenticateToken, validateTable, async (req, res) => {
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
app.post('/api/master-data/:table', authenticateToken, validateTable, async (req, res) => {
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

  // Add audit field
  safeData.created_by = req.user.id;

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
    console.error('Master Data POST Error:', err);
    res.status(500).json({ error: 'Failed to insert record', details: err.message });
  }
});

// PUT: Update an existing record
app.put('/api/master-data/:table/:id', authenticateToken, validateTable, async (req, res) => {
  const { table, id } = req.params;
  const data = req.body;
  
  const safeData = { ...data };
  delete safeData.id;
  delete safeData.created_at;
  delete safeData.updated_at;
  delete safeData.is_active;

  // Add audit field
  safeData.updated_by = req.user.id;

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
app.delete('/api/master-data/:table/:id', authenticateToken, validateTable, async (req, res) => {
  const { table, id } = req.params;
  
  const query = `
    UPDATE ${table}
    SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1
    WHERE id = $2 AND is_active = true
    RETURNING id;
  `;

  try {
    const result = await db.query(query, [req.user.id, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or already deleted' });
    }
    res.json({ message: 'Record deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// --- Clinic Referral Transactions Routes ---

// GET: All clinic referral transactions
app.get('/api/clinic-referral-transactions', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, refer_clinic_id, patient_name, visit_type, from_date, to_date, payment_status } = req.query;
  const offset = (page - 1) * limit;

  try {
    let baseQuery = `
      FROM clinic_referral_transactions crt
      JOIN patients p ON crt.patient_id = p.id
      JOIN refer_clinics rc ON crt.refer_clinic_id = rc.id
      WHERE crt.is_active = true
    `;
    const params = [];

    if (refer_clinic_id) {
      params.push(refer_clinic_id);
      baseQuery += ` AND crt.refer_clinic_id = $${params.length}`;
    }
    if (patient_name) {
      params.push(`%${patient_name}%`);
      baseQuery += ` AND p.name ILIKE $${params.length}`;
    }
    if (visit_type) {
      if (visit_type === 'PENDING') {
        baseQuery += ` AND crt.visit_type IS NULL`;
      } else {
        params.push(visit_type);
        baseQuery += ` AND crt.visit_type = $${params.length}`;
      }
    }
    if (payment_status) {
      params.push(payment_status);
      baseQuery += ` AND crt.payment_status = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      baseQuery += ` AND crt.created_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date + ' 23:59:59');
      baseQuery += ` AND crt.created_at <= $${params.length}`;
    }

    const countRes = await db.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countRes.rows[0].count);

    // Calculate totals
    const sumQuery = `
      SELECT 
        SUM(CASE WHEN crt.payment_status = 'Paid' THEN crt.commission_amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN crt.payment_status = 'Pending' THEN crt.commission_amount ELSE 0 END) as total_unpaid
      ${baseQuery}
    `;
    const sumRes = await db.query(sumQuery, params);
    const summary = {
      paid: parseFloat(sumRes.rows[0].total_paid) || 0,
      unpaid: parseFloat(sumRes.rows[0].total_unpaid) || 0
    };

    const dataQuery = `
      SELECT crt.*, p.name as patient_name, rc.name as refer_clinic_name
      ${baseQuery}
      ORDER BY crt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await db.query(dataQuery, [...params, limit, offset]);

    res.json({
      data: result.rows,
      summary,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('FETCH CLINIC REFERRAL TRANSACTIONS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch clinic referral transactions' });
  }
});

// POST: Mark transaction as paid
app.post('/api/clinic-referral-transactions/:id/pay', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      UPDATE clinic_referral_transactions 
      SET payment_status = 'Paid', updated_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 RETURNING *
    `, [req.user.id, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PAYMENT ERROR:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// POST: Create a new clinic referral transaction
app.post('/api/clinic-referral-transactions', authenticateToken, async (req, res) => {
  const { patient_id, refer_clinic_id, visit_type, notes } = req.body;
  
  if (!patient_id || !refer_clinic_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (visit_type && !['OPD', 'OT', 'ADMISSION'].includes(visit_type)) {
    return res.status(400).json({ error: 'Invalid visit type' });
  }

  try {
    let commission_amount = 0.00;
    
    if (visit_type) {
      const clinicRes = await db.query(
        'SELECT opd_commission, ot_commission, admission_commission FROM refer_clinics WHERE id = $1',
        [refer_clinic_id]
      );
      
      if (clinicRes.rows.length > 0) {
        const clinic = clinicRes.rows[0];
        if (visit_type === 'OPD') commission_amount = clinic.opd_commission;
        else if (visit_type === 'OT') commission_amount = clinic.ot_commission;
        else if (visit_type === 'ADMISSION') commission_amount = clinic.admission_commission;
      }
    }

    const query = `
      INSERT INTO clinic_referral_transactions (patient_id, refer_clinic_id, visit_type, commission_amount, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await db.query(query, [patient_id, refer_clinic_id, visit_type || null, commission_amount, notes, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('CREATE CLINIC REFERRAL TRANSACTION ERROR:', err);
    res.status(500).json({ error: 'Failed to create clinic referral transaction' });
  }
});

// PUT: Update visit type and calculate commission
app.put('/api/clinic-referral-transactions/:id/visit-type', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { visit_type } = req.body;

  if (!visit_type || !['OPD', 'OT', 'ADMISSION'].includes(visit_type)) {
    return res.status(400).json({ error: 'Invalid or missing visit type' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get transaction to find the linked clinic
    const txRes = await client.query('SELECT refer_clinic_id FROM clinic_referral_transactions WHERE id = $1', [id]);
    if (txRes.rows.length === 0) throw new Error('Transaction not found');
    const refer_clinic_id = txRes.rows[0].refer_clinic_id;

    // Fetch the correct commission amount based on the visit type from the refer clinic
    const clinicRes = await client.query('SELECT opd_commission, ot_commission, admission_commission FROM refer_clinics WHERE id = $1', [refer_clinic_id]);
    if (clinicRes.rows.length === 0) throw new Error('Refer clinic not found');
    const clinic = clinicRes.rows[0];

    let commission_amount = 0;
    if (visit_type === 'OPD') {
      commission_amount = clinic.opd_commission;
    } else if (visit_type === 'OT') {
      commission_amount = clinic.ot_commission;
    } else if (visit_type === 'ADMISSION') {
      commission_amount = clinic.admission_commission;
    }

    const updateRes = await client.query(`
      UPDATE clinic_referral_transactions
      SET visit_type = $1, commission_amount = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
      WHERE id = $4
      RETURNING *;
    `, [visit_type, commission_amount, req.user.id, id]);

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('UPDATE VISIT TYPE ERROR:', err);
    res.status(500).json({ error: 'Failed to update visit type' });
  } finally {
    client.release();
  }
});

// --- Dashboard Analytics ---

app.get('/api/dashboard/revenue-profit', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const [
      revenueData,
      labData,
      referralCostData,
      purchaseCostData,
      trendData,
      breakdownData
    ] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COALESCE(SUM(net_amount), 0) FROM vouchers WHERE DATE(created_at) BETWEEN $1 AND $2) as voucher_revenue,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM clinic_referral_transactions WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_active = true) as external_referral_income
      `, [start, end]),
      
      db.query(`
        SELECT 
          COALESCE(SUM(vi.subtotal), 0) as lab_revenue,
          COALESCE(SUM(vi.subtotal - (vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100)), 0) as lab_cost,
          COALESCE(SUM(vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100), 0) as lab_profit
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE vi.item_type = 'INVESTIGATION' AND DATE(v.created_at) BETWEEN $1 AND $2
      `, [start, end]),

      db.query(`
        SELECT COALESCE(SUM(vr.amount), 0) as referral_cost
        FROM voucher_referrals vr
        JOIN vouchers v ON vr.voucher_id = v.id
        WHERE DATE(v.created_at) BETWEEN $1 AND $2
      `, [start, end]),

      db.query(`
        SELECT COALESCE(SUM(vi.quantity * COALESCE(si.default_purchase_price, 0)), 0) as purchase_cost
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        LEFT JOIN stock_items si ON vi.item_id = si.id
        WHERE vi.item_type != 'INVESTIGATION' AND DATE(v.created_at) BETWEEN $1 AND $2
      `, [start, end]),

      db.query(`
        WITH dates AS (
          SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as date
        )
        SELECT 
          d.date, 
          COALESCE((SELECT SUM(net_amount) FROM vouchers WHERE DATE(created_at) = d.date), 0) + 
          COALESCE((SELECT SUM(commission_amount) FROM clinic_referral_transactions WHERE DATE(created_at) = d.date AND is_active = true), 0) as total_revenue,
          
          COALESCE((SELECT SUM(vr.amount) FROM voucher_referrals vr JOIN vouchers v ON vr.voucher_id = v.id WHERE DATE(v.created_at) = d.date), 0) +
          COALESCE((SELECT SUM(vi.quantity * COALESCE(si.default_purchase_price, 0)) FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id LEFT JOIN stock_items si ON vi.item_id = si.id WHERE vi.item_type != 'INVESTIGATION' AND DATE(v.created_at) = d.date), 0) +
          COALESCE((SELECT SUM(vi.subtotal - (vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100)) FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id WHERE vi.item_type = 'INVESTIGATION' AND DATE(v.created_at) = d.date), 0) as total_cost
          
        FROM dates d
        ORDER BY d.date ASC;
      `, [start, end]),

      db.query(`
        SELECT UPPER(vi.item_type) as stream, COALESCE(SUM(vi.subtotal), 0) as value 
        FROM voucher_items vi 
        JOIN vouchers v ON vi.voucher_id = v.id 
        WHERE DATE(v.created_at) BETWEEN $1 AND $2
        GROUP BY UPPER(vi.item_type)
        UNION ALL
        SELECT 'EXTERNAL_REFERRAL' as stream, COALESCE(SUM(commission_amount), 0) as value 
        FROM clinic_referral_transactions
        WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_active = true
      `, [start, end])
    ]);

    const totalRev = parseFloat(revenueData.rows[0].voucher_revenue) + parseFloat(revenueData.rows[0].external_referral_income);
    const labProfit = parseFloat(labData.rows[0].lab_profit);
    const refCost = parseFloat(referralCostData.rows[0].referral_cost);
    const purCost = parseFloat(purchaseCostData.rows[0].purchase_cost);
    const labCost = parseFloat(labData.rows[0].lab_cost);
    
    // Total cost includes referral payouts, pharmacy COGS, and lab costs.
    const totalCost = refCost + purCost + labCost; 
    const netProfit = totalRev - totalCost;

    res.json({
      metrics: {
        total_revenue: totalRev,
        lab_profit: labProfit,
        referral_cost: refCost,
        purchase_cost: purCost,
        lab_cost: labCost,
        total_cost: totalCost,
        net_profit: netProfit
      },
      charts: {
        revenue_vs_cost: trendData.rows,
        lab_profit_analysis: {
          revenue: parseFloat(labData.rows[0].lab_revenue),
          cost: labCost,
          profit: labProfit
        },
        revenue_breakdown: breakdownData.rows
      }
    });
  } catch (err) {
    console.error('REVENUE PROFIT DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch revenue/profit data' });
  }
});

app.get('/api/dashboard/purchase', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const [metricsData, supplierSummaryData, unpaidInvoicesData] = await Promise.all([
      db.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_purchases,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(balance_amount), 0) as total_balance
        FROM purchases
        WHERE DATE(created_at) BETWEEN $1 AND $2
      `, [start, end]),

      db.query(`
        SELECT 
          s.id as supplier_id,
          s.company_name as supplier_name,
          COUNT(p.id) as total_invoices,
          COALESCE(SUM(p.total_amount), 0) as total_purchased,
          COALESCE(SUM(p.paid_amount), 0) as total_paid,
          COALESCE(SUM(p.balance_amount), 0) as total_balance
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE DATE(p.created_at) BETWEEN $1 AND $2
        GROUP BY s.id, s.company_name
        ORDER BY total_purchased DESC
      `, [start, end]),

      db.query(`
        SELECT 
          p.id,
          p.invoice_number,
          p.created_at as invoice_date,
          p.total_amount,
          p.paid_amount,
          p.balance_amount,
          s.company_name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.balance_amount > 0 AND DATE(p.created_at) BETWEEN $1 AND $2
        ORDER BY p.created_at ASC
      `, [start, end])
    ]);

    res.json({
      metrics: {
        total_purchases: parseFloat(metricsData.rows[0].total_purchases) || 0,
        total_paid: parseFloat(metricsData.rows[0].total_paid) || 0,
        total_balance: parseFloat(metricsData.rows[0].total_balance) || 0
      },
      reports: {
        supplier_summary: supplierSummaryData.rows,
        unpaid_invoices: unpaidInvoicesData.rows
      }
    });
  } catch (err) {
    console.error('PURCHASE DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch purchase dashboard data' });
  }
});

app.get('/api/dashboard/external-referral', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const [metricsData, byClinicData, byVisitTypeData] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(id) as total_referrals_out,
          COALESCE(SUM(commission_amount), 0) as total_income,
          COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN commission_amount ELSE 0 END), 0) as pending_income
        FROM clinic_referral_transactions
        WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_active = true
      `, [start, end]),

      db.query(`
        SELECT 
          rc.id as clinic_id,
          rc.name as clinic_name,
          COUNT(crt.id) as total_referrals,
          COALESCE(SUM(crt.commission_amount), 0) as total_income
        FROM clinic_referral_transactions crt
        LEFT JOIN refer_clinics rc ON crt.refer_clinic_id = rc.id
        WHERE DATE(crt.created_at) BETWEEN $1 AND $2 AND crt.is_active = true
        GROUP BY rc.id, rc.name
        ORDER BY total_income DESC
      `, [start, end]),

      db.query(`
        SELECT 
          COALESCE(visit_type, 'UNSPECIFIED') as visit_type,
          COUNT(id) as total_referrals,
          COALESCE(SUM(commission_amount), 0) as total_income
        FROM clinic_referral_transactions
        WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_active = true
        GROUP BY visit_type
        ORDER BY total_income DESC
      `, [start, end])
    ]);

    res.json({
      metrics: {
        total_referrals_out: parseInt(metricsData.rows[0].total_referrals_out) || 0,
        total_income: parseFloat(metricsData.rows[0].total_income) || 0,
        pending_income: parseFloat(metricsData.rows[0].pending_income) || 0
      },
      reports: {
        by_clinic: byClinicData.rows,
        by_visit_type: byVisitTypeData.rows
      }
    });
  } catch (err) {
    console.error('EXTERNAL REFERRAL DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch external referral dashboard data' });
  }
});

app.get('/api/dashboard/referral', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const [metricsData, topReferrersData] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(vr.id) as total_referrals,
          COALESCE(SUM(vr.amount), 0) as total_commission_cost,
          COALESCE(SUM(CASE WHEN vr.payment_status = 'Pending' THEN vr.amount ELSE 0 END), 0) as pending_commission
        FROM voucher_referrals vr
        JOIN vouchers v ON vr.voucher_id = v.id
        WHERE DATE(v.created_at) BETWEEN $1 AND $2
      `, [start, end]),

      db.query(`
        SELECT 
          rp.id as referred_person_id,
          rp.name as referrer_name,
          rp.organization as organization,
          COUNT(vr.id) as total_referrals,
          COALESCE(SUM(vr.amount), 0) as total_commission
        FROM voucher_referrals vr
        JOIN vouchers v ON vr.voucher_id = v.id
        LEFT JOIN referred_persons rp ON vr.referred_person_id = rp.id
        WHERE DATE(v.created_at) BETWEEN $1 AND $2
        GROUP BY rp.id, rp.name, rp.organization
        ORDER BY total_commission DESC
      `, [start, end])
    ]);

    res.json({
      metrics: {
        total_referrals: parseInt(metricsData.rows[0].total_referrals) || 0,
        total_commission_cost: parseFloat(metricsData.rows[0].total_commission_cost) || 0,
        pending_commission: parseFloat(metricsData.rows[0].pending_commission) || 0
      },
      reports: {
        top_referrers: topReferrersData.rows
      }
    });
  } catch (err) {
    console.error('REFERRAL DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch referral dashboard data' });
  }
});

app.get('/api/dashboard/inventory', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      totalStockValueData,
      lowStockData,
      expiringData,
      deadStockData,
      expiryAnalyticsData
    ] = await Promise.all([
      db.query(`
        SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_stock_value
        FROM stock_batches
        WHERE quantity > 0
      `),

      db.query(`
        SELECT si.id, si.item_code, si.name, si.unit, si.min_stock_level, COALESCE(SUM(sb.quantity), 0) as current_stock
        FROM stock_items si
        LEFT JOIN stock_batches sb ON si.id = sb.item_id
        WHERE si.is_active = true
        GROUP BY si.id, si.item_code, si.name, si.unit, si.min_stock_level
        HAVING COALESCE(SUM(sb.quantity), 0) < si.min_stock_level
        ORDER BY current_stock ASC
      `),

      db.query(`
        SELECT si.item_code, si.name, si.unit, sb.batch_number, sb.expiry_date, sb.quantity as current_stock
        FROM stock_batches sb
        JOIN stock_items si ON sb.item_id = si.id
        WHERE sb.expiry_date <= $1 AND sb.quantity > 0 AND si.is_active = true
        ORDER BY sb.expiry_date ASC
      `, [thirtyDaysFromNow]),

      db.query(`
        SELECT 
          si.item_code, 
          si.name, 
          si.unit, 
          COALESCE((SELECT SUM(quantity) FROM stock_batches WHERE item_id = si.id AND quantity > 0), 0) as current_stock,
          (SELECT MAX(transaction_date) FROM stock_transactions WHERE item_id = si.id AND type = 'OUT') as last_sold_date
        FROM stock_items si
        WHERE si.is_active = true
        AND COALESCE((SELECT SUM(quantity) FROM stock_batches WHERE item_id = si.id AND quantity > 0), 0) > 0
        AND (
          (SELECT MAX(transaction_date) FROM stock_transactions WHERE item_id = si.id AND type = 'OUT') < NOW() - INTERVAL '90 days'
          OR 
          (SELECT MAX(transaction_date) FROM stock_transactions WHERE item_id = si.id AND type = 'OUT') IS NULL
        )
        ORDER BY current_stock DESC
      `),

      // Comprehensive Expiry Analytics
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired_count,
          SUM(quantity * purchase_price) FILTER (WHERE expiry_date < CURRENT_DATE) as expired_value,

          COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as soon_30_count,
          SUM(quantity * purchase_price) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as soon_30_value,

          COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '30 days' AND expiry_date <= CURRENT_DATE + INTERVAL '60 days') as soon_60_count,
          SUM(quantity * purchase_price) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '30 days' AND expiry_date <= CURRENT_DATE + INTERVAL '60 days') as soon_60_value,

          COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '60 days' AND expiry_date <= CURRENT_DATE + INTERVAL '90 days') as soon_90_count,
          SUM(quantity * purchase_price) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '60 days' AND expiry_date <= CURRENT_DATE + INTERVAL '90 days') as soon_90_value
        FROM stock_batches
        WHERE quantity > 0
      `)
    ]);

    const expiryStats = expiryAnalyticsData.rows[0];

    res.json({
      metrics: {
        total_stock_value: parseFloat(totalStockValueData.rows[0].total_stock_value),
        low_stock_items: lowStockData.rows.length,
        expiring_items: expiringData.rows.length,
        expiry_stats: {
          expired: { count: parseInt(expiryStats.expired_count) || 0, value: parseFloat(expiryStats.expired_value) || 0 },
          soon_30: { count: parseInt(expiryStats.soon_30_count) || 0, value: parseFloat(expiryStats.soon_30_value) || 0 },
          soon_60: { count: parseInt(expiryStats.soon_60_count) || 0, value: parseFloat(expiryStats.soon_60_value) || 0 },
          soon_90: { count: parseInt(expiryStats.soon_90_count) || 0, value: parseFloat(expiryStats.soon_90_value) || 0 }
        }
      },
      reports: {
        low_stock_report: lowStockData.rows,
        expiry_report: expiringData.rows,
        dead_stock: deadStockData.rows
      }
    });

  } catch (err) {
    console.error('INVENTORY DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch inventory dashboard data' });
  }
});

app.get('/api/dashboard/laboratory', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const [metricsData, pendingPaymentsData, profitByLabData] = await Promise.all([
      // metrics: lab_revenue, lab_cost, lab_profit
      db.query(`
        SELECT 
          COALESCE(SUM(vi.subtotal), 0) as lab_revenue,
          COALESCE(SUM(vi.subtotal - (vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100)), 0) as lab_cost,
          COALESCE(SUM(vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100), 0) as lab_profit
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE vi.item_type = 'INVESTIGATION' AND DATE(v.created_at) BETWEEN $1 AND $2
      `, [start, end]),

      // reports: pending_lab_payments
      db.query(`
        SELECT vi.*, v.voucher_number, v.created_at as voucher_date, l.name as laboratory_name
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        LEFT JOIN laboratories l ON vi.laboratory_id = l.id
        WHERE vi.item_type = 'INVESTIGATION' AND vi.lab_payment_status = 'Pending'
        ORDER BY v.created_at DESC
      `),

      // reports: profit_by_lab
      db.query(`
        SELECT 
          l.id as laboratory_id,
          l.name as laboratory_name,
          COALESCE(SUM(vi.subtotal), 0) as revenue,
          COALESCE(SUM(vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100), 0) as profit
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        LEFT JOIN laboratories l ON vi.laboratory_id = l.id
        WHERE vi.item_type = 'INVESTIGATION' AND DATE(v.created_at) BETWEEN $1 AND $2
        GROUP BY l.id, l.name
        ORDER BY profit DESC
      `, [start, end])
    ]);

    const metrics = metricsData.rows[0];
    const lab_revenue = parseFloat(metrics.lab_revenue);
    const lab_profit = parseFloat(metrics.lab_profit);
    const lab_margin_pct = lab_revenue > 0 ? (lab_profit / lab_revenue * 100) : 0;

    res.json({
      metrics: {
        lab_revenue,
        lab_cost: parseFloat(metrics.lab_cost),
        lab_profit,
        lab_margin_pct
      },
      reports: {
        pending_lab_payments: pendingPaymentsData.rows,
        profit_by_lab: profitByLabData.rows
      }
    });
  } catch (err) {
    console.error('LABORATORY DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch laboratory dashboard data' });
  }
});

app.get('/api/dashboard/executive', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to this month if not provided
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const [
      revenueData,
      patientsData,
      vouchersData,
      labProfitData,
      pendingLabData,
      pendingReferralData,
      supplierBalanceData,
      revenueTrendData,
      revenueStreamData
    ] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COALESCE(SUM(net_amount), 0) FROM vouchers WHERE DATE(created_at) BETWEEN $1 AND $2) as voucher_revenue,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM clinic_referral_transactions WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_active = true) as external_referral_income
      `, [start, end]),
      
      db.query('SELECT COUNT(DISTINCT patient_id) as total_patients FROM vouchers WHERE DATE(created_at) BETWEEN $1 AND $2', [start, end]),
      
      db.query('SELECT COUNT(id) as total_vouchers FROM vouchers WHERE DATE(created_at) BETWEEN $1 AND $2', [start, end]),
      
      db.query(`
        SELECT COALESCE(SUM(vi.subtotal * COALESCE(vi.lab_commission_pct, 0) / 100), 0) as lab_profit
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE vi.item_type = 'INVESTIGATION' AND DATE(v.created_at) BETWEEN $1 AND $2
      `, [start, end]),
      db.query("SELECT COALESCE(SUM(lab_cost_price), 0) as pending_lab_payable FROM voucher_items WHERE lab_payment_status = 'Pending'"),
      
      db.query("SELECT COALESCE(SUM(amount), 0) as pending_referral_payable FROM voucher_referrals WHERE payment_status = 'Pending'"),
      
      db.query('SELECT COALESCE(SUM(balance_amount), 0) as supplier_balance FROM purchases'),
      
      db.query(`
        WITH dates AS (
          SELECT generate_series($1::date, $2::date, '1 day'::interval) as date
        )
        SELECT 
          d.date, 
          COALESCE((SELECT SUM(net_amount) FROM vouchers WHERE DATE(created_at) = d.date), 0) + 
          COALESCE((SELECT SUM(commission_amount) FROM clinic_referral_transactions WHERE DATE(created_at) = d.date AND is_active = true), 0) as total_revenue
        FROM dates d
        ORDER BY d.date ASC;
      `, [start, end]),

      db.query(`
        SELECT vi.item_type as stream, COALESCE(SUM(vi.subtotal), 0) as value 
        FROM voucher_items vi 
        JOIN vouchers v ON vi.voucher_id = v.id 
        WHERE DATE(v.created_at) BETWEEN $1 AND $2
        GROUP BY vi.item_type
        UNION ALL
        SELECT 'EXTERNAL_REFERRAL' as stream, COALESCE(SUM(commission_amount), 0) as value 
        FROM clinic_referral_transactions
        WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_active = true
      `, [start, end])
    ]);

    const voucherRev = parseFloat(revenueData.rows[0].voucher_revenue);
    const extRefRev = parseFloat(revenueData.rows[0].external_referral_income);
    const totalRev = voucherRev + extRefRev;
    const totalPts = parseInt(patientsData.rows[0].total_patients);

    res.json({
      metrics: {
        total_revenue: totalRev,
        voucher_revenue: voucherRev,
        external_referral_income: extRefRev,
        total_patients: totalPts,
        total_vouchers: parseInt(vouchersData.rows[0].total_vouchers),
        avg_revenue_per_patient: totalPts > 0 ? (totalRev / totalPts) : 0,
        lab_profit: parseFloat(labProfitData.rows[0].lab_profit),
        pending_lab_payable: parseFloat(pendingLabData.rows[0].pending_lab_payable),
        pending_referral_payable: parseFloat(pendingReferralData.rows[0].pending_referral_payable),
        supplier_balance: parseFloat(supplierBalanceData.rows[0].supplier_balance)
      },
      charts: {
        revenue_trend: revenueTrendData.rows,
        revenue_stream_split: revenueStreamData.rows
      }
    });
  } catch (err) {
    console.error('EXECUTIVE DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch executive dashboard data' });
  }
});

app.get('/api/dashboard/patients', authenticateToken, async (req, res) => {
  const { search, physicianId, fromDate, toDate, showAllPatients, isNewToday, isTotalTca, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // 1. Get Global Total Patient Count
    const totalCountRes = await db.query('SELECT COUNT(*) FROM patients');
    const totalCount = parseInt(totalCountRes.rows[0].count);

    // 2. Get New Patients Today
    const todayCountRes = await db.query('SELECT COUNT(*) FROM patients WHERE DATE(created_at) = CURRENT_DATE');
    const todayCount = parseInt(todayCountRes.rows[0].count);

    // 3. Get Total TCA Patients
    const totalTcaRes = await db.query('SELECT COUNT(DISTINCT patient_id) FROM vouchers WHERE tca_date >= CURRENT_DATE');
    const totalTcaCount = parseInt(totalTcaRes.rows[0].count);

    // 4. Get Tomorrow's TCA Patients
    const today = new Date();
    const tomorrow = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const tomorrowTcaRes = await db.query('SELECT COUNT(DISTINCT patient_id) FROM vouchers WHERE tca_date = $1', [tomorrowStr]);
    const tomorrowTcaCount = parseInt(tomorrowTcaRes.rows[0].count);


    // 5. Get Patient List (with search filtering)
    let listQuery = '';
    const params = [];
    let paramIndex = 1;

    // Base conditions for the patient
    let patientConditions = [];
    if (search) {
      patientConditions.push(`(p.name ILIKE $${paramIndex} OR p.patient_code ILIKE $${paramIndex} OR p.phone_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isNewToday === 'true') {
      patientConditions.push('DATE(p.created_at) = CURRENT_DATE');
    }

    // Determine if we need to join with vouchers for filtering
    const needsVoucherJoin = physicianId || (showAllPatients !== 'true' && (fromDate || toDate)) || isTotalTca === 'true';

    if (needsVoucherJoin) {
      // If we are filtering by TCA date or physician, we need to base the list on the vouchers that MATCH those filters.
      let voucherConditions = [];
      
      if (showAllPatients !== 'true' || isTotalTca === 'true') {
         voucherConditions.push('v.tca_date IS NOT NULL'); // Implicitly care about TCA unless "Show All Patients" is checked
      }
      
      if (physicianId) {
        voucherConditions.push(`v.physician_id = $${paramIndex}`);
        params.push(physicianId);
        paramIndex++;
      }

      if (isTotalTca === 'true') {
        voucherConditions.push('v.tca_date >= CURRENT_DATE');
      } else if (showAllPatients !== 'true') {
        if (fromDate) {
          voucherConditions.push(`v.tca_date >= $${paramIndex}`);
          params.push(fromDate);
          paramIndex++;
        }
        if (toDate) {
          voucherConditions.push(`v.tca_date <= $${paramIndex}`);
          params.push(toDate);
          paramIndex++;
        }
      }

      let patientWhere = patientConditions.length > 0 ? `AND ${patientConditions.join(' AND ')}` : '';
      let combinedVoucherConditions = voucherConditions.length > 0 ? `WHERE ${voucherConditions.join(' AND ')} ${patientWhere}` : (patientWhere ? `WHERE ${patientWhere.substring(4)}` : '');

      // Use DISTINCT ON patient_id, ordered by the TCA date that matches, or created_at
      listQuery = `
        SELECT DISTINCT ON (v.patient_id)
          p.id as patient_id, 
          p.name as patient_name, 
          p.patient_code, 
          p.phone_number,
          v.created_at as last_visit_date,
          v.voucher_number,
          ph.name as physician_name,
          v.tca_date
        FROM vouchers v
        JOIN patients p ON v.patient_id = p.id
        LEFT JOIN physicians ph ON v.physician_id = ph.id
        ${combinedVoucherConditions}
        ORDER BY v.patient_id, v.created_at DESC
      `;
      
      // Wrapping it to allow proper ordering by created_at overall
      listQuery = `
        WITH FilteredVouchers AS (${listQuery})
        SELECT * FROM FilteredVouchers
        ORDER BY last_visit_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

    } else {
      // Default view OR showAllPatients is true (with NO physician selected): just show recent patients and their absolute latest info
      let whereSql = patientConditions.length > 0 ? `WHERE ${patientConditions.join(' AND ')}` : '';
      
      listQuery = `
        SELECT 
          p.id as patient_id, 
          p.name as patient_name, 
          p.patient_code, 
          p.phone_number,
          (SELECT v.created_at FROM vouchers v WHERE v.patient_id = p.id ORDER BY v.created_at DESC LIMIT 1) as last_visit_date,
          (SELECT v.voucher_number FROM vouchers v WHERE v.patient_id = p.id ORDER BY v.created_at DESC LIMIT 1) as voucher_number,
          (SELECT ph.name FROM vouchers v LEFT JOIN physicians ph ON v.physician_id = ph.id WHERE v.patient_id = p.id ORDER BY v.created_at DESC LIMIT 1) as physician_name,
          (SELECT v.tca_date FROM vouchers v WHERE v.patient_id = p.id ORDER BY v.created_at DESC LIMIT 1) as tca_date
        FROM patients p
        ${whereSql}
        ORDER BY p.created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    }

    params.push(limit, offset);

    const patientsRes = await db.query(listQuery, params);

    res.json({
      totalCount,
      todayCount,
      totalTcaCount,
      tomorrowTcaCount,
      patients: patientsRes.rows
    });

  } catch (err) {
    console.error('PATIENTS DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch patients dashboard data' });
  }
});


app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      revenueToday,
      revenueMonth,
      patientsToday,
      patientsMonth,
      apptToday,
      pendingReferrals,
      lowStock,
      expiringStock,
      revenueTrend,
      topItems,
      recentVouchers,
      patientTrend
    ] = await Promise.all([
      // Revenue Today
      db.query('SELECT SUM(net_amount) as total FROM vouchers WHERE DATE(created_at) = $1', [today]),
      // Revenue Month
      db.query('SELECT SUM(net_amount) as total FROM vouchers WHERE DATE(created_at) >= $1', [firstDayOfMonth]),
      // Patients Today (Distinct patients who had a voucher or appointment)
      db.query(`
        SELECT COUNT(DISTINCT patient_id) as count 
        FROM (
          SELECT patient_id FROM vouchers WHERE DATE(created_at) = $1
          UNION
          SELECT patient_id FROM appointments WHERE DATE(appointment_date) = $1
        ) as combined`, [today]),
      // Patients Month
      db.query(`
        SELECT COUNT(DISTINCT patient_id) as count 
        FROM (
          SELECT patient_id FROM vouchers WHERE DATE(created_at) >= $1
          UNION
          SELECT patient_id FROM appointments WHERE DATE(appointment_date) >= $1
        ) as combined`, [firstDayOfMonth]),
      // Appointments Today
      db.query(`
        SELECT 
          COUNT(*) filter (where status = 'Scheduled') as scheduled,
          COUNT(*) filter (where status = 'Completed') as completed,
          COUNT(*) as total
        FROM appointments WHERE DATE(appointment_date) = $1 AND is_active = true`, [today]),
      // Pending Referral Payouts
      db.query("SELECT SUM(amount) as total FROM voucher_referrals WHERE payment_status = 'Pending'"),
      // Low Stock
      db.query(`
        SELECT COUNT(*) FROM (
          SELECT si.id, si.min_stock_level, COALESCE(SUM(sb.quantity), 0) as total_qty
          FROM stock_items si
          LEFT JOIN stock_batches sb ON si.id = sb.item_id
          WHERE si.is_active = true
          GROUP BY si.id, si.min_stock_level
          HAVING COALESCE(SUM(sb.quantity), 0) <= si.min_stock_level
        ) as low_stock_items`),
      // Expiring Stock (next 30 days)
      db.query('SELECT COUNT(*) FROM stock_batches WHERE expiry_date >= CURRENT_DATE AND expiry_date <= $1 AND quantity > 0', [thirtyDaysFromNow]),
      // Revenue Trend (last 7 days)
      db.query(`
        SELECT DATE(created_at) as date, SUM(net_amount) as amount 
        FROM vouchers 
        WHERE DATE(created_at) >= $1
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`, [sevenDaysAgo]),
      // Top Items This Month
      db.query(`
        SELECT name, SUM(quantity) as total_qty, SUM(subtotal) as total_revenue
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE DATE(v.created_at) >= $1
        GROUP BY name
        ORDER BY total_qty DESC
        LIMIT 5`, [firstDayOfMonth]),
      // Recent Vouchers
      db.query(`
        SELECT v.voucher_number, v.net_amount, v.created_at, p.name as patient_name
        FROM vouchers v
        JOIN patients p ON v.patient_id = p.id
        ORDER BY v.created_at DESC
        LIMIT 5`),
      // Patient Trend (last 7 days)
      db.query(`
        SELECT DATE(v.created_at) as date, COUNT(DISTINCT v.patient_id) as count
        FROM vouchers v
        WHERE v.created_at >= $1
        GROUP BY DATE(v.created_at)
        ORDER BY date ASC`, [sevenDaysAgo])
    ]);

    res.json({
      metrics: {
        revenueToday: parseFloat(revenueToday.rows[0].total) || 0,
        revenueMonth: parseFloat(revenueMonth.rows[0].total) || 0,
        patientsToday: parseInt(patientsToday.rows[0].count) || 0,
        patientsMonth: parseInt(patientsMonth.rows[0].count) || 0,
        appointmentsToday: apptToday.rows[0],
        pendingReferrals: parseFloat(pendingReferrals.rows[0].total) || 0,
        lowStockCount: parseInt(lowStock.rows[0].count) || 0,
        expiringStockCount: parseInt(expiringStock.rows[0].count) || 0
      },
      revenueTrend: revenueTrend.rows,
      topItems: topItems.rows,
      recentVouchers: recentVouchers.rows,
      patientTrend: patientTrend.rows
    });
  } catch (err) {
    console.error('DASHBOARD ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// --- Reports Center APIs ---

// GET: Revenue Reports
app.get('/api/reports/revenue', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';

  const lastMonthStart = new Date(new Date(start).setMonth(new Date(start).getMonth() - 1)).toISOString().split('T')[0];
  const lastMonthEnd = new Date(new Date(end).setMonth(new Date(end).getMonth() - 1)).toISOString().split('T')[0] + ' 23:59:59';

  try {
    const [
      paymentBreakdown,
      categoryBreakdown,
      topMeds,
      topServices,
      topPackages,
      dailyTrend,
      currentRevenue,
      lastMonthRevenue,
      collectionDetail
    ] = await Promise.all([
      // 1. Payment Method Breakdown
      db.query(`
        SELECT payment_method, SUM(net_amount) as total
        FROM vouchers 
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY payment_method`, [start, end]),
      // 2. Category Breakdown
      db.query(`
        SELECT vi.item_type, SUM(vi.subtotal) as total
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        GROUP BY vi.item_type`, [start, end]),
      // 3. Top 10 Medicines
      db.query(`
        SELECT name, SUM(quantity) as qty, SUM(subtotal) as revenue
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE v.created_at >= $1 AND v.created_at <= $2 AND vi.item_type = 'PHARMACY'
        GROUP BY name ORDER BY revenue DESC LIMIT 10`, [start, end]),
      // 4. Top 10 Services
      db.query(`
        SELECT name, SUM(quantity) as qty, SUM(subtotal) as revenue
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE v.created_at >= $1 AND v.created_at <= $2 AND (vi.item_type = 'INVESTIGATION' OR vi.item_type = 'Service')
        GROUP BY name ORDER BY revenue DESC LIMIT 10`, [start, end]),
      // 5. Top 10 Packages
      db.query(`
        SELECT name, SUM(quantity) as qty, SUM(subtotal) as revenue
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE v.created_at >= $1 AND v.created_at <= $2 AND vi.item_type = 'PACKAGE'
        GROUP BY name ORDER BY revenue DESC LIMIT 10`, [start, end]),
      // 6. Daily Trend
      db.query(`
        SELECT DATE(created_at) as date, SUM(net_amount) as amount
        FROM vouchers
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`, [start, end]),
      // 7. Comparison: Current Total
      db.query('SELECT SUM(net_amount) as total FROM vouchers WHERE created_at >= $1 AND created_at <= $2', [start, end]),
      // 8. Comparison: Last Month Total
      db.query('SELECT SUM(net_amount) as total FROM vouchers WHERE created_at >= $1 AND created_at <= $2', [lastMonthStart, lastMonthEnd]),
      // 9. Detailed Daily Collection (Voucher-wise)
      db.query(`
        SELECT v.created_at as date, v.voucher_number, p.name as patient_name, 
               v.total_amount, v.discount_amount, v.net_amount, v.payment_method
        FROM vouchers v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        ORDER BY v.created_at DESC LIMIT 100`, [start, end])
    ]);

    res.json({
      paymentBreakdown: paymentBreakdown.rows,
      categoryBreakdown: categoryBreakdown.rows,
      topMeds: topMeds.rows,
      topServices: topServices.rows,
      topPackages: topPackages.rows,
      dailyTrend: dailyTrend.rows,
      comparison: {
        current: parseFloat(currentRevenue.rows[0].total) || 0,
        previous: parseFloat(lastMonthRevenue.rows[0].total) || 0
      },
      collectionDetail: collectionDetail.rows
    });
  } catch (err) {
    console.error('REVENUE REPORT ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
});

// GET: Referral Reports
app.get('/api/reports/referrals', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';

  try {
    const [
      performance,
      payoutSummary,
      physicianPerformance
    ] = await Promise.all([
      // Performance by Referrer (Physician/Agent)
      db.query(`
        SELECT rp.name, rp.organization, COUNT(vr.id) as total_referrals, SUM(vr.amount) as total_commission
        FROM voucher_referrals vr
        JOIN referred_persons rp ON vr.referred_person_id = rp.id
        JOIN vouchers v ON vr.voucher_id = v.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        GROUP BY rp.id, rp.name, rp.organization
        ORDER BY total_commission DESC`, [start, end]),
      // Payout Status Summary
      db.query(`
        SELECT vr.payment_status, SUM(vr.amount) as total
        FROM voucher_referrals vr
        JOIN vouchers v ON vr.voucher_id = v.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        GROUP BY vr.payment_status`, [start, end]),
      // Attending Physician Performance
      db.query(`
        SELECT doc.name as physician_name, COUNT(v.id) as patients_handled, SUM(v.net_amount) as revenue_generated
        FROM vouchers v
        JOIN physicians doc ON v.physician_id = doc.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        GROUP BY doc.id, doc.name
        ORDER BY revenue_generated DESC`, [start, end])
    ]);

    res.json({
      performance: performance.rows,
      payoutSummary: payoutSummary.rows,
      physicianPerformance: physicianPerformance.rows
    });
  } catch (err) {
    console.error('REFERRAL REPORT ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch referral report' });
  }
});

// GET: Stock Reports
app.get('/api/reports/stock', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';
  
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      lowStock,
      expiringSoon,
      valuation,
      stockMovement,
      itemProfitability,
      purchaseSummary,
      stockAdditionBreakdown
    ] = await Promise.all([
      // Detailed Low Stock
      db.query(`
        SELECT si.name, si.unit, si.min_stock_level, COALESCE(SUM(sb.quantity), 0) as current_qty
        FROM stock_items si
        LEFT JOIN stock_batches sb ON si.id = sb.item_id
        WHERE si.is_active = true
        GROUP BY si.id, si.name, si.unit, si.min_stock_level
        HAVING COALESCE(SUM(sb.quantity), 0) <= si.min_stock_level
        ORDER BY current_qty ASC`),
      // Detailed Expiring Batches
      db.query(`
        SELECT si.name as item_name, sb.batch_number, sb.expiry_date, sb.quantity
        FROM stock_batches sb
        JOIN stock_items si ON sb.item_id = si.id
        WHERE sb.expiry_date <= $1 AND sb.quantity > 0
        ORDER BY sb.expiry_date ASC`, [thirtyDaysFromNow]),
      // Inventory Valuation
      db.query(`
        SELECT SUM(quantity * purchase_price) as total_value 
        FROM stock_batches 
        WHERE quantity > 0`),
      // Stock Movement (IN/OUT Log)
      db.query(`
       SELECT st.transaction_date as date, si.item_code, si.name as item_name, st.type, st.quantity, st.reason
       FROM stock_transactions st
       JOIN stock_items si ON st.item_id = si.id
       WHERE st.transaction_date >= $1 AND st.transaction_date <= $2
       ORDER BY st.transaction_date DESC`, [start, end]),
      // Item Profitability
      db.query(`
        SELECT 
          si.name, si.unit, 
          si.default_purchase_price as p_price, 
          si.default_sale_price as s_price,
          (si.default_sale_price - si.default_purchase_price) as margin_amt,
          CASE WHEN si.default_sale_price > 0 
               THEN ROUND(((si.default_sale_price - si.default_purchase_price) / si.default_sale_price) * 100, 2)
               ELSE 0 END as margin_pct
        FROM stock_items si
        WHERE si.is_active = true
        ORDER BY margin_amt DESC LIMIT 20`),
      // Purchase Summary by Supplier
      db.query(`
        SELECT s.company_name as supplier, COUNT(p.id) as invoice_count, SUM(p.total_amount) as total_purchased
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.created_at >= $1 AND p.created_at <= $2
        GROUP BY s.id, s.company_name
        ORDER BY total_purchased DESC`, [start, end]),
      // Stock Addition Breakdown (Purchased vs Initial vs Adjustment)
      db.query(`
        SELECT 
          CASE 
            WHEN reason ILIKE '%Purchase%' THEN 'Purchased'
            WHEN reason ILIKE '%Initial Stock%' THEN 'Initial Import'
            ELSE 'Manual Adjustment'
          END as source,
          SUM(ABS(st.quantity)) as total_qty,
          SUM(ABS(st.quantity) * COALESCE(sb.purchase_price, 0)) as total_value
        FROM stock_transactions st
        LEFT JOIN stock_batches sb ON st.batch_id = sb.id
        WHERE st.type = 'IN' AND st.transaction_date >= $1 AND st.transaction_date <= $2
        GROUP BY source
        ORDER BY total_value DESC`, [start, end])
    ]);

    res.json({
      lowStock: lowStock.rows,
      expiringSoon: expiringSoon.rows,
      valuation: parseFloat(valuation.rows[0].total_value) || 0,
      stockMovement: stockMovement.rows,
      itemProfitability: itemProfitability.rows,
      purchaseSummary: purchaseSummary.rows,
      additionBreakdown: stockAdditionBreakdown.rows
    });
  } catch (err) {
    console.error('STOCK REPORT ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch stock report' });
  }
});

// GET: Patient Reports
app.get('/api/reports/patients', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';

  try {
    const [
      newPatients,
      topPatients,
      genderStats,
      returningPatients,
      visitHistory
    ] = await Promise.all([
      // New Patients Registered
      db.query('SELECT COUNT(*) FROM patients WHERE created_at >= $1 AND created_at <= $2', [start, end]),
      // Top Patients by Spend
      db.query(`
        SELECT p.name, p.patient_code, COUNT(v.id) as visits, SUM(v.net_amount) as total_spent
        FROM vouchers v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        GROUP BY p.id, p.name, p.patient_code
        ORDER BY total_spent DESC
        LIMIT 10`, [start, end]),
      // Gender Breakdown
      db.query('SELECT gender, COUNT(*) FROM patients GROUP BY gender'),
      // Returning Patients
      db.query(`
        SELECT COUNT(DISTINCT v1.patient_id) as count
        FROM vouchers v1
        WHERE v1.created_at >= $1 AND v1.created_at <= $2
        AND EXISTS (
          SELECT 1 FROM vouchers v2 
          WHERE v2.patient_id = v1.patient_id 
          AND v2.created_at < $1
        )`, [start, end]),
      // Visit History Log
      db.query(`
        SELECT v.created_at as date, p.name as patient_name, p.patient_code, v.voucher_number, v.net_amount
        FROM vouchers v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        ORDER BY v.created_at DESC LIMIT 50`, [start, end])
    ]);

    res.json({
      newPatientsCount: parseInt(newPatients.rows[0].count) || 0,
      returningPatientsCount: parseInt(returningPatients.rows[0].count) || 0,
      topPatients: topPatients.rows,
      genderStats: genderStats.rows,
      visitHistory: visitHistory.rows
    });
  } catch (err) {
    console.error('PATIENT REPORT ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch patient report' });
  }
});

// GET: Stock Balance Report with accurate valuation
app.get('/api/reports/stock-balance', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        si.id, si.item_code, si.name, ic.name as category_name, isc.name as subcategory_name, si.unit, si.min_stock_level,
        COALESCE(SUM(sb.quantity), 0) as total_quantity,
        COALESCE(SUM(sb.quantity * sb.purchase_price), 0) as total_value,
        CASE 
          WHEN SUM(sb.quantity) > 0 THEN SUM(sb.quantity * sb.purchase_price) / SUM(sb.quantity)
          ELSE si.default_purchase_price 
        END as avg_cost
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      LEFT JOIN stock_batches sb ON si.id = sb.item_id
      WHERE si.is_active = true
      GROUP BY si.id, ic.name, isc.name, si.item_code, si.name, si.unit, si.min_stock_level
      ORDER BY ic.name, si.name
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('STOCK BALANCE REPORT API ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch stock balance report' });
  }
});

// GET: Appointment Reports
app.get('/api/reports/appointments', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';

  try {
    const [
      statusBreakdown,
      doctorWorkload,
      appointmentList
    ] = await Promise.all([
      // Status Breakdown
      db.query(`
        SELECT status, COUNT(*) 
        FROM appointments 
        WHERE appointment_date >= $1 AND appointment_date <= $2 AND is_active = true
        GROUP BY status`, [start, end]),
      // Doctor Workload
      db.query(`
        SELECT doc.name as physician_name, COUNT(a.id) as total_appointments
        FROM appointments a
        JOIN physicians doc ON a.physician_id = doc.id
        WHERE a.appointment_date >= $1 AND a.appointment_date <= $2 AND a.is_active = true
        GROUP BY doc.id, doc.name
        ORDER BY total_appointments DESC`, [start, end]),
      // Detailed List
      db.query(`
        SELECT a.appointment_date as date, p.name as patient_name, doc.name as physician_name, a.status, a.reason
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN physicians doc ON a.physician_id = doc.id
        WHERE a.appointment_date >= $1 AND a.appointment_date <= $2 AND a.is_active = true
        ORDER BY a.appointment_date ASC`, [start, end])
    ]);

    res.json({
      statusBreakdown: statusBreakdown.rows,
      doctorWorkload: doctorWorkload.rows,
      appointmentList: appointmentList.rows
    });
  } catch (err) {
    console.error('APPOINTMENT REPORT ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch appointment report' });
  }
});

// GET: Financial Reports
app.get('/api/reports/financial', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';

  try {
    const [
      revenue,
      purchaseCost,
      outstandingPurchases,
      paymentMethodStats,
      packageProfitability
    ] = await Promise.all([
      // Total Revenue
      db.query('SELECT SUM(net_amount) as total FROM vouchers WHERE created_at >= $1 AND created_at <= $2', [start, end]),
      // Total Purchase Cost (Approx based on default prices for simplicity)
      db.query(`
        SELECT SUM(vi.quantity * si.default_purchase_price) as total_cost
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        JOIN stock_items si ON vi.item_id = si.id
        WHERE v.created_at >= $1 AND v.created_at <= $2 AND vi.item_type = 'PHARMACY'`, [start, end]),
      // Outstanding Balance (Purchases)
      db.query('SELECT SUM(balance_amount) as total FROM purchases WHERE created_at >= $1 AND created_at <= $2', [start, end]),
      // Payment Method Stats
      db.query(`
        SELECT payment_method, COUNT(*) as count, SUM(net_amount) as total
        FROM vouchers
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY payment_method`, [start, end]),
      // Package Profitability
      db.query(`
        SELECT 
          gp.name, 
          COUNT(vi.id) as usage_count, 
          SUM(vi.subtotal) as total_revenue,
          gp.price as unit_price
        FROM voucher_items vi
        JOIN gp_packages gp ON vi.item_id = gp.id
        JOIN vouchers v ON vi.voucher_id = v.id
        WHERE vi.item_type = 'PACKAGE' AND v.created_at >= $1 AND v.created_at <= $2
        GROUP BY gp.id, gp.name, gp.price
        ORDER BY usage_count DESC`, [start, end])
    ]);

    res.json({
      totalRevenue: parseFloat(revenue.rows[0].total) || 0,
      totalPurchaseCost: parseFloat(purchaseCost.rows[0].total_cost) || 0,
      outstandingPurchases: parseFloat(outstandingPurchases.rows[0].total) || 0,
      paymentMethodStats: paymentMethodStats.rows,
      packageProfitability: packageProfitability.rows
    });
  } catch (err) {
    console.error('FINANCIAL REPORT ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch financial report' });
  }
});

// --- Reception Module Routes ---

// Patient Search
app.get('/api/reception/patients/search', authenticateToken, async (req, res) => {
  const { query } = req.query; // Search by name, phone_number, patient_code
  const { dob, age } = req.query;   // Search by date_of_birth exactly or age
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

    if (age) {
      baseSql += ` AND EXTRACT(YEAR FROM AGE(date_of_birth)) = $${paramIndex}`;
      params.push(parseInt(age));
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
app.get('/api/appointments', authenticateToken, async (req, res) => {
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
app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { patient_id, physician_id, appointment_date, reason } = req.body;
  if (!patient_id || !physician_id || !appointment_date) {
    return res.status(400).json({ error: 'Missing required appointment fields' });
  }

  try {
    const query = `
      INSERT INTO appointments (patient_id, physician_id, appointment_date, reason, status, created_by)
      VALUES ($1, $2, $3, $4, 'Scheduled', $5)
      RETURNING *;
    `;
    const values = [patient_id, physician_id, appointment_date, reason || '', req.user.id];
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('APPOINTMENT BOOK ERROR:', err);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// PUT: Update Appointment Status
app.put('/api/appointments/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const query = `
      UPDATE appointments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id = $3 AND is_active = true
      RETURNING *;
    `;
    const result = await db.query(query, [status, req.user.id, id]);
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
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      UPDATE appointments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 AND is_active = true
      RETURNING id;
    `;
    const result = await db.query(query, [req.user.id, id]);
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

// GET: Export Stock Items to CSV
app.get('/api/stock/items/export', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        si.item_code, si.name, ic.name as category, isc.name as subcategory,
        si.unit, si.min_stock_level, si.default_purchase_price, si.default_sale_price,
        COALESCE((SELECT SUM(sb.quantity) FROM stock_batches sb WHERE sb.item_id = si.id), 0) as current_stock
      FROM stock_items si
      LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
      LEFT JOIN item_categories ic ON isc.category_id = ic.id
      WHERE si.is_active = true
      ORDER BY ic.name, isc.name, si.name
    `;
    const result = await db.query(query);
    
    let csvData = 'Item Code,Name,Category,Subcategory,Unit,Min Stock Level,Purchase Price,Sale Price,Current Stock\n';
    result.rows.forEach(row => {
      const name = `"${row.name || ''}"`;
      const cat = `"${row.category || ''}"`;
      const subcat = `"${row.subcategory || ''}"`;
      
      csvData += `${row.item_code || ''},${name},${cat},${subcat},${row.unit || ''},${row.min_stock_level || 0},${row.default_purchase_price || 0},${row.default_sale_price || 0},${row.current_stock || 0}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('stock_items.csv');
    res.send(csvData);
  } catch (err) {
    console.error('CSV Export error:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET: Sample CSV for Stock Items Import
app.get('/api/stock/items/sample', authenticateToken, (req, res) => {
  const csvData = 'Item Code,Name,Category,Subcategory,Unit,Min Stock Level,Purchase Price,Sale Price,Current Stock,Batch Number,Expiry Date\n' +
    'ITM-001,Paracetamol 500mg,Pharmacy,General Pharmacy,Tab,100,5.00,8.00,500,BAT-001,2027-12-31\n' +
    'ITM-002,Bandages,LABORATORY TEST,Wound Care,Pack,50,10.00,15.00,100,BAT-002,2028-06-30\n';

  res.header('Content-Type', 'text/csv');
  res.attachment('sample_stock_items.csv');
  res.send(csvData);
});

// POST: Import Stock Items from CSV
app.post('/api/stock/items/import', authenticateToken, upload.single('file'), (req, res) => {
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

      const client = await db.pool.connect();

      try {
        await client.query('BEGIN');

        for (const row of results) {
          const itemCode = row['Item Code'];
          const itemName = row['Name'];
          const categoryName = row['Category'] ? row['Category'].toUpperCase().trim() : '';
          const subcategoryName = row['Subcategory'];
          const unit = row['Unit'] || 'Unit';
          const minStockLevel = parseInt(row['Min Stock Level']) || 0;
          const purchasePrice = parseFloat(row['Purchase Price']) || 0;
          const salePrice = parseFloat(row['Sale Price']) || 0;

          // Current/Initial stock data
          const initialStock = parseInt(row['Current Stock'] || row['Initial Stock']) || 0;
          const batchNumber = row['Batch Number'] || 'INITIAL-STOCK';
          const expiryDate = row['Expiry Date'] || null;

          if (!itemCode || !itemName || !categoryName || !subcategoryName) {
            errorCount++;
            continue;
          }

          // 1. Resolve Category
          let categoryId;
          const catRes = await client.query('SELECT id FROM item_categories WHERE name = $1 AND is_active = true', [categoryName]);
          if (catRes.rows.length > 0) {
            categoryId = catRes.rows[0].id;
          } else {
            const newCat = await client.query('INSERT INTO item_categories (name, description) VALUES ($1, $2) RETURNING id', [categoryName, 'Imported from CSV']);
            categoryId = newCat.rows[0].id;
          }

          // 2. Resolve Subcategory
          let subcategoryId;
          const subcatRes = await client.query('SELECT id FROM item_subcategories WHERE name = $1 AND category_id = $2 AND is_active = true', [subcategoryName, categoryId]);
          if (subcatRes.rows.length > 0) {
            subcategoryId = subcatRes.rows[0].id;
          } else {
            const newSubcat = await client.query('INSERT INTO item_subcategories (name, category_id) VALUES ($1, $2) RETURNING id', [subcategoryName, categoryId]);
            subcategoryId = newSubcat.rows[0].id;
          }

          // 3. Upsert Stock Item
          let itemId;
          const existingItem = await client.query('SELECT id FROM stock_items WHERE item_code = $1', [itemCode]);
          if (existingItem.rows.length > 0) {
             itemId = existingItem.rows[0].id;
             // Update
             await client.query(`
                UPDATE stock_items 
                SET name = $1, subcategory_id = $2, unit = $3, min_stock_level = $4,
                    default_purchase_price = $5, default_sale_price = $6, updated_at = CURRENT_TIMESTAMP, updated_by = $7, is_active = true
                WHERE item_code = $8
             `, [itemName, subcategoryId, unit, minStockLevel, purchasePrice, salePrice, req.user.id, itemCode]);
          } else {
             // Insert
             const insertRes = await client.query(`
                INSERT INTO stock_items (item_code, name, subcategory_id, unit, min_stock_level, default_purchase_price, default_sale_price, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
             `, [itemCode, itemName, subcategoryId, unit, minStockLevel, purchasePrice, salePrice, req.user.id]);
             itemId = insertRes.rows[0].id;
          }

          // 4. Handle Initial Stock
          if (initialStock > 0) {
             // Create stock batch
             const batchRes = await client.query(`
                INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
             `, [itemId, batchNumber, expiryDate, initialStock, purchasePrice, salePrice, req.user.id]);
             
             const batchId = batchRes.rows[0].id;

             // Log transaction
             await client.query(`
                INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by)
                VALUES ($1, $2, 'IN', $3, 'Import Initial Stock', $4)
             `, [itemId, batchId, initialStock, req.user.id]);
          }

          successCount++;
        }
        await client.query('COMMIT');
        res.json({ message: 'Import completed', success: successCount, failed: errorCount });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Import process error:', err);
        res.status(500).json({ error: 'Import failed during processing' });
      } finally {
        client.release();
      }
    });
});

// List all stock items with current aggregate quantity
app.get('/api/stock/items', authenticateToken, async (req, res) => {
  const { subcategory_id, category_id, search } = req.query; 
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

    if (search) {
      whereClause += ` AND (si.name ILIKE $${paramIndex} OR si.item_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
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
      LEFT JOIN stock_batches sb ON si.id = sb.item_id
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
app.post('/api/stock/items', authenticateToken, async (req, res) => {
  const { 
    subcategory_id, item_code, name, unit, min_stock_level,
    default_purchase_price, default_sale_price, pricing_method, markup_percentage 
  } = req.body;
  
  try {
    const query = `
      INSERT INTO stock_items (
        subcategory_id, item_code, name, unit, min_stock_level,
        default_purchase_price, default_sale_price, pricing_method, markup_percentage, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const result = await db.query(query, [
      subcategory_id, item_code, name, unit, min_stock_level || 0,
      default_purchase_price || 0, default_sale_price || 0, 
      pricing_method || 'MANUAL', markup_percentage || 0, req.user.id
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/test-put', (req, res) => {
  res.json({ message: 'test-put hit' });
});

// Update stock item
app.put('/api/stock/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log(`PUT /api/stock/items/${id} hit at ${new Date().toISOString()}`);
  const { 
    subcategory_id, item_code, name, unit, min_stock_level,
    default_purchase_price, default_sale_price, pricing_method, markup_percentage
  } = req.body;
  try {
    const query = `
      UPDATE stock_items
      SET subcategory_id = $1, item_code = $2, name = $3, unit = $4, min_stock_level = $5,
          default_purchase_price = $6, default_sale_price = $7, pricing_method = $8, markup_percentage = $9,
          updated_at = CURRENT_TIMESTAMP, updated_by = $10
      WHERE id = $11 AND is_active = true
      RETURNING *;
    `;
    const result = await db.query(query, [
      subcategory_id, item_code, name, unit, min_stock_level || 0,
      default_purchase_price || 0, default_sale_price || 0,
      pricing_method || 'MANUAL', markup_percentage || 0,
      req.user.id, id
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete stock item (soft delete)
app.delete('/api/stock/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      UPDATE stock_items
      SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 AND is_active = true
      RETURNING id;
    `;
    const result = await db.query(query, [req.user.id, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET: All batches for a specific item (for management/editing)
app.get('/api/stock/batches/:itemId', authenticateToken, async (req, res) => {
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
app.post('/api/stock/purchase', authenticateToken, async (req, res) => {
  const { item_id, batch_number, expiry_date, quantity, purchase_price, sale_price } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Create the batch
    const batchQuery = `
      INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const batchRes = await client.query(batchQuery, [item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, req.user.id]);
    const batchId = batchRes.rows[0].id;

    // 2. Log transaction
    await client.query(
      'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [item_id, batchId, 'IN', quantity, 'Purchase Entry', req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Stock received', batch_id: batchId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to add stock' });
  } finally {
    client.release();
  }
});

// FEFO Sale Implementation
app.post('/api/stock/sell', authenticateToken, async (req, res) => {
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
      await db.query('UPDATE stock_batches SET quantity = quantity - $1, updated_by = $2 WHERE id = $3', [takeFromThisBatch, req.user.id, batch.id]);
      
      // Log transaction
      await db.query(
        'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [item_id, batch.id, 'OUT', -takeFromThisBatch, reason || 'Sale', req.user.id]
      );

      remainingToSell -= takeFromThisBatch;
    }

    res.json({ message: 'Stock deducted using FEFO' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sale transaction failed' });
  }
});

// Manual Stock Adjustment
app.post('/api/stock/adjust', authenticateToken, async (req, res) => {
  const { item_id, adjustment_qty, reason, type } = req.body; // type: 'ADJUST'
  if (!item_id || !adjustment_qty) return res.status(400).json({ error: 'Invalid data' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const qty = parseInt(adjustment_qty);

    if (qty > 0) {
      // Increase: Create a dummy batch for adjustment (or add to latest)
      const batchRes = await client.query(`
        INSERT INTO stock_batches (item_id, batch_number, quantity, purchase_price, sale_price, created_by)
        VALUES ($1, $2, $3, (SELECT default_purchase_price FROM stock_items WHERE id = $1), (SELECT default_sale_price FROM stock_items WHERE id = $1), $4)
        RETURNING id
      `, [item_id, 'ADJ-' + Date.now(), qty, req.user.id]);
      
      await client.query(
        'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [item_id, batchRes.rows[0].id, 'ADJUST', qty, reason || 'Manual Correction (+)', req.user.id]
      );
    } else {
      // Decrease: Use FEFO logic to deduct
      const batchesRes = await client.query(
        'SELECT * FROM stock_batches WHERE item_id = $1 AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST',
        [item_id]
      );

      let remainingToDeduct = Math.abs(qty);
      for (const batch of batchesRes.rows) {
        if (remainingToDeduct <= 0) break;
        const takeFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
        await client.query('UPDATE stock_batches SET quantity = quantity - $1, updated_by = $2 WHERE id = $3', [takeFromThisBatch, req.user.id, batch.id]);
        await client.query(
          'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
          [item_id, batch.id, 'ADJUST', -takeFromThisBatch, reason || 'Manual Correction (-)', req.user.id]
        );
        remainingToDeduct -= takeFromThisBatch;
      }
      
      if (remainingToDeduct > 0) {
        throw new Error('Not enough stock to deduct requested amount');
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Stock adjusted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Adjustment failed' });
  } finally {
    client.release();
  }
});

// --- Pricing Module Routes ---

// GET: All items with pricing info
app.get('/api/pricing/items', authenticateToken, async (req, res) => {
  const { category_id, subcategory_id, search } = req.query;
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

    if (search) {
      whereClause += ` AND (si.name ILIKE $${paramIndex} OR si.item_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
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
app.put('/api/pricing/items/:id', authenticateToken, async (req, res) => {
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
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $5
      WHERE id = $6 AND is_active = true
      RETURNING *;
    `;
    const values = [default_purchase_price || 0, default_sale_price || 0, pricing_method, markup_percentage || 0, req.user.id, id];
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
app.get('/api/pricing/export', authenticateToken, async (req, res) => {
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
app.post('/api/pricing/import', authenticateToken, upload.single('file'), (req, res) => {
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
              updated_at = CURRENT_TIMESTAMP,
              updated_by = $5
            WHERE item_code = $6 AND is_active = true
            RETURNING id
          `, [purchasePrice, salePrice, pricingMethod, markup, req.user.id, itemCode]);
          
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
app.get('/api/pricing/sample', authenticateToken, (req, res) => {
  const csvData = 'Item Code,Item Name,Category,Subcategory,Purchase Price,Sale Price,Pricing Method,Markup Percentage\n' +
    'ITM001,Example Medicine,PHARMACY,General Pharmacy,10.00,12.00,MARKUP_PERCENT,20\n' +
    'ITM002,Another Item,LABORATORY TEST,Consumables,50.00,65.00,MANUAL,0\n';
  
  res.header('Content-Type', 'text/csv');
  res.attachment('sample_stock_pricing.csv');
  res.send(csvData);
});

// --- GP Package Module Routes ---

// GET: All packages with their items
app.get('/api/gp-packages', authenticateToken, async (req, res) => {
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
app.post('/api/gp-packages', authenticateToken, async (req, res) => {
  const { name, price, items } = req.body; // items is an array of { item_id, quantity }
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const pkgRes = await client.query(
      'INSERT INTO gp_packages (name, price, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, price, req.user.id]
    );
    const newPkg = pkgRes.rows[0];

    if (items && Array.isArray(items)) {
      for (let item of items) {
        await client.query(
          'INSERT INTO gp_package_items (package_id, item_id, quantity, created_by) VALUES ($1, $2, $3, $4)',
          [newPkg.id, item.item_id, item.quantity, req.user.id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newPkg);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('GP Packages POST error:', err);
    res.status(500).json({ error: 'Failed to create GP package' });
  } finally {
    client.release();
  }
});

// PUT: Update an existing GP package
app.put('/api/gp-packages/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, price, items } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE gp_packages SET name = $1, price = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3 WHERE id = $4',
      [name, price, req.user.id, id]
    );

    // Simplest approach: Delete old items and insert new ones
    await client.query('DELETE FROM gp_package_items WHERE package_id = $1', [id]);

    if (items && Array.isArray(items)) {
      for (let item of items) {
        await client.query(
          'INSERT INTO gp_package_items (package_id, item_id, quantity, created_by) VALUES ($1, $2, $3, $4)',
          [id, item.item_id, item.quantity, req.user.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Package updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('GP Packages PUT error:', err);
    res.status(500).json({ error: 'Failed to update GP package' });
  } finally {
    client.release();
  }
});

// DELETE: Soft delete a GP package
app.delete('/api/gp-packages/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE gp_packages SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2', [req.user.id, id]);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    console.error('GP Packages DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete GP package' });
  }
});

// --- Billing & Voucher Module Routes ---

// Helper for stock deduction (FEFO)
const deductStock = async (client, itemId, quantityToDeduct, reason, userId, customDate = null) => {
  // 1. Check total stock
  const stockRes = await client.query('SELECT SUM(quantity) as total FROM stock_batches WHERE item_id = $1', [itemId]);
  const totalAvailable = parseInt(stockRes.rows[0].total) || 0;
  
  if (totalAvailable < quantityToDeduct) {
    console.warn(`[WARNING] Insufficient stock for item ID ${itemId}. Requested: ${quantityToDeduct}, Available: ${totalAvailable}. Proceeding to oversell.`);
  }

  // 2. FEFO: Get batches ordered by expiry date that have positive quantity
  const batchesRes = await client.query(
    'SELECT * FROM stock_batches WHERE item_id = $1 AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST',
    [itemId]
  );

  let remainingToDeduct = parseInt(quantityToDeduct);

  // Deduct from available batches
  for (const batch of batchesRes.rows) {
    if (remainingToDeduct <= 0) break;

    const takeFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
    
    await client.query('UPDATE stock_batches SET quantity = quantity - $1, updated_by = $2 WHERE id = $3', [takeFromThisBatch, userId, batch.id]);
    
    await client.query(`
      INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by${customDate ? ', transaction_date' : ''})
      VALUES ($1, $2, $3, $4, $5, $6${customDate ? ', $7' : ''})
    `, customDate
       ? [itemId, batch.id, 'OUT', -takeFromThisBatch, reason, userId, customDate]
       : [itemId, batch.id, 'OUT', -takeFromThisBatch, reason, userId]
    );

    remainingToDeduct -= takeFromThisBatch;
  }

  // 3. Handle oversold quantity
  if (remainingToDeduct > 0) {
    // Create or update a dummy batch for oversold items to keep track of negative stock
    const overSRes = await client.query(`
      INSERT INTO stock_batches (item_id, batch_number, quantity, purchase_price, sale_price, created_by)
      VALUES ($1, 'OVERSOLD', $2, (SELECT default_purchase_price FROM stock_items WHERE id = $1), (SELECT default_sale_price FROM stock_items WHERE id = $1), $3)
      RETURNING id
    `, [itemId, -remainingToDeduct, userId]);

    const oversoldBatchId = overSRes.rows[0].id;

    await client.query(`
      INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by${customDate ? ', transaction_date' : ''})
      VALUES ($1, $2, $3, $4, $5, $6${customDate ? ', $7' : ''})
    `, customDate
       ? [itemId, oversoldBatchId, 'OUT', -remainingToDeduct, reason, userId, customDate]
       : [itemId, oversoldBatchId, 'OUT', -remainingToDeduct, reason, userId]
    );
  }
};

// GET: All vouchers (paginated)
app.get('/api/billing/vouchers', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { voucherno, fromdate, todate, patientcode, patientname, physician } = req.query;

  try {
    let whereClauses = [];
    let queryParams = [];

    if (voucherno) {
      queryParams.push(`%${voucherno}%`);
      whereClauses.push(`v.voucher_number ILIKE $${queryParams.length}`);
    }
    if (fromdate) {
      queryParams.push(fromdate);
      whereClauses.push(`v.created_at >= $${queryParams.length}`);
    }
    if (todate) {
      queryParams.push(`${todate} 23:59:59`);
      whereClauses.push(`v.created_at <= $${queryParams.length}`);
    }
    if (patientcode) {
      queryParams.push(`%${patientcode}%`);
      whereClauses.push(`p.patient_code ILIKE $${queryParams.length}`);
    }
    if (patientname) {
      queryParams.push(`%${patientname}%`);
      whereClauses.push(`p.name ILIKE $${queryParams.length}`);
    }
    if (physician) {
      queryParams.push(`%${physician}%`);
      whereClauses.push(`doc.name ILIKE $${queryParams.length}`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`
      SELECT COUNT(*) 
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN physicians doc ON v.physician_id = doc.id
      ${whereString}
    `, queryParams);
    const total = parseInt(countRes.rows[0].count);

    const dataParams = [...queryParams, limit, offset];
    const result = await db.query(`
      SELECT v.*, p.name as patient_name, p.patient_code, 
             CAST(EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS INTEGER) as patient_age,
             doc.name as physician_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN physicians doc ON v.physician_id = doc.id
      ${whereString}
      ORDER BY v.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `, dataParams);

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
app.get('/api/billing/vouchers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const voucherRes = await db.query(`
      SELECT v.*, p.name as patient_name, p.patient_code, p.phone_number as patient_phone, doc.name as physician_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN physicians doc ON v.physician_id = doc.id
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

// GET: All investigations for a specific laboratory
app.get('/api/laboratories/:id/investigations', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT vi.*, v.voucher_number, v.created_at as voucher_date, p.name as patient_name, p.patient_code, l.name as laboratory_name
      FROM voucher_items vi
      JOIN vouchers v ON vi.voucher_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN laboratories l ON vi.laboratory_id = l.id
      WHERE vi.item_type = 'INVESTIGATION' AND vi.laboratory_id = $1
      ORDER BY v.created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch laboratory investigations' });
  }
});

// GET: All investigations (with lab filtering)
app.get('/api/investigations', authenticateToken, async (req, res) => {
  const { laboratory_id, status } = req.query;
  try {
    let query = `
      SELECT vi.*, v.voucher_number, v.created_at as voucher_date, p.name as patient_name, p.patient_code, l.name as laboratory_name
      FROM voucher_items vi
      JOIN vouchers v ON vi.voucher_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN laboratories l ON vi.laboratory_id = l.id
      WHERE vi.item_type = 'INVESTIGATION'
    `;
    const params = [];
    if (laboratory_id) {
      params.push(laboratory_id);
      query += ` AND vi.laboratory_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND vi.status = $${params.length}`;
    }
    query += ` ORDER BY v.created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch investigations' });
  }
});

// PUT: Batch update investigation status
app.put('/api/investigations/batch/status', authenticateToken, async (req, res) => {
  console.log('HIT: Batch update status');
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  try {
    const query = `
      UPDATE voucher_items
      SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id = ANY($3::int[])
      RETURNING *
    `;
    const result = await db.query(query, [status, req.user.id, ids]);
    res.json(result.rows);
  } catch (err) {
    console.error('BATCH UPDATE ERROR:', err);
    res.status(500).json({ error: 'Failed to batch update status' });
  }
});

// PUT: Update investigation status
app.put('/api/investigations/:id/status', authenticateToken, async (req, res) => {
  console.log('HIT: Single update status, id:', req.params.id);
  const { id } = req.params;
  const { status } = req.body;
  try {
    const query = `
      UPDATE voucher_items
      SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(query, [status, req.user.id, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('SINGLE UPDATE ERROR:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});
// --- Laboratory Specific Test Pricing ---

// GET: All investigation items with their pricing for a specific lab
app.get('/api/laboratories/:id/test-pricing', authenticateToken, async (req, res) => {
  const labId = req.params.id;
  try {
    const query = `
      SELECT si.id as item_id, si.name, si.item_code,
             COALESCE(ltp.purchase_price, si.default_purchase_price) as purchase_price,
             COALESCE(ltp.commission_percentage, 0.00) as commission_percentage,
             ltp.id as pricing_id
      FROM stock_items si
      JOIN item_subcategories isc ON si.subcategory_id = isc.id
      JOIN item_categories ic ON isc.category_id = ic.id
      LEFT JOIN laboratory_test_pricing ltp ON si.id = ltp.item_id AND ltp.laboratory_id = $1
      WHERE ic.name ILIKE '%Laboratory Test%' AND si.is_active = true
      ORDER BY si.name ASC
    `;
    const result = await db.query(query, [labId]);
    res.json(result.rows);
  } catch (err) {
    console.error('FETCH LAB TEST PRICING ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch laboratory test pricing' });
  }
});

// POST: Update specific test pricing for a lab
app.post('/api/laboratories/:id/test-pricing', authenticateToken, async (req, res) => {
  const labId = req.params.id;
  const { item_id, purchase_price, commission_percentage } = req.body;
  
  try {
    const query = `
      INSERT INTO laboratory_test_pricing (laboratory_id, item_id, purchase_price, commission_percentage, updated_at, created_by)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
      ON CONFLICT (laboratory_id, item_id) 
      DO UPDATE SET 
        purchase_price = EXCLUDED.purchase_price,
        commission_percentage = EXCLUDED.commission_percentage,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $5
      RETURNING *;
    `;
    const result = await db.query(query, [labId, item_id, purchase_price, commission_percentage, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('UPDATE LAB TEST PRICING ERROR:', err);
    res.status(500).json({ error: 'Failed to update laboratory test pricing' });
  }
});

// GET: Laboratory Payments (Investigations filtered by lab, status, and date)
app.get('/api/lab-payments', authenticateToken, async (req, res) => {
  const { laboratory_id, payment_status, from_date, to_date } = req.query;
  
  let query = `
    SELECT vi.id, vi.name, vi.quantity, vi.unit_price, vi.subtotal, 
           vi.lab_payment_status, vi.lab_paid_at,
           v.voucher_number, v.created_at as voucher_date,
           p.name as patient_name, l.name as laboratory_name,
           COALESCE(ltp.purchase_price, vi.lab_cost_price) as lab_cost_price,
           COALESCE(ltp.commission_percentage, vi.lab_commission_pct) as lab_commission_pct
    FROM voucher_items vi
    JOIN vouchers v ON vi.voucher_id = v.id
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN laboratories l ON vi.laboratory_id = l.id
    LEFT JOIN laboratory_test_pricing ltp ON vi.item_id = ltp.item_id AND vi.laboratory_id = ltp.laboratory_id
    WHERE vi.item_type = 'INVESTIGATION'
  `;
  const params = [];

  if (laboratory_id) {
    params.push(laboratory_id);
    query += ` AND vi.laboratory_id = $${params.length}`;
  }
  if (payment_status) {
    params.push(payment_status);
    query += ` AND vi.lab_payment_status = $${params.length}`;
  }
  if (from_date) {
    params.push(from_date);
    query += ` AND v.created_at >= $${params.length}`;
  }
  if (to_date) {
    params.push(to_date + ' 23:59:59');
    query += ` AND v.created_at <= $${params.length}`;
  }

  query += ` ORDER BY v.created_at DESC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('FETCH LAB PAYMENTS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch lab payments' });
  }
});

// POST: Bulk pay laboratories
app.post('/api/lab-payments/bulk-pay', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No investigation IDs provided' });
  }

  try {
    await db.query(`
      UPDATE voucher_items 
      SET lab_payment_status = 'Paid', lab_paid_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = ANY($2::int[])
    `, [req.user.id, ids]);
    res.json({ message: `${ids.length} investigations marked as paid to lab` });
  } catch (err) {
    console.error('BULK LAB PAY ERROR:', err);
    res.status(500).json({ error: 'Failed to process bulk lab payment' });
  }
});

// POST: Upload investigation result
app.post('/api/investigations/:id/upload', authenticateToken, s3Upload.single('file'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const fileName = await uploadToS3(req.file);
    const query = `
      UPDATE voucher_items 
      SET result_file_path = $1, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id = $3 
      RETURNING *
    `;
    const result = await db.query(query, [fileName, req.user.id, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('S3 UPLOAD ERROR:', err);
    res.status(500).json({ error: 'Failed to upload result to S3' });
  }
});

// POST: Create Voucher
app.post('/api/billing/vouchers', authenticateToken, async (req, res) => {
  const { 
    patient_id, physician_id, items, referrals, 
    total_amount, discount_amount, net_amount, 
    payment_method, notes, tca_date, created_at
  } = req.body;

  // Generate Voucher Number: VOU-YYMMDD-RAND (using selected created_at date if provided)
  const dateObj = created_at ? new Date(created_at) : new Date();
  const datePart = dateObj.toISOString().slice(2, 10).replace(/-/g, '');
  const randPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const voucher_number = `VOU-${datePart}-${randPart}`;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert Voucher
    let insertQuery = `
      INSERT INTO vouchers (voucher_number, patient_id, physician_id, total_amount, discount_amount, net_amount, payment_method, notes, tca_date, created_by${created_at ? ', created_at' : ''})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10${created_at ? ', $11' : ''})
      RETURNING id
    `;
    const queryParams = [voucher_number, patient_id, physician_id || null, total_amount, discount_amount, net_amount, payment_method, notes, tca_date || null, req.user.id];
    if (created_at) {
      queryParams.push(created_at);
    }
    const vRes = await client.query(insertQuery, queryParams);
    const voucherId = vRes.rows[0].id;

    // 2. Insert Items & Deduct Stock
    for (const item of items) {
      let labCostPrice = item.lab_cost_price || 0;
      let labCommissionPct = item.lab_commission_pct || 0;
      let labPaymentStatus = 'N/A';

      if (item.item_type === 'INVESTIGATION') {
        labPaymentStatus = 'Pending';
        
        // If cost or commission not provided by frontend, fetch from DB
        if (labCostPrice === 0 || labCommissionPct === 0) {
           if (item.laboratory_id) {
              // Try to find specific pricing for this lab and test
              const specificRes = await client.query(
                'SELECT purchase_price, commission_percentage FROM laboratory_test_pricing WHERE laboratory_id = $1 AND item_id = $2',
                [item.laboratory_id, item.item_id]
              );
              
              if (specificRes.rows.length > 0) {
                if (labCostPrice === 0) labCostPrice = parseFloat(specificRes.rows[0].purchase_price);
                if (labCommissionPct === 0) labCommissionPct = parseFloat(specificRes.rows[0].commission_percentage);
              } else {
                // Use default item purchase price and lab default commission
                const itemRes = await client.query('SELECT default_purchase_price FROM stock_items WHERE id = $1', [item.item_id]);
                const labRes = await client.query('SELECT commission_percentage FROM laboratories WHERE id = $1', [item.laboratory_id]);
                
                if (labCostPrice === 0 && itemRes.rows.length > 0) labCostPrice = parseFloat(itemRes.rows[0].default_purchase_price);
                if (labCommissionPct === 0 && labRes.rows.length > 0) labCommissionPct = parseFloat(labRes.rows[0].commission_percentage);
              }
           } else {
             // No lab selected, just use default item price
             const itemRes = await client.query('SELECT default_purchase_price FROM stock_items WHERE id = $1', [item.item_id]);
             if (labCostPrice === 0 && itemRes.rows.length > 0) labCostPrice = parseFloat(itemRes.rows[0].default_purchase_price);
           }
        }
      }

      await client.query(`
        INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal, laboratory_id, lab_cost_price, lab_commission_pct, lab_payment_status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [voucherId, item.item_type, item.item_id, item.name, item.quantity, item.unit_price, item.subtotal, item.laboratory_id || null, labCostPrice, labCommissionPct, labPaymentStatus, req.user.id]);

      if (item.item_type === 'PHARMACY') {
        await deductStock(client, item.item_id, item.quantity, `Voucher sale ${voucher_number}`, req.user.id, created_at);
      } else if (item.item_type === 'PACKAGE') {
        // Find package components
        const pkgItems = await client.query('SELECT * FROM gp_package_items WHERE package_id = $1 AND is_active = true', [item.item_id]);
        for (const pi of pkgItems.rows) {
          const totalQty = pi.quantity * item.quantity;
          await deductStock(client, pi.item_id, totalQty, `Voucher Package ${item.name} (${voucher_number})`, req.user.id, created_at);
        }
      }
    }

    // 3. Insert Referrals
    if (referrals && Array.isArray(referrals)) {
      for (const ref of referrals) {
        await client.query(`
          INSERT INTO voucher_referrals (voucher_id, referred_person_id, referral_type, percentage, amount, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [voucherId, ref.referred_person_id, ref.referral_type, ref.percentage, ref.amount, req.user.id]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: voucherId, voucher_number });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('VOUCHER CREATE ERROR:', err);
    res.status(500).json({ error: 'Failed to create voucher', details: err.message });
  } finally {
    client.release();
  }
});

// PUT: Update Voucher (Editing)
app.put('/api/billing/vouchers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    patient_id, physician_id, items, referrals,
    total_amount, discount_amount, net_amount,
    payment_method, notes, tca_date, created_at
  } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch existing voucher to verify and get voucher_number and creation date
    const vRes = await client.query('SELECT voucher_number, created_at FROM vouchers WHERE id = $1', [id]);
    if (vRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Voucher not found' });
    }
    const { voucher_number, created_at: existing_created_at } = vRes.rows[0];
    const finalVoucherDate = created_at || existing_created_at;

    // 2. Revert previous stock deductions for this voucher
    // Find all stock transactions related to this voucher
    const transactionsRes = await client.query(`
      SELECT * FROM stock_transactions 
      WHERE reason = $1 OR reason LIKE '%(' || $2 || ')'
    `, [`Voucher sale ${voucher_number}`, voucher_number]);

    for (const st of transactionsRes.rows) {
      if (st.batch_id) {
        // Add quantity back to the batch (subtracting a negative quantity adds it back)
        await client.query(`
          UPDATE stock_batches 
          SET quantity = quantity - $1, updated_by = $2 
          WHERE id = $3
        `, [st.quantity, req.user.id, st.batch_id]);
      }
    }

    // Delete those stock transactions
    await client.query(`
      DELETE FROM stock_transactions 
      WHERE reason = $1 OR reason LIKE '%(' || $2 || ')'
    `, [`Voucher sale ${voucher_number}`, voucher_number]);

    // Clean up empty OVERSOLD batches
    await client.query(`
      DELETE FROM stock_batches 
      WHERE batch_number = 'OVERSOLD' AND quantity = 0
    `);

    // 3. Delete existing voucher items and referrals
    await client.query('DELETE FROM voucher_items WHERE voucher_id = $1', [id]);
    await client.query('DELETE FROM voucher_referrals WHERE voucher_id = $1', [id]);

    // 4. Update core Voucher details
    await client.query(`
      UPDATE vouchers
      SET patient_id = $1, physician_id = $2, total_amount = $3, discount_amount = $4,
          net_amount = $5, payment_method = $6, notes = $7, tca_date = $8,
          created_at = COALESCE($9, created_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
    `, [patient_id, physician_id || null, total_amount, discount_amount, net_amount, payment_method, notes, tca_date || null, created_at || null, id]);

    // 5. Insert new items and deduct stock
    for (const item of items) {
      let labCostPrice = item.lab_cost_price || 0;
      let labCommissionPct = item.lab_commission_pct || 0;
      let labPaymentStatus = 'N/A';

      if (item.item_type === 'INVESTIGATION') {
        labPaymentStatus = 'Pending';
        
        if (labCostPrice === 0 || labCommissionPct === 0) {
           if (item.laboratory_id) {
              const specificRes = await client.query(
                'SELECT purchase_price, commission_percentage FROM laboratory_test_pricing WHERE laboratory_id = $1 AND item_id = $2',
                [item.laboratory_id, item.item_id]
              );
              
              if (specificRes.rows.length > 0) {
                if (labCostPrice === 0) labCostPrice = parseFloat(specificRes.rows[0].purchase_price);
                if (labCommissionPct === 0) labCommissionPct = parseFloat(specificRes.rows[0].commission_percentage);
              } else {
                const itemRes = await client.query('SELECT default_purchase_price FROM stock_items WHERE id = $1', [item.item_id]);
                const labRes = await client.query('SELECT commission_percentage FROM laboratories WHERE id = $1', [item.laboratory_id]);
                
                if (labCostPrice === 0 && itemRes.rows.length > 0) labCostPrice = parseFloat(itemRes.rows[0].default_purchase_price);
                if (labCommissionPct === 0 && labRes.rows.length > 0) labCommissionPct = parseFloat(labRes.rows[0].commission_percentage);
              }
           } else {
             const itemRes = await client.query('SELECT default_purchase_price FROM stock_items WHERE id = $1', [item.item_id]);
             if (labCostPrice === 0 && itemRes.rows.length > 0) labCostPrice = parseFloat(itemRes.rows[0].default_purchase_price);
           }
        }
      }

      await client.query(`
        INSERT INTO voucher_items (voucher_id, item_type, item_id, name, quantity, unit_price, subtotal, laboratory_id, lab_cost_price, lab_commission_pct, lab_payment_status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [id, item.item_type, item.item_id, item.name, item.quantity, item.unit_price, item.subtotal, item.laboratory_id || null, labCostPrice, labCommissionPct, labPaymentStatus, req.user.id]);

      if (item.item_type === 'PHARMACY') {
        await deductStock(client, item.item_id, item.quantity, `Voucher sale ${voucher_number}`, req.user.id, finalVoucherDate);
      } else if (item.item_type === 'PACKAGE') {
        const pkgItems = await client.query('SELECT * FROM gp_package_items WHERE package_id = $1 AND is_active = true', [item.item_id]);
        for (const pi of pkgItems.rows) {
          const totalQty = pi.quantity * item.quantity;
          await deductStock(client, pi.item_id, totalQty, `Voucher Package ${item.name} (${voucher_number})`, req.user.id, finalVoucherDate);
        }
      }
    }

    // 6. Insert Referrals
    if (referrals && Array.isArray(referrals)) {
      for (const ref of referrals) {
        await client.query(`
          INSERT INTO voucher_referrals (voucher_id, referred_person_id, referral_type, percentage, amount, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, ref.referred_person_id, ref.referral_type, ref.percentage, ref.amount, req.user.id]);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Voucher updated successfully', id, voucher_number });
    } catch (err) {
    await client.query('ROLLBACK');
    console.error('VOUCHER EDIT ERROR:', err);
    res.status(500).json({ error: 'Failed to update voucher', details: err.message });
    } finally {
    client.release();
    }
    });

    // DELETE: Delete/Void Voucher
    app.delete('/api/billing/vouchers/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();

    try {
    await client.query('BEGIN');

    // 1. Fetch existing voucher to verify and get voucher_number
    const vRes = await client.query('SELECT voucher_number FROM vouchers WHERE id = $1', [id]);
    if (vRes.rows.length === 0) {
     await client.query('ROLLBACK');
     return res.status(404).json({ error: 'Voucher not found' });
    }
    const { voucher_number } = vRes.rows[0];

    // 2. Revert stock deductions for this voucher
    const transactionsRes = await client.query(`
     SELECT * FROM stock_transactions 
     WHERE reason = $1 OR reason LIKE '%(' || $2 || ')'
    `, [`Voucher sale ${voucher_number}`, voucher_number]);

    for (const st of transactionsRes.rows) {
     if (st.batch_id) {
       // Add quantity back to the batch (subtracting negative quantity adds it back)
       await client.query(`
         UPDATE stock_batches 
         SET quantity = quantity - $1, updated_by = $2 
         WHERE id = $3
       `, [st.quantity, req.user.id, st.batch_id]);
     }
    }

    // Delete those stock transactions
    await client.query(`
     DELETE FROM stock_transactions 
     WHERE reason = $1 OR reason LIKE '%(' || $2 || ')'
    `, [`Voucher sale ${voucher_number}`, voucher_number]);

    // Clean up empty OVERSOLD batches
    await client.query(`
     DELETE FROM stock_batches 
     WHERE batch_number = 'OVERSOLD' AND quantity = 0
    `);

    // 3. Delete voucher items and referrals
    await client.query('DELETE FROM voucher_items WHERE voucher_id = $1', [id]);
    await client.query('DELETE FROM voucher_referrals WHERE voucher_id = $1', [id]);

    // 4. Delete the main Voucher record
    await client.query('DELETE FROM vouchers WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Voucher deleted and stock restored successfully', id });
    } catch (err) {
    await client.query('ROLLBACK');
    console.error('VOUCHER DELETE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete voucher', details: err.message });
    } finally {
    client.release();
    }
    });

    // GET: All referrals (with filters)
app.get('/api/billing/referrals', authenticateToken, async (req, res) => {
  const { referred_person_id, from_date, to_date, payment_status } = req.query;
  
  let query = `
    SELECT vr.*, rp.name as referred_person_name, v.voucher_number, v.created_at as voucher_date
    FROM voucher_referrals vr
    LEFT JOIN referred_persons rp ON vr.referred_person_id = rp.id
    LEFT JOIN vouchers v ON vr.voucher_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (referred_person_id) {
    params.push(referred_person_id);
    query += ` AND vr.referred_person_id = $${params.length}`;
  }

  if (from_date) {
    params.push(from_date);
    query += ` AND v.created_at >= $${params.length}`;
  }

  if (to_date) {
    params.push(to_date + ' 23:59:59');
    query += ` AND v.created_at <= $${params.length}`;
  }

  if (payment_status) {
    params.push(payment_status);
    query += ` AND vr.payment_status = $${params.length}`;
  }

  query += ` ORDER BY v.created_at DESC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('FETCH REFERRALS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// POST: Mark referral as paid
app.post('/api/billing/referrals/:id/pay', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`
      UPDATE voucher_referrals 
      SET payment_status = 'Paid', paid_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2
    `, [req.user.id, id]);
    res.json({ message: 'Referral marked as paid' });
  } catch (err) {
    console.error('PAY REFERRAL ERROR:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// POST: Mark multiple referrals as paid
app.post('/api/billing/referrals/bulk-pay', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No referral IDs provided' });
  }

  try {
    // using ANY($1::int[]) is standard for arrays in pg
    await db.query(`
      UPDATE voucher_referrals 
      SET payment_status = 'Paid', paid_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = ANY($2::int[])
    `, [req.user.id, ids]);
    res.json({ message: `${ids.length} referrals marked as paid` });
  } catch (err) {
    console.error('BULK PAY REFERRALS ERROR:', err);
    res.status(500).json({ error: 'Failed to process bulk payment' });
  }
});

// --- Purchases Module Routes ---

// GET: All purchases (paginated with filters)
app.get('/api/purchases', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, from_date, to_date, invoice_no, supplier_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (from_date) {
      whereClause += ` AND p.created_at >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }
    if (to_date) {
      // Add one day to to_date to include the full day
      whereClause += ` AND p.created_at <= $${paramIndex}::date + interval '1 day'`;
      params.push(to_date);
      paramIndex++;
    }
    if (invoice_no) {
      whereClause += ` AND p.invoice_number ILIKE $${paramIndex}`;
      params.push(`%${invoice_no}%`);
      paramIndex++;
    }
    if (supplier_id) {
      whereClause += ` AND p.supplier_id = $${paramIndex}`;
      params.push(supplier_id);
      paramIndex++;
    }

    const countRes = await db.query(`SELECT COUNT(*) FROM purchases p ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    const queryParams = [...params, parseInt(limit), offset];
    const result = await db.query(`
      SELECT p.*, s.company_name as supplier_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('FETCH PURCHASES ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// PUT: Update Purchase Invoice
app.put('/api/purchases/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { 
    supplier_id, items, 
    total_amount, paid_amount, balance_amount, 
    payment_method, notes 
  } = req.body;

  console.log('PUT PURCHASE REQUEST:', { id, supplier_id, total_items: items?.length });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch existing purchase and verify its invoice number
    const pRes = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (pRes.rows.length === 0) {
      console.log('PUT PURCHASE: NOT FOUND', id);
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase not found' });
    }
    const oldPurchase = pRes.rows[0];
    const invoice_number = oldPurchase.invoice_number;

    // 2. Safety Check: Verify if any items from this purchase have been sold/used
    // We find batches linked via stock_transactions for this invoice
    const transactionsRes = await client.query(`
      SELECT st.*, sb.quantity as current_batch_qty
      FROM stock_transactions st
      JOIN stock_batches sb ON st.batch_id = sb.id
      WHERE st.reason = $1 AND st.type = 'IN'
    `, [`Purchase Invoice ${invoice_number}`]);

    for (const st of transactionsRes.rows) {
      if (st.current_batch_qty < st.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Cannot edit: Some items from batch ${st.batch_id} have already been used or sold.` 
        });
      }
    }

    // 3. Revert: Delete old batches, transactions, and items
    const batchIds = transactionsRes.rows.map(t => t.batch_id);
    if (batchIds.length > 0) {
      await client.query('DELETE FROM stock_transactions WHERE batch_id = ANY($1)', [batchIds]);
      await client.query('DELETE FROM stock_batches WHERE id = ANY($1)', [batchIds]);
    }
    await client.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);

    // 4. Update Purchase Record
    await client.query(`
      UPDATE purchases 
      SET supplier_id = $1, total_amount = $2, paid_amount = $3, balance_amount = $4, 
          payment_method = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [supplier_id, total_amount, paid_amount, balance_amount, payment_method, notes, id]);

    // 5. Insert New Items & Update Stock
    for (const item of items) {
      await client.query(`
        INSERT INTO purchase_items (purchase_id, item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, subtotal, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, item.item_id, item.batch_number || '', item.expiry_date || null, item.quantity, item.purchase_price, item.sale_price, item.subtotal, req.user.id]);

      const batchRes = await client.query(`
        INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [item.item_id, item.batch_number || '', item.expiry_date || null, item.quantity, item.purchase_price, item.sale_price, req.user.id]);
      const batchId = batchRes.rows[0].id;

      await client.query(`
        INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [item.item_id, batchId, 'IN', item.quantity, `Purchase Invoice ${invoice_number}`, req.user.id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Purchase updated successfully', invoice_number });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PURCHASE UPDATE ERROR:', err);
    res.status(500).json({ error: 'Failed to update purchase invoice', details: err.message });
  } finally {
    client.release();
  }
});

// DELETE: Delete/Void Purchase Invoice
app.delete('/api/purchases/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch existing purchase and verify its invoice number
    const pRes = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (pRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase not found' });
    }
    const oldPurchase = pRes.rows[0];
    const invoice_number = oldPurchase.invoice_number;

    // 2. Safety Check: Verify if any items from this purchase have been sold/used
    const transactionsRes = await client.query(`
      SELECT st.*, sb.quantity as current_batch_qty
      FROM stock_transactions st
      JOIN stock_batches sb ON st.batch_id = sb.id
      WHERE st.reason = $1 AND st.type = 'IN'
    `, [`Purchase Invoice ${invoice_number}`]);

    for (const st of transactionsRes.rows) {
      if (st.current_batch_qty < st.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Cannot delete: Some items from batch ${st.batch_id} (Item Code/ID ${st.item_id}) have already been used or sold.` 
        });
      }
    }

    // 3. Revert: Delete old batches, transactions, and items
    const batchIds = transactionsRes.rows.map(t => t.batch_id);
    if (batchIds.length > 0) {
      await client.query('DELETE FROM stock_transactions WHERE batch_id = ANY($1)', [batchIds]);
      await client.query('DELETE FROM stock_batches WHERE id = ANY($1)', [batchIds]);
    }
    await client.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);

    // 4. Delete the purchase record itself
    await client.query('DELETE FROM purchases WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Purchase deleted and stock removed successfully', id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE PURCHASE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete purchase', details: err.message });
  } finally {
    client.release();
  }
});

// GET: Single Purchase details
app.get('/api/purchases/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const purchaseRes = await db.query(`
      SELECT p.*, s.company_name as supplier_name, s.phone_number as supplier_phone
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1
    `, [id]);
    
    if (purchaseRes.rows.length === 0) return res.status(404).json({ error: 'Purchase not found' });
    const purchase = purchaseRes.rows[0];

    const itemsRes = await db.query(`
      SELECT pi.*, si.name as item_name, si.unit
      FROM purchase_items pi
      LEFT JOIN stock_items si ON pi.item_id = si.id
      WHERE pi.purchase_id = $1
    `, [id]);
    purchase.items = itemsRes.rows;

    res.json(purchase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchase details' });
  }
});

// POST: Create Purchase Invoice
app.post('/api/purchases', authenticateToken, async (req, res) => {
  const { 
    supplier_id, items, 
    total_amount, paid_amount, balance_amount, 
    payment_method, notes 
  } = req.body;

  // Generate Invoice Number: INV-YYMMDD-RAND
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const invoice_number = `INV-${datePart}-${randPart}`;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Purchase Record
    const pRes = await client.query(`
      INSERT INTO purchases (invoice_number, supplier_id, total_amount, paid_amount, balance_amount, payment_method, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [invoice_number, supplier_id, total_amount, paid_amount, balance_amount, payment_method, notes, req.user.id]);
    const purchaseId = pRes.rows[0].id;

    // 2. Insert Items & Update Stock
    for (const item of items) {
      // Create purchase item record
      await client.query(`
        INSERT INTO purchase_items (purchase_id, item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, subtotal, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [purchaseId, item.item_id, item.batch_number || '', item.expiry_date || null, item.quantity, item.purchase_price, item.sale_price, item.subtotal, req.user.id]);

      // Create stock batch for FEFO tracking
      const batchQuery = `
        INSERT INTO stock_batches (item_id, batch_number, expiry_date, quantity, purchase_price, sale_price, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `;
      const batchRes = await client.query(batchQuery, [item.item_id, item.batch_number || '', item.expiry_date || null, item.quantity, item.purchase_price, item.sale_price, req.user.id]);
      const batchId = batchRes.rows[0].id;

      // Log transaction
      await client.query(
        'INSERT INTO stock_transactions (item_id, batch_id, type, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [item.item_id, batchId, 'IN', item.quantity, `Purchase Invoice ${invoice_number}`, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: purchaseId, invoice_number });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PURCHASE CREATE ERROR:', err);
    res.status(500).json({ error: 'Failed to create purchase invoice', details: err.message });
  } finally {
    client.release();
  }
});

// --- New Dedicated Financial Reporting APIs ---

// GET: Detailed Revenue for Accounting & Cashiers
app.get('/api/reports/detailed-revenue', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = (end_date || start) + ' 23:59:59';

  const lastMonthStart = new Date(new Date(start).setMonth(new Date(start).getMonth() - 1)).toISOString().split('T')[0];
  const lastMonthEnd = new Date(new Date(end).setMonth(new Date(end).getMonth() - 1)).toISOString().split('T')[0] + ' 23:59:59';

  try {
    const [
      dailyCollection,
      categoryStats,
      monthlyComparison
    ] = await Promise.all([
      // 1. Daily Collection Summary (Date, Gross, Discount, Net, Cash, Digital)
      db.query(`
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as gross_sales,
          SUM(discount_amount) as total_discount,
          SUM(net_amount) as net_collection,
          SUM(CASE WHEN payment_method = 'Cash' THEN net_amount ELSE 0 END) as cash_amount,
          SUM(CASE WHEN payment_method != 'Cash' THEN net_amount ELSE 0 END) as digital_amount
        FROM vouchers
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC`, [start, end]),
      
      // 2. Revenue by Category (Pharmacy, Service, Laboratory, Package)
      db.query(`
        SELECT 
          CASE 
            WHEN vi.item_type = 'PHARMACY' THEN 'Pharmacy'
            WHEN vi.item_type = 'PACKAGE' THEN 'Package'
            WHEN ic.name ILIKE '%Laboratory%' THEN 'Laboratory'
            ELSE 'Service'
          END as category_group,
          SUM(vi.subtotal) as amount
        FROM voucher_items vi
        JOIN vouchers v ON vi.voucher_id = v.id
        LEFT JOIN stock_items si ON vi.item_id = si.id
        LEFT JOIN item_subcategories isc ON si.subcategory_id = isc.id
        LEFT JOIN item_categories ic ON isc.category_id = ic.id
        WHERE v.created_at >= $1 AND v.created_at <= $2
        GROUP BY category_group`, [start, end]),

      // 3. Monthly Growth Comparison
      db.query(`
        SELECT 
          (SELECT SUM(net_amount) FROM vouchers WHERE created_at >= $1 AND created_at <= $2) as current_period,
          (SELECT SUM(net_amount) FROM vouchers WHERE created_at >= $3 AND created_at <= $4) as previous_period
      `, [start, end, lastMonthStart, lastMonthEnd])
    ]);

    res.json({
      dailyCollection: dailyCollection.rows,
      categoryStats: categoryStats.rows,
      growth: {
        current: parseFloat(monthlyComparison.rows[0].current_period) || 0,
        previous: parseFloat(monthlyComparison.rows[0].previous_period) || 0
      }
    });
  } catch (err) {
    console.error('DETAILED REVENUE API ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// --- Patient Clinical Notes Routes ---

// GET: All voucher items for a patient
app.get('/api/patients/:id/voucher-items', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;
  
  try {
    let query = `
      SELECT 
        v.voucher_number, 
        v.created_at as voucher_date,
        vi.item_type,
        vi.name as item_name,
        vi.quantity,
        vi.unit_price,
        vi.subtotal
      FROM vouchers v
      JOIN voucher_items vi ON v.id = vi.voucher_id
      WHERE v.patient_id = $1
    `;
    const params = [id];

    if (fromDate && !isNaN(Date.parse(fromDate))) {
      params.push(fromDate);
      query += ` AND v.created_at >= $${params.length}`;
    }
    if (toDate && !isNaN(Date.parse(toDate))) {
      params.push(toDate + ' 23:59:59');
      query += ` AND v.created_at <= $${params.length}`;
    }

    query += ` ORDER BY v.created_at DESC, vi.id ASC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('FETCH PATIENT VOUCHER ITEMS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch patient voucher items' });
  }
});

// GET: All clinical notes for a patient
app.get('/api/patients/:id/clinical-notes', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT * FROM patient_clinical_notes 
      WHERE patient_id = $1 
      ORDER BY record_date DESC, created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('FETCH CLINICAL NOTES ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch clinical notes' });
  }
});

// POST: Add a new clinical note for a patient
app.post('/api/patients/:id/clinical-notes', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { record_date, diagnosis, treatment, ongoing_plan } = req.body;
  
  try {
    const query = `
      INSERT INTO patient_clinical_notes (patient_id, record_date, diagnosis, treatment, ongoing_plan, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await db.query(query, [
      id, 
      record_date || new Date().toISOString().split('T')[0], 
      diagnosis, 
      treatment, 
      ongoing_plan,
      req.user.id
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('CREATE CLINICAL NOTE ERROR:', err);
    res.status(500).json({ error: 'Failed to create clinical note' });
  }
});

// PUT: Update a clinical note
app.put('/api/patients/clinical-notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { record_date, diagnosis, treatment, ongoing_plan } = req.body;
  try {
    const query = `
      UPDATE patient_clinical_notes 
      SET record_date = $1, diagnosis = $2, treatment = $3, ongoing_plan = $4, updated_at = CURRENT_TIMESTAMP, updated_by = $5
      WHERE id = $6 AND is_active = true
      RETURNING *;
    `;
    const result = await db.query(query, [record_date, diagnosis, treatment, ongoing_plan, req.user.id, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('UPDATE CLINICAL NOTE ERROR:', err);
    res.status(500).json({ error: 'Failed to update clinical note' });
  }
});

// DELETE: Remove a clinical note
app.delete('/api/patients/clinical-notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('UPDATE patient_clinical_notes SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2 RETURNING id', [req.user.id, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('DELETE CLINICAL NOTE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete clinical note' });
  }
});

// --- Authentication & User Management Routes ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = $1 AND u.is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, r.name as role, 
       ARRAY(SELECT permission_name FROM role_permissions WHERE role_id = u.role_id) as permissions
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('AUTH ME ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.get('/api/auth/roles', authenticateToken, authorize(['manage_users']), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.id, r.name, r.description,
      COALESCE(json_agg(rp.permission_name) FILTER (WHERE rp.permission_name IS NOT NULL), '[]') as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('FETCH ROLES ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.post('/api/auth/roles', authenticateToken, authorize(['manage_users']), async (req, res) => {
  const { name, description, permissions } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Role name is required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Role
    const roleRes = await client.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    const roleId = roleRes.rows[0].id;

    // 2. Insert Permissions
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const values = permissions.map(p => `(${roleId}, '${p}')`).join(', ');
      await client.query(`INSERT INTO role_permissions (role_id, permission_name) VALUES ${values}`);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...roleRes.rows[0], permissions: permissions || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CREATE ROLE ERROR:', err);
    res.status(500).json({ error: 'Failed to create role' });
  } finally {
    client.release();
  }
});

app.put('/api/auth/roles/:id', authenticateToken, authorize(['manage_users']), async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  // Prevent editing the core Admin role
  if (parseInt(id) === 1) {
    return res.status(403).json({ error: 'Cannot modify the system Admin role' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update Role
    const roleRes = await client.query(
      'UPDATE roles SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    if (roleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role not found' });
    }

    // 2. Update Permissions (Delete all existing, then insert new)
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const values = permissions.map(p => `(${id}, '${p}')`).join(', ');
      await client.query(`INSERT INTO role_permissions (role_id, permission_name) VALUES ${values}`);
    }

    await client.query('COMMIT');
    res.json({ ...roleRes.rows[0], permissions: permissions || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('UPDATE ROLE ERROR:', err);
    res.status(500).json({ error: 'Failed to update role' });
  } finally {
    client.release();
  }
});

app.delete('/api/auth/roles/:id', authenticateToken, authorize(['manage_users']), async (req, res) => {
  const { id } = req.params;

  // Prevent deleting the core Admin role
  if (parseInt(id) === 1) {
    return res.status(403).json({ error: 'Cannot delete the system Admin role' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check if users are assigned to this role
    const usersRes = await client.query('SELECT count(*) FROM users WHERE role_id = $1', [id]);
    if (parseInt(usersRes.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot delete role because it is assigned to existing users. Reassign them first.' });
    }

    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    const delRes = await client.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);

    if (delRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE ROLE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete role' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/register', authenticateToken, authorize(['manage_users']), async (req, res) => {
  const { username, password, email, role_id } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (username, password_hash, email, role_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
      [username, password_hash, email, role_id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/users', authenticateToken, authorize(['manage_users']), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.is_active, u.last_login, r.name as role_name, u.role_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.username ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id', authenticateToken, authorize(['manage_users']), async (req, res) => {
  const { id } = req.params;
  const { username, email, role_id, is_active, password } = req.body;
  
  try {
    let query = 'UPDATE users SET username = $1, email = $2, role_id = $3, is_active = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP';
    const params = [username, email, role_id, is_active, req.user.id];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      query += ', password_hash = $6';
      params.push(password_hash);
    }

    query += ' WHERE id = $' + (params.length + 1) + ' RETURNING id, username, email';
    params.push(id);

    const result = await db.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('USER UPDATE ERROR:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// --- Notifications API ---

app.get('/api/notifications/alerts', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date();
    const tomorrow = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const [lowStock, expiringSoon, tomorrowTca] = await Promise.all([
      // 1. Low Stock
      db.query(`
        SELECT COUNT(*) as count
        FROM stock_items si
        LEFT JOIN (SELECT item_id, SUM(quantity) as qty FROM stock_batches GROUP BY item_id) sb ON si.id = sb.item_id
        WHERE si.is_active = true AND COALESCE(sb.qty, 0) <= si.min_stock_level
      `),
      // 2. Expiring Soon
      db.query(`
        SELECT COUNT(*) as count
        FROM stock_batches
        WHERE expiry_date <= $1 AND quantity > 0
      `, [thirtyDaysFromNow]),
      // 3. Tomorrow's TCA
      db.query(`
        SELECT COUNT(DISTINCT patient_id) as count
        FROM vouchers
        WHERE tca_date = $1
      `, [tomorrowStr])
    ]);

    const alerts = [];
    
    if (parseInt(lowStock.rows[0].count) > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStock.rows[0].count} items are at or below minimum stock level.`,
        link: '/inventory-dashboard'
      });
    }

    if (parseInt(expiringSoon.rows[0].count) > 0) {
      alerts.push({
        id: 'expiry',
        type: 'danger',
        title: 'Expiry Warning',
        message: `${expiringSoon.rows[0].count} batches are expiring within 30 days.`,
        link: '/inventory-dashboard'
      });
    }

    if (parseInt(tomorrowTca.rows[0].count) > 0) {
      alerts.push({
        id: 'tca-tomorrow',
        type: 'info',
        title: "Tomorrow's TCA",
        message: `${tomorrowTca.rows[0].count} patients are scheduled to return tomorrow.`,
        link: '/tca-dashboard'
      });
    }

    res.json(alerts);
  } catch (err) {
    console.error('NOTIFICATIONS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;