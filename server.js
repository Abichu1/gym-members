// server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dayjs from 'dayjs';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
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

const db = await open({
  filename: dbPath,
  driver: sqlite3.Database
});

// Initialize members table if it doesn't exist
await db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT,
    expiry TEXT,
    status TEXT,
    url TEXT
  )
`);

console.log(`✅ Connected to SQLite DB at ${dbPath}`);

// --------------------
// Routes
// --------------------

// Add new member
app.post('/members', upload.single('file'), async (req, res) => {
  try {
    const { name, expiry, status, url } = req.body;
    const id = nanoid();

    await db.run(
      'INSERT INTO members (id, name, expiry, status, url) VALUES (?, ?, ?, ?, ?)',
      [id, name, expiry, status, url || '']
    );

    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// View all members
app.get('/members', async (req, res) => {
  try {
    const members = await db.all('SELECT * FROM members');
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete member
app.delete('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM members WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------
// Start server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
