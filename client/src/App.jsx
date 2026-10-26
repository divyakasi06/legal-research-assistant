import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function App() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const isAdmin = window.location.hash === "#admin";

  const askQuestion = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/ask`, { query: q });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.answer, sources: res.data.sources },
      ]);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong. Please try again in a moment. (" + msg + ")",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!file || uploading) return;
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setUploadStatus("Processing... this can take a few minutes. Please keep this page open.");

    try {
      const res = await axios.post(`${API}/upload`, formData, {
        timeout: 0,
        headers: { "x-admin-password": adminPassword },
      });
      setUploadStatus(`Done: ${res.data.filename} - ${res.data.totalChunks} chunks saved.`);
      setFile(null);
    } catch (err) {
      setUploadStatus("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="logo">
          LEGAL RESEARCH ASSISTANT
          <small>COMMERCIAL DISPUTES · AI-POWERED</small>
        </div>
      </header>

      <section className="hero">
        <div className="hero-box">
          <h1>Commercial Law Research</h1>
          <p>Cited answers from Indian commercial law</p>
        </div>
      </section>

      <main className="main">
        <section className="card">
          <h2>Ask a Legal Question</h2>
          <p className="hint">Answers come only from the uploaded legal documents, with sources.</p>
          <div className="chat">
            {messages.length === 0 && (
              <div className="empty">
                Try: "What happens if a contract is made by mistake?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role} ${m.isError ? "error" : ""}`}>
                {m.role === "assistant" ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="sources">
                    <strong>Sources</strong>
                    {m.sources.map((s, j) => (
                      <div key={j}>
                        [Source {j + 1}] {s.documentName} - chunk {s.chunkIndex} (match {(s.score * 100).toFixed(0)}%)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="msg assistant">Searching documents...</div>}
          </div>

          <form className="ask-form" onSubmit={askQuestion}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your legal question..."
            />
            <button type="submit" disabled={loading}>Ask</button>
          </form>
        </section>
                    {isAdmin && (
        <section className="card">
          <h2>Upload a Legal Document</h2>
          <p className="hint">Admin only. Add a PDF (an Act, a judgment, a contract) to the knowledge base.</p>
          <div className="upload-row">
            <input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button onClick={uploadFile} disabled={!file || !adminPassword || uploading}>
              {uploading ? "Processing..." : "Upload"}
            </button>
          </div>
          {uploadStatus && <div className="status">{uploadStatus}</div>}
        </section>
                )}
      </main>

      <footer className="footer">
        For research and education only. This is not legal advice.
      </footer>
    </div>
  );
}