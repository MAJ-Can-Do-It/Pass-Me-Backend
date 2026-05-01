import axios from 'axios';
import { logger } from '../utils/logger.js';

const TELEGRAM_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

export async function sendAdminNotification(message) {
  logger.info('sendAdminNotification called', { hasToken: !!TELEGRAM_BOT_TOKEN, hasGroupId: !!ADMIN_GROUP_ID });

  if (!TELEGRAM_BOT_TOKEN || !ADMIN_GROUP_ID) {
    logger.warn('Admin bot not configured - ADMIN_BOT_TOKEN or ADMIN_GROUP_ID missing');
    console.error('Missing env vars:', { TELEGRAM_BOT_TOKEN: !!TELEGRAM_BOT_TOKEN, ADMIN_GROUP_ID: !!ADMIN_GROUP_ID });
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    logger.info('Sending Telegram notification', { url: url.substring(0, 50) + '...', groupId: ADMIN_GROUP_ID });

    const response = await axios.post(url, {
      chat_id: ADMIN_GROUP_ID,
      text: message,
      parse_mode: 'HTML'
    });

    logger.info('Admin notification sent', { messageId: response.data.result.message_id });
    return response.data;
  } catch (error) {
    logger.error('Failed to send admin notification', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    console.error('Telegram API error:', error.response?.data || error.message);
  }
}

export function formatBookingNotification(booking, event) {
  const baseInfo = `
📚 <b>Booking Event</b>
Student: ${booking.studentName}
Tutor: ${booking.tutorName}
Subject: ${booking.subject}
Type: ${booking.type === 'individual' ? 'Individual (1 week)' : 'Group (2 weeks)'}
Course Price: ${booking.amount?.toLocaleString() || 0} UZS
Booking ID: <code>${booking.id}</code>
`;

  const eventMessages = {
    new: `🆕 <b>NEW BOOKING REQUEST</b>\n${baseInfo}Date: ${booking.date}\nTime: ${booking.time}\nStudent Notes: ${booking.studentNotes || 'None'}`,
    approved: `✅ <b>BOOKING APPROVED</b>\n${baseInfo}Approved at: ${new Date().toLocaleString()}`,
    rejected: `❌ <b>BOOKING REJECTED</b>\n${baseInfo}Rejected at: ${new Date().toLocaleString()}`,
    completed: `🎉 <b>BOOKING COMPLETED</b>\n${baseInfo}Tutor Earnings: ${booking.tutorEarnings?.toLocaleString() || 0} UZS\nCompleted at: ${new Date().toLocaleString()}`
  };

  return eventMessages[event] || baseInfo;
}
