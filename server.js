import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize SQLite
sqlite3.verbose();
let db;

async function initDB() {
  db = await open({
    filename: path.join(__dirname, "gym-members.db"),
    driver: sqlite3.Database
  });

  // Create table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      membership_id TEXT UNIQUE,
      expiry_date TEXT
    )
  `);

  console.log("✅ Local SQLite database initialized");
}

// Routes
app.get("/", (req, res) => {
  res.send("Gym Members API running successfully 🚀");
});

app.get("/api/members", async (req, res) => {
  const members = await db.all("SELECT * FROM members");
  res.json(members);
});

app.post("/api/members", async (req, res) => {
  try {
    const { name, phone, membership_id, expiry_date } = req.body;
    await db.run(
      "INSERT INTO members (name, phone, membership_id, expiry_date) VALUES (?, ?, ?, ?)",
      [name, phone, membership_id, expiry_date]
    );
    res.status(201).json({ message: "Member added successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to add member (maybe duplicate ID)" });
  }
});

app.delete("/api/members/:id", async (req, res) => {
  try {
    await db.run("DELETE FROM members WHERE id = ?", req.params.id);
    res.json({ message: "Member deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
