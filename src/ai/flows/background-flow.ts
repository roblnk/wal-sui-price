
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

const BybitTickerSchema = z.object({
    result: z.object({
        list: z.array(z.object({
            lastPrice: z.string(),
        })),
    }),
});

async function fetchPrice(url: string, tokenName: string): Promise<number> {
    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch price for ${tokenName} from Bybit: ${response.statusText}`);
            return 0;
        }

        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);

        if (parsedData.result.list.length > 0) {
            return parseFloat(parsedData.result.list[0].lastPrice);
        }

        console.error(`${tokenName} price not found in Bybit response`);
        return 0;
    } catch (error) {
        console.error(`Error fetching price for ${tokenName}:`, error);
        return 0;
    }
}

export const backgroundPriceCheckFlow = ai.defineFlow(
    {
        name: 'backgroundPriceCheckFlow',
        outputSchema: z.void(),
    },
    async () => {
        console.log('Starting background price check loop...');

        const check = async () => {
            const prefs = await readUserPreferences();

            if (!prefs.notificationsEnabled || !prefs.email || !prefs.minRange || !prefs.maxRange) {
                return;
            }

            const walUrl = process.env.NEXT_PUBLIC_BYBIT_WAL_API_URL;
            const suiUrl = process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL;

            if (!walUrl || !suiUrl) {
                console.error('API URLs are not defined in environment variables.');
                return;
            }

            const [walPrice, suiPrice] = await Promise.all([
                fetchPrice(walUrl, 'WAL'),
                fetchPrice(suiUrl, 'SUI'),
            ]);

            if (walPrice > 0 && suiPrice > 0) {
                const currentRatio = walPrice / suiPrice;
                const min = parseFloat(prefs.minRange);
                const max = parseFloat(prefs.maxRange);

                const isRangeSet = min > 0 || max > 0;
                if (!isRangeSet) return;
                
                const isOutOfRange = currentRatio < min || currentRatio > max;
                const currentState = isOutOfRange ? 'out-of-range' : 'in-range';

                if (currentState !== prefs.lastNotifiedState) {
                    console.log(`State flipped from ${prefs.lastNotifiedState} to ${currentState}. Sending email.`);
                    if (isOutOfRange) {
                        await sendOutOfRangeEmail({
                            to: prefs.email,
                            ratio: currentRatio,
                            minRange: min,
                            maxRange: max
                        });
                    } else {
                        await sendInRangeEmail({
                            to: prefs.email,
                            ratio: currentRatio,
                            minRange: min,
                            maxRange: max
                        });
                    }
                    await writeUserPreferences({ lastNotifiedState: currentState });
                }
            }
        };

        // Run forever
        setInterval(check, 5000);
    }
);

const UserPreferencesSchema = z.object({
    email: z.string().email().optional(),
    minRange: z.string().optional(),
    maxRange: z.string().optional(),
    notificationsEnabled: z.boolean().optional(),
}).partial();

export async function updateUserPreferences(prefs: z.infer<typeof UserPreferencesSchema>): Promise<void> {
    // When range is updated, we should reset the notification state
    // so the user gets a fresh notification on the next check.
    if (prefs.minRange !== undefined || prefs.maxRange !== undefined) {
        await writeUserPreferences({ ...prefs, lastNotifiedState: null });
    } else {
        await writeUserPreferences(prefs);
    }
}

export async function getUserPreferences(): Promise<UserPreferences> {
    return await readUserPreferences();
}
    