import TelegramBot from 'node-telegram-bot-api';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;


export async function sendTelegramMessagev2(message: string) {
  
  if (!botToken || !chatId) {
    const errorMessage = 'Telegram bot token or chat ID is not configured.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const bot = new TelegramBot(botToken, { polling: false });

  try {
    bot.sendMessage(chatId, message);

    console.log('Telegram message sent successfully:');
    
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    if (error instanceof Error) {
      throw new Error(`Error sending Telegram message: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending the Telegram message.');
  }
}