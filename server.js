import express from "express";
import multer from "multer";
import initSqlJs from "sql.js";
import { nanoid } from "nanoid";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Rate limiter
const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.use(limiter);

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Initialize in-memory SQL.js DB
let db;
const DB_FILE = "./members.sqlite";

async function initDb() {
  const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    db.run(`CREATE TABLE members (
      id TEXT PRIMARY KEY,
      name TEXT,
      expiry TEXT,
      photoPath TEXT,
      url TEXT
    );`);
    fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
  }
}

await initDb();

function saveDb() {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

// Home page
app.get("/", (req, res) => {
  res.send(`
    <div style="display:flex;justify-content:center;align-items:center;flex-direction:column;height:100vh;font-family:sans-serif">
      <h2>Gym Member Registration</h2>
      <form action="/add" method="post" enctype="multipart/form-data">
        <label>Name:</label><br/>
        <input name="name" required/><br/><br/>
        <label>Expiry Date:</label><br/>
        <input type="date" name="expiry" required/><br/><br/>
        <label>Photo:</label><br/>
        <input type="file" name="photo" accept="image/*" required/><br/><br/>
        <button type="submit">Save Member</button>
      </form>
      <br/>
      <a href="/members">View All Members</a>
    </div>
  `);
});

// Add member
app.post("/add", upload.single("photo"), (req, res) => {
  try {
    const { name, expiry } = req.body;
    const id = nanoid(8);
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const memberUrl = `http://localhost:${PORT}/member/${id}`;

    db.run(
      "INSERT INTO members (id, name, expiry, photoPath, url) VALUES (?, ?, ?, ?, ?)",
      [id, name, expiry, photoPath, memberUrl]
    );
    saveDb();

    res.send(`
      <p>✅ Member saved successfully!</p>
      <p><strong>Unique Member URL:</strong></p>
      <a href="${memberUrl}">${memberUrl}</a>
      <p>Use this URL in the NFC card.</p>
      <a href="/">Back</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error saving member.");
  }
});

// View single member
app.get("/member/:id", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM members WHERE id = ?");
    const member = stmt.getAsObject([req.params.id]);
    stmt.free();

    if (!member.id) return res.status(404).send("❌ Member not found.");

    const today = dayjs();
    const expiry = dayjs(member.expiry);
    const expired = expiry.isBefore(today);

    res.send(`
      <div style="display:flex;justify-content:center;align-items:center;flex-direction:column;height:100vh;font-family:sans-serif">
        <h2>🏋️ Gym Member Info</h2>
        ${member.photoPath ? `<img src="${member.photoPath}" style="width:120px;height:auto;"/>` : ""}
        <br/>
        <strong>Name:</strong> ${member.name}<br/>
        <strong>Expiry:</strong> ${member.expiry}<br/>
        <strong>Status:</strong> ${expired ? "<span style='color:red;font-weight:bold;'>Expired</span>" : "<span style='color:green;font-weight:bold;'>Active</span>"}<br/>
        <strong>Member URL:</strong> <a href="${member.url}">${member.url}</a><br/><br/>
        <a href="/members">View All Members</a>
      </div>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error loading member.");
  }
});

// View all members
app.get("/members", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM members");
    const members = [];
    while (stmt.step()) members.push(stmt.getAsObject());
    stmt.free();

    const membersHtml = members
      .map(
        m => `
        <div style="border:1px solid #ccc;padding:10px;margin:10px;display:flex;align-items:center">
          ${m.photoPath ? `<img src="${m.photoPath}" style="width:80px;height:auto;margin-right:10px;"/>` : ""}
          <div>
            <strong>${m.name}</strong><br/>
            Expiry: ${m.expiry}<br/>
            Status: ${dayjs(m.expiry).isBefore(dayjs()) ? "<span style='color:red;'>Expired</span>" : "<span style='color:green;'>Active</span>"}<br/>
            <a href="${m.url}">Member URL</a><br/>
            <form action="/delete/${m.id}" method="post" style="margin-top:5px;">
              <button type="submit">Delete</button>
            </form>
          </div>
        </div>
      `
      )
      .join("");

    res.send(`
      <div style="display:flex;justify-content:center;flex-direction:column;font-family:sans-serif;margin:20px">
        <h2>All Members</h2>
        ${membersHtml}
        <br/>
        <a href="/">Add New Member</a>
      </div>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error loading members.");
  }
});

// Delete member
app.post("/delete/:id", (req, res) => {
  try {
    db.run("DELETE FROM members WHERE id = ?", [req.params.id]);
    saveDb();
    res.redirect("/members");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error deleting member.");
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
