const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
app.use(bodyParser.json());

// ✅ MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL!");
  }
});

// ✅ TTN webhook endpoint
app.post("/uplink", (req, res) => {
  console.log("📥 Received data:", req.body);

  const uplink = req.body.uplink_message;
  if (!uplink || !uplink.decoded_payload) {
    return res.status(400).send("Invalid payload");
  }

  // ✅ Match TTN payload field names
  const pm1 = uplink.decoded_payload.PM1_0 || null;
  const pm25 = uplink.decoded_payload.PM2_5 || null;
  const pm10 = uplink.decoded_payload.PM10 || null;

  // ✅ Convert UTC -> Asia/Manila (+8h)
  const ttnTimestamp = uplink.received_at ? new Date(uplink.received_at) : new Date();
  const localTimestamp = new Date(ttnTimestamp.getTime() + 8 * 60 * 60 * 1000) // add 8 hours
    .toISOString()
    .slice(0, 19)
    .replace("T", " "); // format as "YYYY-MM-DD HH:mm:ss"

  // Insert into MySQL
  const sql =
    "INSERT INTO pm_readings (pm1_0, pm2_5, pm10, timestamp) VALUES (?, ?, ?, ?)";
  db.query(sql, [pm1, pm25, pm10, localTimestamp], (err, result) => {
    if (err) {
      console.error("❌ Error inserting:", err);
      return res.status(500).send("DB insert failed");
    }
    console.log("✅ Inserted:", result.insertId);
    res.status(200).send("Data stored successfully");
  });
});

// ✅ Railway will use PORT env var
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
