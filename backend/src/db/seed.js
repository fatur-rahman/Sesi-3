const pool   = require('./connection');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    await pool.query(`
      TRUNCATE TABLE token_blacklist, documents, products, users
      RESTART IDENTITY CASCADE
    `);

    const ROUNDS = 12;
    const hashes = await Promise.all([
      bcrypt.hash('password123',  ROUNDS),
      bcrypt.hash('qwerty456',    ROUNDS),
      bcrypt.hash('admin_secret', ROUNDS),
    ]);

    const usersResult = await pool.query(`
      INSERT INTO users (username, email, password, role) VALUES
        ('alice', 'alice@example.com', $1, 'user'),
        ('bob',   'bob@example.com',   $2, 'user'),
        ('admin', 'admin@example.com', $3, 'admin')
      RETURNING id, username
    `, hashes);

    console.log('Users inserted');

    const alice = usersResult.rows[0];
    const bob   = usersResult.rows[1];

    await pool.query(`
      INSERT INTO products (name, price, owner_id, description) VALUES
        ('Laptop Gaming',     15000000, $1, 'RTX 4060, RAM 16GB'),
        ('Mouse Wireless',      350000, $1, 'DPI adjustable'),
        ('Keyboard Mekanikal',  800000, $2, 'Cherry MX Red switch')
    `, [alice.id, bob.id]);

    console.log('Products inserted');

    // Dokumen milik alice — beberapa private, satu public
    // Ini yang akan dicoba diakses oleh bob di Lab 3A (IDOR)
    await pool.query(`
      INSERT INTO documents (title, content, owner_id, is_private) VALUES
        ('Catatan Pribadi Alice',   'Isi catatan rahasia alice...', $1, true),
        ('Rencana Bisnis Alice',    'Detail rencana bisnis...',     $1, true),
        ('Pengumuman Publik Alice', 'Ini boleh dibaca siapapun',    $1, false)
    `, [alice.id]);

    // Dokumen milik bob
    await pool.query(`
      INSERT INTO documents (title, content, owner_id, is_private) VALUES
        ('Catatan Pribadi Bob', 'Isi catatan rahasia bob...', $1, true),
        ('Draft Artikel Bob',   'Draft yang belum selesai...', $1, true)
    `, [bob.id]);

    console.log('Documents inserted');
    console.log('\nSeed selesai untuk sesi 3');
    console.log('   alice memiliki 3 dokumen (2 private, 1 public)');
    console.log('   bob   memiliki 2 dokumen (semua private)');

  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();