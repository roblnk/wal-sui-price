
'use server';
/**
 * @fileOverview A flow for sending an out-of-range email notification.
 * 
 * - sendOutOfRangeEmail - A function that handles sending the email.
 * - sendInRangeEmail - A function that handles sending the email.
 * - EmailFlowInput - The input type for the email functions.
 */

import { ai } from '@/ai/genkit';
import { sendEmail } from '@/services/email';
import { z } from 'zod';

const EmailFlowInputSchema = z.object({
  to: z.string().email(),
  ratio: z.number(),
  minRange: z.number(),
  maxRange: z.number(),
  newState: z.string(),
});

export type EmailFlowInput = z.infer<typeof EmailFlowInputSchema>;

export async function sendNotiEmail(input: EmailFlowInput): Promise<void> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendOutOfRangeEmailFlow',
    inputSchema: EmailFlowInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, ratio, minRange, maxRange, newState } = input;

    const subject = `${newState.toUpperCase()}: ${minRange.toFixed(6)} - ${maxRange.toFixed(6)}`;
    const html = `
      <p>Current range: ${ratio.toFixed(6).toUpperCase()}</p>
      <p>https://wal-sui-price.onrender.com/</p>
    `;

    try {
      await sendEmail({
        to,
        subject,
        html,
      });
    } catch (error) {
        console.error("Failed to send email:", error);
        // Re-throw the error to be caught by Genkit's monitoring
        throw error;
    }
  }
);

  
