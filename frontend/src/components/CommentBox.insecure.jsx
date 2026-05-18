import { useState } from 'react';

// ❌ VULNERABLE: dangerouslySetInnerHTML tanpa sanitasi
export default function CommentBoxInsecure() {
  const [input,    setInput]    = useState('');
  const [comments, setComments] = useState([
    { id: 1, author: 'alice', text: 'Komentar pertama dari alice' },
  ]);

  function handleSubmit() {
    if (!input.trim()) return;

    setComments(prev => [...prev, {
      id:     Date.now(),
      author: 'bob',
      text:   input,
    }]);
    setInput('');
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Kolom Komentar — INSECURE</h2>

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
            <div
              // ❌ MASALAH: input user dirender sebagai HTML mentah
              // Script di dalam input akan ikut dieksekusi browser
              dangerouslySetInnerHTML={{ __html: c.text }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}