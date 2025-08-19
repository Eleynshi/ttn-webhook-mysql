import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2";
import dotenv from "dotenv";
import moment from "moment-timezone";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// ✅ MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err.stack);
    return;
  }
  console.log("✅ Connected to database");
});

// ✅ Webhook endpoint
app.post("/uplink", (req, res) => {
  try {
    const uplink = req.body.uplink_message;

    if (!uplink || !uplink.decoded_payload) {
      console.error("❌ Invalid payload:", req.body);
      return res.status(400).send("Invalid payload");
    }

    // ✅ Extract sensor values from TTN payload
    const pm1 = uplink.decoded_payload.PM1_0 || null;
    const pm25 = uplink.decoded_payload.PM2_5 || null;
    const pm10 = uplink.decoded_payload.PM10 || null;

    // ✅ Fix timestamp → convert to Asia/Manila
    const ttnTimestamp = uplink.received_at || new Date().toISOString();
    const localTimestamp = moment(ttnTimestamp)
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

    console.log("📥 Received:", { pm1, pm25, pm10, localTimestamp });

    // ✅ Insert into MySQL
    const sql =
      "INSERT INTO pm_readings (pm1_0, pm2_5, pm10, timestamp) VALUES (?, ?, ?, ?)";
    db.query(sql, [pm1, pm25, pm10, localTimestamp], (err, result) => {
      if (err) {
        console.error("❌ Error inserting data:", err);
        return res.status(500).send("Database error");
      }
      console.log("✅ Data inserted:", result.insertId);
      res.status(200).send("Data inserted");
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
