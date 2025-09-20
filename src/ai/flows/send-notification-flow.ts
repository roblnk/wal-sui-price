
'use server';
/**
 * @fileOverview A flow for sending an out-of-range notification.
 *
 * - sendNotificationFlow - A function that handles sending the notification.
 * - NotificationFlowInput - The input type for the notification function.
 */

import { ai } from '@/ai/genkit';
import { sendTelegramMessage } from '@/services/telegram';
import { z } from 'zod';

const NotificationFlowInputSchema = z.object({
  ratio: z.number(),
  minRange: z.number(),
  maxRange: z.number(),
  newState: z.string(),
});

export type NotificationFlowInput = z.infer<typeof NotificationFlowInputSchema>;

export async function sendNotification(input: NotificationFlowInput): Promise<void> {
  return sendNotificationFlow(input);
}

const sendNotificationFlow = ai.defineFlow(
  {
    name: 'sendNotificationFlow',
    inputSchema: NotificationFlowInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { ratio, minRange, maxRange, newState } = input;

    let emoji = '';
    if (newState === 'in-range') {
      emoji = '🟩';
    } else if (ratio > maxRange) {
      emoji = '🟥';
    } else if (ratio < minRange) {
      emoji = '🟨';
    }

    const message = `${emoji}
*${newState.toUpperCase()}*: ${minRange.toFixed(6)} - ${maxRange.toFixed(6)}
Current range: ${ratio.toFixed(6).toUpperCase()}
[View Details](https://wal-sui-price.onrender.com/)
    `;

    try {
      await sendTelegramMessage(message);
    } catch (error) {
        console.error("Failed to send notification:", error);
        // Re-throw the error to be caught by Genkit's monitoring
        throw error;
    }
  }
);
