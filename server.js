import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

async function initDB() {
  db = await open({
    filename: path.join(__dirname, "members.db"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      expiry_date TEXT,
      status TEXT,
      image_path TEXT,
      url TEXT
    )
  `);
}

app.get("/", (req, res) => {
  res.send("✅ Gym Members Server Running Successfully");
});

// Get all members
app.get("/members", async (req, res) => {
  const members = await db.all("SELECT * FROM members");
  res.json(members);
});

// Add new member
app.post("/members", async (req, res) => {
  const { name, expiry_date, status, image_path, url } = req.body;
  await db.run(
    "INSERT INTO members (name, expiry_date, status, image_path, url) VALUES (?, ?, ?, ?, ?)",
    [name, expiry_date, status, image_path, url]
  );
  res.json({ message: "✅ Member added" });
});

// Delete member
app.delete("/members/:id", async (req, res) => {
  const { id } = req.params;
  await db.run("DELETE FROM members WHERE id = ?", id);
  res.json({ message: "🗑️ Member deleted" });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
