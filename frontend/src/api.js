import axios from 'axios';

// Just the domain name, no /api at the end
const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://ai-research-backend1.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});

// Notice how we explicitly added /api to the start of every single route below!
export const uploadDocument = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const askQuestion = (docId, question, history) => {
  return api.post('/api/ask', { doc_id: docId, question, history });
};

export const getSummary = (docId) => {
  return api.get(`/api/summary/${docId}`);
};

export const deleteDocument = (docId) => {
  return api.delete(`/api/documents/${docId}`);
};
