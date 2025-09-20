
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(message: string) {
  if (!botToken || !chatId) {
    const errorMessage = 'Telegram bot token or chat ID is not configured.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const params = new URLSearchParams({
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Error sending Telegram message: ${data.description}`);
    }
    console.log('Telegram message sent successfully:', data.result.message_id);
    return data.result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    if (error instanceof Error) {
      throw new Error(`Error sending Telegram message: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending the Telegram message.');
  }
}
