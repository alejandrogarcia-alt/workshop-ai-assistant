import dotenv from 'dotenv';
// Load env vars BEFORE importing other modules
dotenv.config();

import express from 'express';
import cors from 'cors';
import workshopRoutes from './routes/workshop.js';
import figmaRoutes from './routes/figma.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/workshop', workshopRoutes);
app.use('/api/figma', figmaRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Workshop AI Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
