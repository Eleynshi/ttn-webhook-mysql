const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const axios = require("axios"); // for keep-alive ping

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");
});

// TTN webhook endpoint
app.post("/ttn", (req, res) => {
  const uplinkMessage = req.body.uplink_message;

  if (uplinkMessage && uplinkMessage.decoded_payload) {
    const pm1 = uplinkMessage.decoded_payload.PM1_0;
    const pm25 = uplinkMessage.decoded_payload.PM2_5;
    const pm10 = uplinkMessage.decoded_payload.PM10;
    const timestamp = new Date(); // server local time

    const query =
      "INSERT INTO pm_readings (pm1_0, pm2_5, pm10, timestamp) VALUES (?, ?, ?, ?)";
    db.query(query, [pm1, pm25, pm10, timestamp], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        res.status(500).send("Database insert error");
      } else {
        console.log("Data inserted:", { pm1, pm25, pm10, timestamp });
        res.status(200).send("Data received");
      }
    });
  } else {
    res.status(400).send("Invalid payload");
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("Server is running and listening for TTN data!");
});

// Keep-alive ping every 5 minutes
setInterval(() => {
  axios
    .get(`https://${process.env.RAILWAY_STATIC_URL || "your-app-name.up.railway.app"}`)
    .then(() => console.log("Keep-alive ping sent"))
    .catch((err) => console.error("Keep-alive ping failed:", err.message));
}, 5 * 60 * 1000); // every 5 minutes

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
