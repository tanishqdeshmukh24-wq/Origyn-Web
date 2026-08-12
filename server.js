const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.get("/", (req, res) => {
    res.json({
        message: "Origyn backend is running!"
    });
});

app.get("/api/technologies", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM technologies ORDER BY id DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Origyn backend running on http://localhost:${PORT}`);
});