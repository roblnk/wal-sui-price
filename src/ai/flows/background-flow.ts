
'use server';
/**
 * @fileOverview A flow for running background tasks.
 * - backgroundPriceCheckFlow: Periodically checks prices and sends notifications.
 * - updateUserPreferences: Updates user settings in the database.
 * - getUserPreferences: Retrieves user settings from the database.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendOutOfRangeEmail, sendInRangeEmail } from './send-email-flow';
import { readUserPreferences, writeUserPreferences, UserPreferences } from '@/services/db';

let intervalId: NodeJS.Timeout | null = null; // Changed to NodeJS.Timeout for better type safety
let currentPollingInterval: number = 0; // To store the current polling interval in milliseconds


const BybitTickerSchema = z.object({
    result: z.object({
        list: z.array(z.object({
            lastPrice: z.string(),
        })),
    }),
});

async function fetchPrice(url: string, tokenName: string): Promise<number> {
    const response = await fetch(url, {
        cache: 'no-store',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        }
    });

    if (!response.ok) {
        throw new Error(`API Error: Failed to fetch price for ${tokenName} - ${response.statusText}`);
    }

    const data = await response.json();
    const parsedData = BybitTickerSchema.safeParse(data);

    if (!parsedData.success || parsedData.data.result.list.length === 0) {
        throw new Error(`API Error: Price for ${tokenName} not found in response.`);
    }

    return parseFloat(parsedData.data.result.list[0].lastPrice);
}

export const backgroundPriceCheckFlow = ai.defineFlow(
    {
        name: 'backgroundPriceCheckFlow',
        inputSchema: z.object({
            // Interval in milliseconds for polling
            intervalMs: z.number().optional().default(5000), // Default to 5 seconds
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        
        const pollingInterval = input.intervalMs;

        // Clear any existing interval to prevent multiple instances
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        // Store the current polling interval
        currentPollingInterval = pollingInterval;



        const check = async () => {
            try {
                const prefs = await readUserPreferences();

                if (!prefs.notificationsEnabled || !prefs.email || !prefs.minRange || !prefs.maxRange) {
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                        console.log('Background price check stopped: Notifications disabled or preferences incomplete.');
                    }
                    return;
                }

                const walUrl = process.env.NEXT_PUBLIC_BYBIT_WAL_API_URL;
                const suiUrl = process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL;

                if (!walUrl || !suiUrl) {
                    throw new Error('API URLs are not defined in environment variables.');
                }

                const [walPrice, suiPrice] = await Promise.all([
                    fetchPrice(walUrl, 'WAL'),
                    fetchPrice(suiUrl, 'SUI'),
                ]);

                if (walPrice > 0 && suiPrice > 0) {
                    const currentRatio = walPrice / suiPrice;
                    const min = parseFloat(prefs.minRange);
                    const max = parseFloat(prefs.maxRange);

                    if (min === 0 && max === 0) {
                        return;
                    }

                    const isOutOfRange = currentRatio < min || currentRatio > max;
                    const currentState = isOutOfRange ? 'out-of-range' : 'in-range';
                    
                    if (currentState !== prefs.lastNotifiedState) {
                        const emailToSend = isOutOfRange ? sendOutOfRangeEmail : sendInRangeEmail;
                        await emailToSend({
                            to: prefs.email,
                            ratio: currentRatio,
                            minRange: min,
                            maxRange: max,
                            newState: currentState,
                        });

                        await writeUserPreferences({ lastNotifiedState: currentState });
                        await notifyFrontend(currentState, currentRatio, min, max);
                    }
                }
            } catch (error) {
                // This error will be caught by Genkit's monitoring and logging,
                // but we won't crash the loop. We just re-throw it.
                // In a real app, you might want more sophisticated error handling here.
                throw error;
            } finally {
            }
        };

        await check();
        
        if (!intervalId || currentPollingInterval !== pollingInterval) {
            intervalId = setInterval(check, pollingInterval);
            console.log(`Background price check started with interval: ${pollingInterval}ms`);
        }
    }
);


async function notifyFrontend(state: string, ratio: number, minRange: number, maxRange: number) {
    // To be implemented in Step 2
    console.log(`Frontend notification: State: ${state}, Ratio: ${ratio.toFixed(6)}`);

}

const UserPreferencesSchema = z.object({
    email: z.string().email().optional(),
    minRange: z.string().optional(),
    maxRange: z.string().optional(),
    notificationsEnabled: z.boolean().optional(),
    lastNotifiedState: z.union([z.literal('in-range'), z.literal('out-of-range'), z.null()]).optional(),
}).partial();


export async function updateUserPreferences(prefs: z.infer<typeof UserPreferencesSchema>): Promise<void> {
    await writeUserPreferences(prefs);
}

export async function getUserPreferences(): Promise<UserPreferences> {
    return await readUserPreferences();
}
