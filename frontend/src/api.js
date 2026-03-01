import axios from 'axios';

// This will use your live backend URL when deployed, and localhost when testing on your computer
const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://ai-research-backend1.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});


export const uploadDocument = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const askQuestion = (docId, question, history) => {
  return api.post('/ask', { doc_id: docId, question, history });
};

export const getSummary = (docId) => {
  return api.get(`/summary/${docId}`);
};

export const deleteDocument = (docId) => {
  return api.delete(`/documents/${docId}`);
};
