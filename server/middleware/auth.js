const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-change-it';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

const authorize = (permissions = []) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
      const result = await db.query(
        `SELECT p.permission_name 
         FROM role_permissions p 
         JOIN users u ON u.role_id = p.role_id 
         WHERE u.id = $1`,
        [req.user.id]
      );

      const userPermissions = result.rows.map(r => r.permission_name);
      
      // Admin has all permissions bypass
      const roleResult = await db.query(
        'SELECT r.name FROM roles r JOIN users u ON u.role_id = r.id WHERE u.id = $1',
        [req.user.id]
      );
      
      if (roleResult.rows.length > 0 && roleResult.rows[0].name === 'Admin') {
        return next();
      }

      if (permissions.length === 0) {
        return next();
      }

      const hasPermission = permissions.some(p => userPermissions.includes(p));
      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
      }

      next();
    } catch (err) {
      console.error('Authorization error:', err);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

module.exports = {
  authenticateToken,
  authorize,
  JWT_SECRET
};
