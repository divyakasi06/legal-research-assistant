\# AI-Based Legal Research Assistant for Commercial Disputes



A RAG (Retrieval-Augmented Generation) web app that answers legal questions only from uploaded legal documents, with source citations.



\*\*Live demo:\*\* https://legal-research-assistant-rust.vercel.app



\## Features

\- Upload legal PDFs (Acts, judgments, contracts) through an admin-protected card

\- Semantic search using Gemini embeddings and MongoDB Atlas Vector Search

\- Answers with \[Source N] citations, and refusal when the answer is not in the documents

\- Tested on 12 questions: retrieval 10/10, cited answers 10/10, refusals 2/2



\## Tech Stack

React + Vite, Node.js + Express, MongoDB Atlas Vector Search, Google Gemini API



\## How it works

PDF -> text -> chunks (1000 characters, 150 overlap) -> embeddings -> vector database -> question search -> Gemini answer with citations



\## Run locally

1\. `cd server`, create a `.env` file with `MONGO\_URI`, `GEMINI\_API\_KEY`, `ADMIN\_PASSWORD`, then run `npm install` and `node server.js`

2\. `cd client`, then run `npm install` and `npm run dev`



\## Deployment

Backend on Render, frontend on Vercel.



\## Author

Divyasri K, Dept. of IT, SRM Easwari Engineering College

Guide: Ms. Sai Lakshmi



For research and education only. This is not legal advice.

