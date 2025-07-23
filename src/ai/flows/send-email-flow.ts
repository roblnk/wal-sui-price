'use server';
/**
 * @fileOverview A flow for sending an out-of-range email notification.
 * 
 * - sendOutOfRangeEmail - A function that handles sending the email.
 * - SendOutOfRangeEmailInput - The input type for the sendOutOfRangeEmail function.
 */

import { ai } from '@/ai/genkit';
import { sendEmail } from '@/services/email';
import { z } from 'zod';

const SendOutOfRangeEmailInputSchema = z.object({
  to: z.string().email(),
  ratio: z.number(),
  minRange: z.number(),
  maxRange: z.number(),
});

export type SendOutOfRangeEmailInput = z.infer<typeof SendOutOfRangeEmailInputSchema>;

export async function sendOutOfRangeEmail(input: SendOutOfRangeEmailInput): Promise<void> {
  return sendOutOfRangeEmailFlow(input);
}

const sendOutOfRangeEmailFlow = ai.defineFlow(
  {
    name: 'sendOutOfRangeEmailFlow',
    inputSchema: SendOutOfRangeEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, ratio, minRange, maxRange } = input;

    const subject = `Out of range: ${minRange.toFixed(6)} - ${maxRange.toFixed(6)}`;
    const html = `
      <p>Current ratio WAL/SUI: ${ratio.toFixed(6)}</p>
    `;

    await sendEmail({
      to,
      subject,
      html,
    });
  }
);
