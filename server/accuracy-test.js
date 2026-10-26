// accuracy-test.js - run with the backend already running
const BASE = "http://localhost:5000/api";

// any = at least one of these phrases must appear in the retrieved text
const tests = [
  { q: "What is the effect of a mistake as to law?", any: ["mistakes as to law"] },
  { q: "What is coercion?", any: ["Indian Penal Code"] },
  { q: "What is undue influence?", any: ["dominate the will", "position to dominate"] },
  { q: "What is fraud under the Contract Act?", any: ["intent to deceive"] },
  { q: "Which agreements are void for lack of consideration?", any: ["without consideration"] },
  { q: "What compensation is payable for breach of contract?", any: ["loss or damage"] },
  { q: "Can a person of unsound mind make a contract?", any: ["unsound mind"] },
  { q: "Who is competent to contract?", any: ["age of majority", "sound mind"] },
  { q: "When is a contract voidable?", any: ["voidable"] },
  { q: "What happens when a penalty is stipulated in a contract?", any: ["penalty"] },
  // out-of-scope questions: the assistant should refuse
  { q: "What is the capital of France?", refuse: true },
  { q: "What is the punishment for murder?", refuse: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) return data;
    } catch (e) {}
    await sleep(5000); // wait and retry (Gemini can be busy)
  }
  return null;
}

(async () => {
  let retrievalHits = 0, retrievalTotal = 0;
  let answered = 0, answerTotal = 0;
  let refusedOk = 0, refuseTotal = 0;
  const rows = [];

  for (const t of tests) {
    let retrieval = "-", answer = "-";

    if (!t.refuse) {
      const s = await post("/search", { query: t.q });
      const text = (s?.results || []).map((r) => r.text).join(" ").toLowerCase();
      const hit = t.any.some((k) => text.includes(k.toLowerCase()));
      retrievalTotal++; if (hit) retrievalHits++;
      retrieval = hit ? "PASS" : "FAIL";
    }

    const a = await post("/ask", { query: t.q });
    const ans = (a?.answer || "").toLowerCase();
    const refused = ans.includes("could not find");
    if (t.refuse) {
      refuseTotal++; if (refused) refusedOk++;
      answer = refused ? "PASS (refused)" : "FAIL (answered)";
    } else {
      answerTotal++;
      const ok = !refused && ans.includes("[source");
      if (ok) answered++;
      answer = ok ? "PASS (cited)" : "FAIL";
    }

    rows.push({ question: t.q, retrieval, answer });
    console.log(`${t.q}\n   search: ${retrieval} | answer: ${answer}`);
    await sleep(4000); // be gentle with the free API limit
  }

  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + "%";
  console.log("\n===== RESULTS =====");
  console.log(`Retrieval accuracy : ${retrievalHits}/${retrievalTotal} (${pct(retrievalHits, retrievalTotal)})`);
  console.log(`Cited answers      : ${answered}/${answerTotal} (${pct(answered, answerTotal)})`);
  console.log(`Correct refusals   : ${refusedOk}/${refuseTotal} (${pct(refusedOk, refuseTotal)})`);

  require("fs").writeFileSync("accuracy-results.json", JSON.stringify(rows, null, 2));
  console.log("Saved to accuracy-results.json");
})();