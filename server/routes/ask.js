const express = require("express");
const Chunk = require("../models/Chunk");
const { embedText } = require("../utils/gemini");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Models to try, in order. If the first is busy, the next one is used.
const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// true when the error is a temporary Google problem (busy / rate limit)
function isTemporary(err) {
  const text = `${err.status || ""} ${err.message || ""}`;
  return /503|429|500|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(text);
}

// Try each model up to 3 times, waiting a bit longer each time
async function generateWithRetry(prompt) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await ai.models.generateContent({ model, contents: prompt });
      } catch (err) {
        lastErr = err;
        console.error(`Gemini ${model} attempt ${attempt} failed:`, err.message);
        if (!isTemporary(err)) throw err;
        await sleep(attempt * 1500);
      }
    }
  }
  throw lastErr;
}

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

    const result = await generateWithRetry(prompt);

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
    if (isTemporary(err)) {
      return res.status(503).json({
        error: "The AI service is busy right now. Please try again in a few seconds.",
      });
    }
    res.status(500).json({ error: err.message, cause: err.cause?.message });
  }
});

module.exports = router;