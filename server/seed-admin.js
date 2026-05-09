const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

async function seedAdmin() {
  const username = 'admin';
  const password = 'admin123'; // Default password, should be changed
  const email = 'admin@shweseesar.com';

  try {
    // 1. Get Admin Role ID
    const roleRes = await db.query("SELECT id FROM roles WHERE name = 'Admin'");
    if (roleRes.rows.length === 0) {
      console.error('Admin role not found. Please run migrate-auth.sql first.');
      process.exit(1);
    }
    const adminRoleId = roleRes.rows[0].id;

    // 2. Check if admin user already exists
    const userRes = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userRes.rows.length > 0) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert Admin user
    await db.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4)',
      [username, email, passwordHash, adminRoleId]
    );

    console.log('Admin user seeded successfully.');
    console.log('Username: admin');
    console.log('Password: admin123 (Please change this after first login)');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();
