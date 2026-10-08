const express = require("express");
const Chunk = require("../models/Chunk");
const { embedText } = require("../utils/gemini");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const queryEmbedding = await embedText(query);

    const matches = await Chunk.aggregate([
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

    const context = matches
      .map(
        (m, i) =>
          `[Source ${i + 1}: ${m.documentName}, chunk ${m.chunkIndex}]\n${m.text}`
      )
      .join("\n\n");

    const prompt = `You are a legal research assistant. Answer the question using ONLY the context below. Cite sources using [Source N] after each claim. If the answer isn't in the context, say "I could not find this in the provided documents."

Context:
${context}

Question: ${query}

Answer:`;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    res.json({
      query,
      answer: result.text,
      sources: matches.map((m) => ({
        documentName: m.documentName,
        chunkIndex: m.chunkIndex,
        score: m.score,
      })),
    });
  } catch (err) {
    console.error("ASK ERROR:", err);
    res.status(500).json({ error: err.message, cause: err.cause?.message });
  }
});

module.exports = router;