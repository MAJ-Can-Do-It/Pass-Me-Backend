import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger.js';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

export async function sendBookingNotification(chatId, bookingDetails) {
  try {
    const message = `
📚 <b>New Booking Request</b>

<b>Student:</b> ${bookingDetails.studentName}
<b>Subject:</b> ${bookingDetails.subject}
<b>Date:</b> ${bookingDetails.date}
<b>Time:</b> ${bookingDetails.time}
<b>Duration:</b> ${bookingDetails.duration} min
<b>Type:</b> ${bookingDetails.type}

<b>Student Notes:</b>
${bookingDetails.studentNotes || 'None'}
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Accept', callback_data: `accept_${bookingDetails.bookingId}` },
          { text: '❌ Decline', callback_data: `decline_${bookingDetails.bookingId}` }
        ]
      ]
    };

    const result = await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    logger.info('Booking notification sent to Telegram', { chatId, bookingId: bookingDetails.bookingId });
    return result;
  } catch (error) {
    logger.error('Error sending Telegram notification:', error);
    throw error;
  }
}

export async function sendMessage(chatId, text, keyboard = null) {
  try {
    const options = { parse_mode: 'HTML' };
    if (keyboard) {
      options.reply_markup = keyboard;
    }

    const result = await bot.sendMessage(chatId, text, options);
    logger.info('Message sent to Telegram', { chatId });
    return result;
  } catch (error) {
    logger.error('Error sending Telegram message:', error);
    throw error;
  }
}

export async function editMessage(chatId, messageId, text, keyboard = null) {
  try {
    const options = { parse_mode: 'HTML' };
    if (keyboard) {
      options.reply_markup = keyboard;
    }

    const result = await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options
    });

    logger.info('Message edited on Telegram', { chatId, messageId });
    return result;
  } catch (error) {
    logger.error('Error editing Telegram message:', error);
    throw error;
  }
}

export function setupBotCommands() {
  bot.onText(/\/start/, async (msg) => {
    await sendMessage(msg.chat.id, '👋 Welcome to Pass Me Bot!\nUse /help for available commands.');
  });

  bot.onText(/\/help/, async (msg) => {
    const helpText = `
📖 <b>Available Commands:</b>
/my_bookings - View your booking requests
/earnings - Check your earnings
/settings - Update your settings
/help - Show this help message
    `;
    await sendMessage(msg.chat.id, helpText);
  });

  bot.on('callback_query', async (query) => {
    logger.debug('Callback query received:', { data: query.data });
  });

  logger.info('Telegram bot commands setup complete');
}

export default {
  sendBookingNotification,
  sendMessage,
  editMessage,
  setupBotCommands
};
