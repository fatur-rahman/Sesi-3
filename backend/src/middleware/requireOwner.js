const pool = require('../db/connection');

// config = { table, ownerColumn }
// Contoh: requireOwner({ table: 'documents', ownerColumn: 'owner_id' })
function requireOwner(config) {
  return async (req, res, next) => {
    const { table, ownerColumn } = config;
    const resourceId = req.params.id;
    const userId     = req.user.userId; // dari middleware authenticate

    try {
      const result = await pool.query(
        `SELECT ${ownerColumn} FROM ${table} WHERE id = $1`,
        [resourceId]
      );

      // Resource tidak ditemukan
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Resource tidak ditemukan' });
      }

      const ownerId = result.rows[0][ownerColumn];

      // User yang login bukan pemilik resource
      if (ownerId !== userId) {
        // Sengaja 404 bukan 403 — agar attacker tidak tahu resource ada
        // Kalau 403, attacker tahu id itu valid tapi dia tidak punya akses
        // Kalau 404, attacker tidak bisa bedakan "tidak ada" vs "tidak boleh"
        return res.status(404).json({ message: 'Resource tidak ditemukan' });
      }

      // Lolos — user adalah pemilik, lanjut ke handler
      next();

    } catch (err) {
      console.error('requireOwner error:', err);
      res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
  };
}

module.exports = requireOwner;