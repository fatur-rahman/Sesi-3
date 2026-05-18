const express = require('express');
const pool = require('../db/connection');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const query = `SELECT id, username, email, role FROM users WHERE id = ${id}`;

  console.log('⚠️  Query yang dijalankan:', query); // log buat lihat attack

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search/:username', async (req, res) => {
  const { username } = req.params;
  const query = `SELECT id, username, email FROM users WHERE username = '${username}'`;

  console.log('⚠️  Query yang dijalankan:', query);

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
