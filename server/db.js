const { Pool, types } = require('pg');
require('dotenv').config();

// Force DATE (OID 1082) to be returned as a string (YYYY-MM-DD) 
// instead of a JavaScript Date object to avoid timezone shifts.
types.setTypeParser(1082, function(val) {
  return val;
});

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'shweseesar',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export pool for transactions
};
