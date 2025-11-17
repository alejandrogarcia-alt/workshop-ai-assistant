import express from 'express';
import geminiService from '../services/geminiService.js';

const router = express.Router();

// Analyze text input
router.post('/analyze', async (req, res) => {
  try {
    const { text, type } = req.body;
    const analysis = await geminiService.analyzeContent(text, type);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Group items semantically
router.post('/group', async (req, res) => {
  try {
    const { items, context } = req.body;
    const groups = await geminiService.groupItems(items, context);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI guidance for current step
router.post('/guidance', async (req, res) => {
  try {
    const { currentStep, context } = req.body;
    const guidance = await geminiService.getNextStep(currentStep, context);
    res.json(guidance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
