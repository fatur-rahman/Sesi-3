const express      = require('express');
const { z }        = require('zod');
const pool         = require('../db/connection');
const authenticate = require('../middleware/authenticate');
const requireOwner = require('../middleware/requireOwner');
const validate     = require('../middleware/validate');

const router = express.Router();

// Schema validasi
const documentIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const documentBodySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    title:   z.string().min(1).max(200),
    content: z.string().min(1),
  }),
});

const createDocumentSchema = z.object({
  body: z.object({
    title:      z.string().min(1, 'Judul wajib diisi').max(200),
    content:    z.string().min(1, 'Konten wajib diisi'),
    is_private: z.boolean().default(true),
  }),
});

// Semua route butuh login
router.use(authenticate);
// ✅ SECURE: GET semua dokumen milik user yang login
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, is_private, created_at
       FROM documents
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
      // Hanya dokumen milik user yang login — tidak bisa lihat punya orang lain
    );

    res.json(result.rows);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ✅ SECURE: GET satu dokumen — dengan ownership check
router.get(
  '/:id',
  validate(documentIdSchema),
  requireOwner({ table: 'documents', ownerColumn: 'owner_id' }),
  async (req, res) => {
    const { id } = req.validated.params;

    try {
      // Ownership sudah diverifikasi middleware — aman untuk query langsung
      const result = await pool.query(
        `SELECT id, title, content, is_private, created_at
         FROM documents WHERE id = $1`,
        [id]
      );

      res.json(result.rows[0]);

    } catch (err) {
      console.error('DB Error:', err);
      res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
  }
);

// ✅ SECURE: POST buat dokumen baru
router.post('/', validate(createDocumentSchema), async (req, res) => {
  const { title, content, is_private } = req.validated.body;

  try {
    const result = await pool.query(
      `INSERT INTO documents (title, content, owner_id, is_private)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, is_private, created_at`,
      [title, content, req.user.userId, is_private]
      // owner_id diambil dari token — tidak bisa dimanipulasi user
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// ✅ SECURE: PUT update — ownership dicek middleware sebelum sampai sini
router.put(
  '/:id',
  validate(documentBodySchema),
  requireOwner({ table: 'documents', ownerColumn: 'owner_id' }),
  async (req, res) => {
    const { id }             = req.validated.params;
    const { title, content } = req.validated.body;

    try {
      const result = await pool.query(
        `UPDATE documents SET title = $1, content = $2
         WHERE id = $3
         RETURNING id, title, is_private, created_at`,
        [title, content, id]
      );

      res.json(result.rows[0]);

    } catch (err) {
      console.error('DB Error:', err);
      res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
  }
);

// ✅ SECURE: DELETE — ownership dicek middleware sebelum sampai sini
router.delete(
  '/:id',
  validate(documentIdSchema),
  requireOwner({ table: 'documents', ownerColumn: 'owner_id' }),
  async (req, res) => {
    const { id } = req.validated.params;

    try {
      await pool.query('DELETE FROM documents WHERE id = $1', [id]);
      res.json({ message: 'Dokumen berhasil dihapus' });

    } catch (err) {
      console.error('DB Error:', err);
      res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
  }
);

module.exports = router;