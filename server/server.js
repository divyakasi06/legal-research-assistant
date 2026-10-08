require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
const uploadRoute = require("./routes/upload");
app.use("/api/upload", uploadRoute);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 });
});
const searchRoute = require("./routes/search");
app.use("/api/search", searchRoute);
const askRoute = require("./routes/ask");
app.use("/api/ask", askRoute);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB connection failed:", err.message));