const express      = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware global
app.use(express.json());
app.use(cookieParser()); 

// Routes Sesi 1
const usersRouter = require('./routes/users.secure');
app.use('/users', usersRouter);

// Routes Sesi 2
const authRouter    = require('./routes/auth');
const profileRouter = require('./routes/profile');
app.use('/auth',    authRouter);
app.use('/profile', profileRouter);

// Lab 3A
const documentsRouter = require('./routes/documents.insecure');
app.use('/documents', documentsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Server berjalan', sesi: '1 & 2' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});