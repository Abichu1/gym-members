import express from "express";
import helmet from "helmet";
import multer from "multer";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

// PostgreSQL connection (replace with your Railway DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:XuqjlZccKFfpRIGyXefbUuVCVYhQSNZE@hopper.proxy.rlwy.net:46759/railway",
  ssl: { rejectUnauthorized: false } // required for Railway
});

// Initialize Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());

// Serve static files (images)
app.use("/public", express.static("public"));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/"),
  filename: (req, file, cb) => cb(null, `${nanoid()}-${file.originalname}`)
});
const upload = multer({ storage });

// Initialize DB table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      expiry DATE NOT NULL,
      status TEXT NOT NULL,
      image_url TEXT,
      member_url TEXT
    )
  `);
  console.log("✅ Connected to PostgreSQL and ensured members table exists");
}
initDB();

// Routes

// Add new member
app.post("/members", upload.single("image"), async (req, res) => {
  try {
    const { name, expiry, status, member_url } = req.body;
    const image_url = req.file ? `/public/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO members (name, expiry, status, image_url, member_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, expiry, status, image_url, member_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// Get all members
app.get("/members", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM members ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// Delete member
app.delete("/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM members WHERE id = $1", [id]);
    res.json({ message: "Member deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
