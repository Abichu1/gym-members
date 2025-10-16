const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Create uploads folder if missing
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Setup file upload handling
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Database setup
const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      expiry TEXT,
      photo TEXT,
      status TEXT,
      url TEXT
    )`
  );
});

// Routes
app.post("/add", upload.single("photo"), (req, res) => {
  const { name, expiry } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : "";
  const status = "Active";
  const url = `${req.protocol}://${req.get("host")}/member/${name.toLowerCase().replace(/\s+/g, "-")}`;

  db.run(
    "INSERT INTO members (name, expiry, photo, status, url) VALUES (?, ?, ?, ?, ?)",
    [name, expiry, photo, status, url],
    (err) => {
      if (err) console.error(err);
      res.redirect("/");
    }
  );
});

app.get("/members", (req, res) => {
  db.all("SELECT * FROM members", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/member/:slug", (req, res) => {
  const name = req.params.slug.replace(/-/g, " ");
  db.get("SELECT * FROM members WHERE lower(name) = ?", [name], (err, row) => {
    if (err || !row) return res.status(404).send("Member not found");
    res.send(`
      <h2>${row.name}</h2>
      <p><b>Expiry:</b> ${row.expiry}</p>
      <p><b>Status:</b> ${row.status}</p>
      <img src="${row.photo}" alt="${row.name}" width="150" height="150">
      <p><b>Member URL:</b> <a href="${row.url}">${row.url}</a></p>
      <br><a href="/">Back</a>
    `);
  });
});

app.post("/delete/:id", (req, res) => {
  db.run("DELETE FROM members WHERE id = ?", [req.params.id], (err) => {
    if (err) console.error(err);
    res.redirect("/");
  });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
