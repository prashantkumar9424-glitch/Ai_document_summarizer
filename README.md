# AI Document & Image Analyzer with Contextual Chat

[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)](https://github.com/) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

This is a full-stack web application for **uploading documents and images, extracting/summarizing content using AI + OCR, and chatting with context preserved across sessions**. 

- **Backend**: Node.js/Express server powered by [Groq](https://groq.com) for fast AI inference (Llama 3.3 vision/text models) and [Hindsight.ai](https://hindsight.ai) for long-term memory storage.
- **Frontend**: Modern React app with Tailwind CSS for intuitive UI (upload panels, chat, summaries, history).
- **Key Workflow**: Upload file/image → OCR/text extraction → AI markdown summary → Save to memory → Chat grounded in your uploads.

Perfect for research, analysis, note-taking from PDFs/images, visual data extraction.

## Features

- 📄 **Document Summarization**: Upload PDFs/text files, extract content, get structured AI summary (overview, key details, follow-up questions).
- 🖼️ **Image Analysis**: Upload images (JPEG/PNG/WEBP), perform OCR + vision AI analysis, handles text/graphics.
- 💬 **Contextual Chat**: Talk to AI about your uploads; pulls relevant memory/history automatically.
- 📜 **History & Sessions**: View past summaries, chats, activity feed.
- 🔒 **Secure Uploads**: Temp storage, size limits (10MB docs, images), auto-cleanup.
- 🎯 **Production-Ready**: Env-based config, error handling, streaming responses.

## Tech Stack

### Backend
- **Runtime**: Node.js, Express.js
- **AI**: Groq API (llama-3.3-70b-versatile for vision/text/chat)
- **Memory**: Hindsight.ai API
- **OCR**: Tesseract.js
- **File Handling**: Multer, pdf-parse
- **Storage**: Local filesystem (`storage/uploads`)

### Frontend
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS, PostCSS
- **HTTP**: Axios
- **UI Components**: Custom (ChatBox, UploadCard, Toast, Sidebar)

### Scripts
- Backend: `npm start` or `npm run dev` (server.js on port 3000?)
- Frontend: `npm run dev` (Vite on :5173)

## Prerequisites

1. **Node.js** (v18+)
2. **API Keys**:
   - `GROQ_API_KEY`: From [console.groq.com](https://console.groq.com)
   - `HINDSIGHT_API_KEY`: From [hindsight.ai](https://hindsight.ai)
3. (Optional) Tesseract data (eng.traineddata included)

## Installation

```bash
# Clone or navigate to project (already local)
cd c:/Users/dell/OneDrive/Desktop/project1

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## .env Example (backend/.env)

```
GROQ_API_KEY=your_groq_key_here
HINDSIGHT_API_KEY=your_hindsight_key_here
PORT=3000
GROQ_MODEL=llama-3.3-70b-versatile
HINDSIGHT_API_URL=https://api.hindsight.ai
```

## Running the App

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   # or npm run dev
   ```
   Server runs at `http://localhost:3000`

2. **Start Frontend** (new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   App opens at `http://localhost:5173`

3. Open browser to frontend URL, upload files, chat!

## API Endpoints

All under `/api/` (POST multipart/form-data or JSON).

| Endpoint | Method | Description | Params |
|----------|--------|-------------|--------|
| `/api/summarize` | POST | Summarize document | `file` (PDF/text, max 10MB) |
| `/api/image` | POST | Analyze image w/ OCR+vision | `image` (JPEG/PNG/WEBP) |
| `/api/chat` | POST | Send chat message | JSON `{ message: string }` (auto-loads context) |

**Responses**: JSON `{ summary: markdown, ocrText?, filename?, mode: 'vision'|'ocr'|'text' }`

Health check: `GET /health` → `{ status: 'ok', groqConfigured: true, hindsightConfigured: true }`

## Usage

1. **Upload Document**: Drag PDF → Get summary → 2-3 follow-up Qs suggested.
2. **Upload Image**: Drag photo → OCR text + visual desc (e.g., charts/tables) → Summary.
3. **Chat**: Type query → AI references your uploads/memory: \"Based on the image summary...\"
4. **History**: Sidebar shows sessions, summaries, reload context.

![Demo Screenshot](screenshots/demo.png) *(Add your screenshots here)*

## Troubleshooting

- **No summary**: Check API keys, file size/type (PDF/images only).
- **OCR fails**: Ensure `eng.traineddata` present.
- **CORS**: Frontend origin auto-config.
- Logs: Console output for errors.

## Contributing

1. Fork & PR.
2. Install deps, run tests (add if needed).
3. Follow ESLint/Prettier.

## License

MIT License - see [LICENSE](LICENSE) *(create if needed)*.

---

⭐ Star on GitHub! Questions? Open issue.
