const express      = require('express');
const bcrypt       = require('bcrypt');
const jwt          = require('jsonwebtoken');
const { z }        = require('zod');
const pool         = require('../db/connection');
const validate     = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
const ROUNDS = 12;

const registerSchema = z.object({
  body: z.object({
    username: z.string()
                .min(3, 'Username minimal 3 karakter')
                .max(50)
                .regex(/^[a-zA-Z0-9_]+$/, 'Hanya huruf, angka, underscore'),
    email:    z.string().email('Format email tidak valid'),
    password: z.string()
                .min(8, 'Password minimal 8 karakter')
                .regex(/[A-Z]/, 'Harus ada huruf kapital')
                .regex(/[0-9]/, 'Harus ada angka'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username wajib diisi'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, email, password } = req.validated.body;

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Username atau email sudah dipakai' });
    }

    const hashedPassword = await bcrypt.hash(password, ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: result.rows[0],
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.validated.body;

  try {
    const result = await pool.query(
      'SELECT id, username, email, role, password FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    // PENTING: bcrypt.compare dipanggil SELALU, bahkan saat user tidak ditemukan
    // Ini mencegah timing attack — waktu response sama untuk username valid/invalid
    const dummyHash = '$2b$12$invalidhashfortimingatackprevention00000000000000000';
    const hashToCompare = user ? user.password : dummyHash;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Simpan token di HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,   // JavaScript tidak bisa baca cookie ini
      secure: false,    // ganti true saat pakai HTTPS di production
      sameSite: 'strict', // proteksi dari CSRF
      maxAge: 15 * 60 * 1000, 
    });

    res.json({
      message: 'Login berhasil',
      user: { id: user.id, username: user.username, role: user.role },
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.cookies.token;

    // Masukkan ke blacklist agar tidak bisa dipakai lagi
    // Meskipun token belum expired, sudah tidak valid
    await pool.query(
      'INSERT INTO token_blacklist (token) VALUES ($1)',
      [token]
    );

    res.clearCookie('token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });

    res.json({ message: 'Logout berhasil' });

  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;