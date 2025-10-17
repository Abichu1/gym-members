// server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File uploads
const upload = multer({ dest: 'uploads/' });

// --------------------
// Database setup
// --------------------
const dbFolder = process.env.DATABASE_FOLDER || './data';
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

const dbPath = path.join(dbFolder, 'members.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err);
  else console.log(`✅ Connected to SQLite DB at ${dbPath}`);
});

// Initialize members table
db.run(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT,
    expiry TEXT,
    status TEXT,
    url TEXT
  )
`);

// --------------------
// Routes
// --------------------

// Add new member
app.post('/members', upload.single('file'), (req, res) => {
  const { name, expiry, status, url } = req.body;
  const id = nanoid();

  db.run(
    'INSERT INTO members (id, name, expiry, status, url) VALUES (?, ?, ?, ?, ?)',
    [id, name, expiry, status, url || ''],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.status(201).json({ success: true, id });
    }
  );
});

// View all members
app.get('/members', (req, res) => {
  db.all('SELECT * FROM members', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json(rows);
  });
});

// Delete member
app.delete('/members/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM members WHERE id = ?', [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// --------------------
// Start server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
