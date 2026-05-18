const jwt  = require('jsonwebtoken');
const pool = require('../db/connection');

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Akses ditolak — silakan login' });
    }

    const blacklisted = await pool.query(
      'SELECT id FROM token_blacklist WHERE token = $1',
      [token]
    );

    if (blacklisted.rowCount > 0) {
      return res.status(401).json({ message: 'Token tidak valid — silakan login ulang' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId:   decoded.userId,
      username: decoded.username,
      role:     decoded.role,
    };

    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sesi habis — silakan login ulang' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token tidak valid' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

module.exports = authenticate;