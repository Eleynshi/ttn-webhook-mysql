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

  const pm1 = uplink.decoded_payload.pm1;
  const pm25 = uplink.decoded_payload.pm25;
  const pm10 = uplink.decoded_payload.pm10;
  const receivedAt = uplink.received_at || new Date();

  // Insert into MySQL
  const sql = "INSERT INTO pm_readings (pm1_0, pm2_5, pm10, timestamp) VALUES (?, ?, ?, ?)";
  db.query(sql, [pm1, pm25, pm10, receivedAt], (err, result) => {
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



