
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

export async function sendOutOfRangeEmail(input: EmailFlowInput): Promise<void> {
  return sendOutOfRangeEmailFlow(input);
}

export async function sendInRangeEmail(input: EmailFlowInput): Promise<void> {
    return sendInRangeEmailFlow(input);
}

const sendOutOfRangeEmailFlow = ai.defineFlow(
  {
    name: 'sendOutOfRangeEmailFlow',
    inputSchema: EmailFlowInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, ratio, minRange, maxRange, newState } = input;

    const subject = `State changed to: ${newState.toUpperCase()}`;
    const html = `
      <p>The WAL/SUI ratio has moved out of your defined range.</p>
      <p>Current ratio: <strong>${ratio.toFixed(6)}</strong></p>
      <p>Your range: ${minRange.toFixed(6)} - ${maxRange.toFixed(6)}</p>
    `;

    // Do not await this, let it run in the background
    sendEmail({
      to,
      subject,
      html,
    });
  }
);

const sendInRangeEmailFlow = ai.defineFlow(
    {
      name: 'sendInRangeEmailFlow',
      inputSchema: EmailFlowInputSchema,
      outputSchema: z.void(),
    },
    async (input) => {
      const { to, ratio, minRange, maxRange, newState } = input;
  
      const subject = `State changed to: ${newState.toUpperCase()}`;
      const html = `
        <p>The WAL/SUI ratio has moved back into your defined range.</p>
        <p>Current ratio: <strong>${ratio.toFixed(6)}</strong></p>
        <p>Your range: ${minRange.toFixed(6)} - ${maxRange.toFixed(6)}</p>
      `;
  
      // Do not await this, let it run in the background
      sendEmail({
        to,
        subject,
        html,
      });
    }
);
  