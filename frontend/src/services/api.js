import axios from 'axios';

// Use environment variable for production, fallback to /api for local dev
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Workshop API
export const workshopApi = {
  list: () => api.get('/workshop'),
  create: (boardName) => api.post('/workshop/create', { boardName }),
  get: (workshopId) => api.get(`/workshop/${workshopId}`),
  addItem: (workshopId, text, step, moduleId = null) =>
    api.post(`/workshop/${workshopId}/add-item`, { text, step, moduleId }),
  groupItems: (workshopId, step) =>
    api.post(`/workshop/${workshopId}/group-items`, { step }),
  nextStep: (workshopId) => api.post(`/workshop/${workshopId}/next-step`),
  prevStep: (workshopId) => api.post(`/workshop/${workshopId}/prev-step`),
  setStep: (workshopId, step) => api.post(`/workshop/${workshopId}/set-step`, { step }),
  setFigmaBoard: (workshopId, boardId, boardUrl) =>
    api.post(`/workshop/${workshopId}/set-figma-board`, { boardId, boardUrl }),
  vote: (workshopId, featureId, value, complexity, participantId) =>
    api.post(`/workshop/${workshopId}/vote`, { featureId, value, complexity, participantId }),
  export: (workshopId) => api.get(`/workshop/${workshopId}/export`),
  import: (boardName, workshopData) => api.post('/workshop/import', { boardName, workshopData }),
  deleteItem: (workshopId, itemId, step, moduleId = null) =>
    api.delete(`/workshop/${workshopId}/delete-item`, { data: { itemId, step, moduleId } }),
  editItem: (workshopId, itemId, text, step, moduleId = null) =>
    api.put(`/workshop/${workshopId}/edit-item`, { itemId, text, step, moduleId })
};

// Figma API
export const figmaApi = {
  createBoard: (name, workshopId) =>
    api.post('/figma/create-board', { name, workshopId }),
  addSticky: (boardId, text, x, y, color) =>
    api.post(`/figma/${boardId}/add-sticky`, { text, x, y, color }),
  addLabel: (boardId, text, x, y, fontSize) =>
    api.post(`/figma/${boardId}/add-label`, { text, x, y, fontSize }),
  createGroupedLayout: (boardId, groups, frameName) =>
    api.post(`/figma/${boardId}/create-grouped-layout`, { groups, frameName }),
  createMatrix: (boardId, features) =>
    api.post(`/figma/${boardId}/create-matrix`, { features }),
  getBoard: (boardId) => api.get(`/figma/${boardId}`)
};

// AI API
export const aiApi = {
  analyze: (text, type) => api.post('/ai/analyze', { text, type }),
  group: (items, context) => api.post('/ai/group', { items, context }),
  guidance: (currentStep, context) => api.post('/ai/guidance', { currentStep, context })
};

export default api;
