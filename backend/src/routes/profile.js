const express      = require('express');
const pool         = require('../db/connection');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Semua route di file ini butuh login — pasang middleware di sini
router.use(authenticate);

// GET /profile — data milik user yang sedang login
router.get('/', async (req, res) => {
  try {
    // req.user diisi oleh middleware authenticate
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// GET /profile/products — hanya produk milik user yang login
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, description FROM products WHERE owner_id = $1',
      [req.user.userId]
    );

    res.json({
      owner: req.user.username,
      products: result.rows,
    });

  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;