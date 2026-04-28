import express from 'express';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/webhook', asyncHandler(async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Invalid webhook data' });
    logger.info('Telegram webhook received', { messageText: message.text });
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    logger.error('Error processing Telegram webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
}));

router.get('/status', asyncHandler(async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}));

export default router;
