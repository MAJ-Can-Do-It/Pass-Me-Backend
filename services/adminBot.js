import axios from 'axios';
import { logger } from '../utils/logger.js';

const TELEGRAM_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

export async function sendAdminNotification(message) {
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_GROUP_ID) {
    logger.warn('Admin bot not configured - skipping notification');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: ADMIN_GROUP_ID,
      text: message,
      parse_mode: 'HTML'
    });

    logger.info('Admin notification sent', { messageId: response.data.result.message_id });
    return response.data;
  } catch (error) {
    logger.error('Failed to send admin notification:', error.message);
    // Don't throw - booking should succeed even if notification fails
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
