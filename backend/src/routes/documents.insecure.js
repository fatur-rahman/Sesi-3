const express      = require('express');
const pool         = require('../db/connection');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

// ❌ VULNERABLE: cek login ada, tapi tidak cek ownership
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
      // MASALAH: tidak ada WHERE owner_id = req.user.userId
      // Siapapun yang login bisa akses dokumen milik siapapun
      // cukup dengan ganti angka id di URL
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ❌ VULNERABLE: update tanpa cek ownership
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const result = await pool.query(
      `UPDATE documents SET title = $1, content = $2
       WHERE id = $3
       RETURNING *`,
      [title, content, id]
      // MASALAH: bob bisa edit dokumen milik alice!
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ❌ VULNERABLE: delete tanpa cek ownership
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 RETURNING id, title',
      [id]
      // MASALAH: bob bisa hapus dokumen milik alice!
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    res.json({ message: 'Dokumen dihapus', deleted: result.rows[0] });

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;