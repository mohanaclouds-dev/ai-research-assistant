import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Send, FileText, Trash2, Loader2, BookOpen, Volume2, Square } from 'lucide-react';
import { uploadDocument, askQuestion, getSummary, deleteDocument } from './api';

export default function App() {
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  
  // Tracks which text is currently being spoken
  const [currentlyReading, setCurrentlyReading] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Cleanup audio if the user leaves the app
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // --- AUDIO CONTROL FUNCTIONS ---
  const stopReading = () => {
    window.speechSynthesis.cancel();
    setCurrentlyReading(null);
  };

  const startReading = (textToRead) => {
    // Always stop any current speech first to prevent overlapping
    stopReading();

    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // When it finishes naturally, reset the UI
    utterance.onend = () => setCurrentlyReading(null);
    utterance.onerror = () => setCurrentlyReading(null);
    
    window.speechSynthesis.speak(utterance);
    setCurrentlyReading(textToRead);
  };

  const toggleReadAloud = (textToRead) => {
    if (currentlyReading === textToRead) {
      stopReading(); // User clicked stop
    } else {
      startReading(textToRead); // User clicked play on a specific message
    }
  };
  // ------------------------------

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsLoading(true);
    try {
      const res = await uploadDocument(file);
      setDocId(res.data.doc_id);
      
      const welcomeMessage = 'Document successfully analyzed! What would you like to know about it?';
      setMessages([{ role: 'assistant', content: welcomeMessage, citations: null }]);
      
      // AUTO-READ: Read the welcome message
      startReading(welcomeMessage);
      
    } catch (error) {
      alert('Error uploading document. Please ensure it is a valid PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !docId) return;

    // Stop any ongoing reading when the user sends a new question
    stopReading();

    const userMessage = { role: 'user', content: inputMessage };
    const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await askQuestion(docId, userMessage.content, chatHistory);
      const answerText = res.data.answer;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answerText,
        citations: res.data.citations
      }]);
      
      // AUTO-READ: Read the newly generated answer!
      startReading(answerText);
      
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred while generating the answer.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSummary = async () => {
    if (!docId) return;
    
    // Stop any current reading
    stopReading();
    setIsLoading(true);
    
    try {
      const res = await getSummary(docId);
      const summaryText = res.data.summary;
      setSummary(summaryText);
      
      // AUTO-READ: Read the newly generated summary!
      startReading(summaryText);
      
    } catch (error) {
      alert('Error generating summary. Document might be too large.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    // Silence audio when deleting a document
    stopReading();

    await deleteDocument(docId);
    setDocId(null);
    setFile(null);
    setSummary(null);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r p-6 flex flex-col shadow-sm">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-600">
          <BookOpen size={24} /> AI Research Asst
        </h1>

        {!docId ? (
          <form onSubmit={handleFileUpload} className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center hover:bg-gray-50 transition cursor-pointer">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden" 
                id="file-upload" 
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">{file ? file.name : 'Select a PDF Paper'}</span>
              </label>
            </div>
            <button 
              type="submit" 
              disabled={!file || isLoading}
              className="bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Upload & Process'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-indigo-50 text-indigo-800 rounded-md border border-indigo-100 flex justify-between items-center">
              <span className="truncate text-sm font-medium pr-2">{file?.name}</span>
              <button onClick={handleDelete} className="text-red-500 hover:text-red-700" title="Delete Document">
                <Trash2 size={18} />
              </button>
            </div>
            
            <button 
              onClick={handleGetSummary}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-white border border-gray-300 shadow-sm py-2 rounded-md hover:bg-gray-50 transition"
            >
              <FileText size={18} /> Generate Summary
            </button>

            {summary && (
              <div className="mt-4 p-4 bg-yellow-50 text-sm text-gray-700 rounded-md border border-yellow-200 overflow-y-auto max-h-60 shadow-inner">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-yellow-200">
                  <h3 className="font-bold text-yellow-800">Document Summary</h3>
                  <button
                    onClick={() => toggleReadAloud(summary)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      currentlyReading === summary
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-white text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                    }`}
                  >
                    {currentlyReading === summary ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                    {currentlyReading === summary ? 'Stop' : 'Listen'}
                  </button>
                </div>
                <p>{summary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-4">
              <BookOpen size={48} className="opacity-20" />
              <p>Upload a document to start your research.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-4 rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-800'}`}>
                  
                  {msg.role === 'assistant' && (
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen size={14} /> AI Assistant
                      </span>
                      <button
                        onClick={() => toggleReadAloud(msg.content)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          currentlyReading === msg.content
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
                        }`}
                      >
                        {currentlyReading === msg.content ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                        {currentlyReading === msg.content ? 'Stop' : 'Listen'}
                      </button>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Sources:</p>
                      <div className="flex flex-col gap-2">
                        {msg.citations.map((cite, i) => (
                          <div key={i} className="bg-gray-50 p-2 rounded text-xs text-gray-600 border line-clamp-2 hover:line-clamp-none transition-all cursor-help">
                            <span className="font-bold mr-1">Pg {cite.page}:</span>
                            {cite.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-white border p-4 rounded-xl shadow-sm flex items-center gap-2 text-gray-500">
                <Loader2 size={18} className="animate-spin" /> Analyzing context...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t">
          <form onSubmit={handleSendMessage} className="flex gap-4 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={!docId || isLoading}
              placeholder={docId ? "Ask a question about the document..." : "Upload a document first..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 transition"
            />
            <button
              type="submit"
              disabled={!docId || isLoading || !inputMessage.trim()}
              className="bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition shadow-sm"
            >
              <Send size={18} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}