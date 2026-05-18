const express = require('express');
const { z } = require('zod');
const pool = require('../db/connection');
const validate = require('../middleware/validate');

const router = express.Router();

// Schema untuk GET /users/:id
const getUserSchema = z.object({
  params: z.object({
    // coerce: string dari URL dikonversi ke number dulu, lalu divalidasi
    id: z.coerce.number()
          .int('ID harus bilangan bulat')
          .positive('ID harus positif')
          .max(999999, 'ID tidak valid'),
  }),
});

// Schema untuk GET /users/search — query string
const searchUserSchema = z.object({
  query: z.object({
    username: z.string()
                .min(2, 'Username minimal 2 karakter')
                .max(50, 'Username maksimal 50 karakter')
                .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, underscore'),
    // field opsional
    role: z.enum(['user', 'admin']).optional(),
  }),
});

// Schema untuk POST /users
const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
    email:    z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
  }),
});

// SECURE: parameterized query ($1) + validasi Zod
router.get('/:id', validate(getUserSchema), async (req, res) => {
  // Ambil dari req.validated — sudah bersih dan sudah di-coerce ke number
  const { id } = req.validated.params;

  try {
    // password TIDAK ikut di SELECT — least privilege principle
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

router.get('/', validate(searchUserSchema), async (req, res) => {
  const { username, role } = req.validated.query;

  try {
    // Query dinamis tapi tetap aman — parameter tetap di-bind
    let query  = 'SELECT id, username, email, role FROM users WHERE username ILIKE $1';
    let params = [`%${username}%`];

    if (role) {
      query  += ' AND role = $2';
      params.push(role);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

router.post('/', validate(createUserSchema), async (req, res) => {
  const { username, email, password } = req.validated.body;

  try {
    // Cek duplikat dulu — pakai parameterized query
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Username atau email sudah dipakai' });
    }

    // RETURNING mengembalikan data row yang baru dibuat
    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, password]
      // catatan: password masih plaintext di sini — akan di-hash di Sesi 2
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
