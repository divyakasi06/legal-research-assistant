const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const chunkText = require("../utils/chunkText");
const { embedText } = require("../utils/gemini");
const Chunk = require("../models/Chunk");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

function checkAdmin(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong or missing admin password" });
  }
  next();
}

router.post("/", checkAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();

    const pieces = chunkText(result.text);

    const savedChunks = [];
    for (let i = 0; i < pieces.length; i++) {
      const embedding = await embedText(pieces[i]);
      const chunk = await Chunk.create({
        documentName: req.file.originalname,
        chunkIndex: i,
        text: pieces[i],
        embedding,
      });
      savedChunks.push(chunk._id);
    }

    res.json({
      filename: req.file.originalname,
      pages: result.pages ? result.pages.length : undefined,
      totalChunks: pieces.length,
      savedChunkIds: savedChunks.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;