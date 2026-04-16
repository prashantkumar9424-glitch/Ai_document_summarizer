# AI Content Assistant

A comprehensive AI-powered application for document summarization, image analysis, and conversational assistance with persistent memory.

## 🚀 Features

- **Document Summarization**: Upload PDF, DOCX, or TXT files for AI-powered summaries
- **Image Analysis**: OCR text extraction and visual understanding from images
- **AI Chat Assistant**: Conversational interface grounded in uploaded content
- **Persistent Memory**: Long-term memory using Hindsight API for context-aware responses
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External APIs │
│   (React)       │◄──►│   (Node.js)     │◄──►│                 │
│                 │    │                 │    │ • Groq API      │
│ • Upload UI     │    │ • File Parsing  │    │ • Hindsight API │
│ • Chat Interface│    │ • OCR Processing│    │                 │
│ • Summary Display│    │ • API Routes   │    └─────────────────┘
└─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Document Upload**: File → Parsing → Groq API → Summary → Hindsight Memory
2. **Image Upload**: Image → OCR → Groq Analysis → Summary → Hindsight Memory
3. **Chat**: User Message → Hindsight Recall → Groq Response → Hindsight Storage

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Axios** for API calls
- Responsive, mobile-first design

### Backend
- **Node.js** with Express.js
- **Multer** for file uploads
- **pdf-parse** for PDF processing
- **mammoth** for DOCX processing
- **tesseract.js** for OCR
- **dotenv** for environment variables
- **CORS** for cross-origin requests

### AI & Memory
- **Groq API** (Llama 3 70B) for LLM inference
- **Hindsight API** for persistent memory and retrieval

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - Groq API key
  - Hindsight API key

## 🚀 Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Backend setup
cd backend
npm install

# Frontend setup
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `.env` file in the `backend` directory:

```env
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
HINDSIGHT_API_KEY=your_hindsight_api_key_here
```

### 3. Start the Application

```bash
# Terminal 1: Start Backend
cd backend
npm start

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### 4. Access the Application

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔧 API Integration Details

### Groq API Integration

The application uses Groq's Llama 3 70B model for:
- **Document Summarization**: Structured summaries with short overview, bullet points, and key insights
- **Image Analysis**: OCR text interpretation and visual understanding
- **Chat Responses**: Context-aware conversational responses

**Key Features:**
- Centralized in `groqService.js`
- Structured prompts for consistent output
- Error handling and retry logic
- Temperature and token limits configured

### Hindsight Memory Integration

Hindsight provides persistent memory across sessions:
- **Document Storage**: Saves summaries with metadata
- **Image Storage**: Stores analysis results
- **Chat History**: Maintains conversation context
- **Context Retrieval**: Semantic search for relevant information

**Memory Types:**
- `document_summary`: Document processing results
- `image_summary`: Image analysis results
- `chat`: Conversation messages

## 📁 Project Structure

```
/
├── backend/
│   ├── server.js              # Express server setup
│   ├── routes/
│   │   ├── summarize.js       # Document summarization endpoint
│   │   ├── image.js          # Image analysis endpoint
│   │   ├── chat.js           # Chat API endpoint
│   ├── services/
│   │   ├── groqService.js    # Groq API integration
│   │   ├── hindsightService.js # Memory management
│   ├── utils/
│   │   ├── fileParser.js     # Document parsing utilities
│   │   ├── ocr.js           # OCR processing
│   ├── uploads/              # File upload directory
│   ├── .env                  # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadCard.jsx    # Document upload interface
│   │   │   ├── ImageUpload.js    # Image upload interface
│   │   │   ├── ChatBox.jsx       # Chat interface
│   │   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   │   └── Summary.jsx       # Results display
│   │   ├── pages/
│   │   │   └── Home.jsx          # Main application page
│   │   ├── services/
│   │   │   └── api.js            # Frontend API client
│   │   ├── App.jsx               # Root component
│   │   ├── main.jsx              # Application entry point
│   │   └── index.css             # Global styles
│   ├── tailwind.config.js        # Tailwind configuration
│   ├── postcss.config.js         # PostCSS configuration
│   ├── vite.config.js            # Vite configuration
│   ├── package.json
│   └── index.html
└── README.md
```

## 🎨 UI/UX Design

- **Clean SaaS Interface**: White background with subtle shadows
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Intuitive Navigation**: Sidebar-based navigation with clear sections
- **Loading States**: Spinner indicators during processing
- **Error Handling**: User-friendly error messages and toast notifications
- **Accessibility**: Proper contrast ratios and keyboard navigation

## 🔒 Security & Production Considerations

- **File Upload Validation**: Type and size restrictions
- **Error Handling**: Comprehensive error catching and user feedback
- **Environment Variables**: Sensitive data stored securely
- **CORS Configuration**: Proper cross-origin request handling
- **Input Sanitization**: Validation of user inputs

## 🚀 Deployment

### Backend Deployment
```bash
# Build for production
npm run build

# Use PM2 or similar for production
pm2 start server.js --name "ai-backend"
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Serve static files with nginx/apache or deploy to Vercel/Netlify
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
- Check if PORT 5000 is available
- Verify API keys in `.env`
- Ensure all dependencies are installed

**File upload fails:**
- Check file size limits (10MB for documents, 5MB for images)
- Verify supported file types
- Check uploads directory permissions

**OCR not working:**
- Ensure tesseract.js is properly installed
- Check image quality and text clarity

**Memory not persisting:**
- Verify Hindsight API key
- Check network connectivity to Hindsight API

### Development Tips

- Use browser dev tools for debugging
- Check server logs for backend errors
- Test with small files first
- Use the browser's network tab to monitor API calls