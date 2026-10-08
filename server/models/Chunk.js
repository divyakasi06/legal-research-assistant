const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  documentName: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Chunk", chunkSchema);