# 📚 AI Research Assistant

A full-stack, AI-powered web application designed to help researchers, students, and professionals quickly analyze, summarize, and query complex PDF documents using Retrieval-Augmented Generation (RAG).

## ✨ Features

* **Intelligent Document Processing:** Upload any research paper or PDF. The app extracts the text, chunks it, and generates high-dimensional embeddings.
* **Retrieval-Augmented Generation (RAG):** Ask complex questions about the document. The AI retrieves the exact relevant pages and formulates an academic answer, complete with source citations.
* **Instant Summarization:** Automatically generates a concise summary of the document's core concepts.
* **Native Text-to-Speech (Read Aloud):** Built-in accessibility feature using the browser's native Web Speech API to automatically read summaries and answers aloud, complete with Play/Stop controls.
* **Cost-Optimized Hybrid AI Architecture:** Uses Google's Gemini models for backend embeddings (high accuracy) and OpenRouter's dynamic free-tier models (like Mistral 7B) for generation, effectively bypassing strict API billing walls.

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* Tailwind CSS (Styling)
* Lucide React (Icons)
* Web Speech API (Text-to-Speech)

**Backend:**
* Python & FastAPI
* LangChain (LLM Orchestration)
* FAISS (In-memory Vector Database)
* PyPDFLoader & RecursiveCharacterTextSplitter

**AI & Models:**
* **Embeddings:** Google Generative AI (`gemini-embedding-001`)
* **LLM / Generation:** OpenRouter Auto-Routing (`openrouter/free` -> Mistral/LLaMA)

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+
* API Keys for [Google AI Studio](https://aistudio.google.com/) and [OpenRouter](https://openrouter.ai/)

### 1. Backend Setup
Navigate to the backend directory and set up your Python environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
pip install -r requirements.txt
