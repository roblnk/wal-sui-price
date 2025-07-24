
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

const sendInRangeEmailFlow = ai.defineFlow(
    {
      name: 'sendInRangeEmailFlow',
      inputSchema: EmailFlowInputSchema,
      outputSchema: z.void(),
    },
    async (input) => {
      const { to, ratio, minRange, maxRange } = input;
  
      const subject = `In range: ${minRange.toFixed(6)} - ${maxRange.toFixed(6)}`;
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

    