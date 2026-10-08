const express = require("express");
const Chunk = require("../models/Chunk");
const { embedText } = require("../utils/gemini");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const queryEmbedding = await embedText(query);

    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $project: {
          documentName: 1,
          chunkIndex: 1,
          text: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    res.json({ query, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;