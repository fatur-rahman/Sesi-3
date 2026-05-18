import { useState } from 'react';
import DOMPurify   from 'dompurify';

// ✅ SECURE: dua lapis pertahanan XSS
export default function CommentBoxSecure() {
  const [input,    setInput]    = useState('');
  const [comments, setComments] = useState([
    { id: 1, author: 'alice', text: 'Komentar pertama dari alice' },
  ]);

  function handleSubmit() {
    if (!input.trim()) return;

    setComments(prev => [...prev, {
      id:     Date.now(),
      author: 'bob',
      // Sanitasi input SEBELUM disimpan ke state
      // DOMPurify menghapus semua tag dan atribut berbahaya
      text: DOMPurify.sanitize(input),
    }]);
    setInput('');
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Kolom Komentar — SECURE</h2>

      <div style={{ marginBottom: 16 }}>
        <textarea
          rows={3}
          style={{ width: '100%', padding: 8 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Tulis komentar..."
        />
        <button onClick={handleSubmit} style={{ marginTop: 8, padding: '8px 16px' }}>
          Kirim
        </button>
      </div>

      <div>
        {comments.map(c => (
          <div key={c.id} style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, marginBottom: 8 }}>
            <strong>{c.author}</strong>

            {/*
              ✅ OPSI 1 — Render sebagai teks biasa (paling aman)
              React secara default escape semua karakter HTML
              <script> akan muncul sebagai teks, bukan dieksekusi
            */}
            <p>{c.text}</p>

            {/*
              ✅ OPSI 2 — Kalau memang butuh render HTML (bold, italic, link)
              Gunakan dangerouslySetInnerHTML HANYA dengan DOMPurify
              DOMPurify sudah membersihkan script dan atribut berbahaya di handleSubmit
            */}
            {/* <div dangerouslySetInnerHTML={{ __html: c.text }} /> */}

          </div>
        ))}
      </div>
    </div>
  );
}