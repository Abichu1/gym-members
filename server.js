import express from "express";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize SQLite3 (local DB)
sqlite3.verbose();
const dbPath = path.join(__dirname, "gym-members.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Database connection error:", err);
  else console.log("✅ Connected to local SQLite database");
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    membership_id TEXT UNIQUE,
    expiry_date TEXT
  )
`);

// Routes
app.get("/", (req, res) => {
  res.send("🏋️ Gym Members API is live!");
});

app.get("/api/members", (req, res) => {
  db.all("SELECT * FROM members", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/members", (req, res) => {
  const { name, phone, membership_id, expiry_date } = req.body;
  db.run(
    "INSERT INTO members (name, phone, membership_id, expiry_date) VALUES (?, ?, ?, ?)",
    [name, phone, membership_id, expiry_date],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(400).json({ error: "Failed to add member" });
      }
      res.status(201).json({ id: this.lastID, message: "Member added" });
    }
  );
});

app.delete("/api/members/:id", (req, res) => {
  db.run("DELETE FROM members WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedID: req.params.id });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
