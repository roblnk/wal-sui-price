
'use server';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readUserPreferences, updateUserPreferences } from '@/services/db';
import { sendInRangeEmail, sendOutOfRangeEmail } from '@/ai/flows/send-email-flow';

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

export async function GET() {
    console.log('Cron job started...');
    try {
        const prefs = await readUserPreferences();

        if (!prefs.notificationsEnabled || !prefs.email || !prefs.minRange || !prefs.maxRange) {
            const message = 'Cron job stopping: Notifications disabled or preferences incomplete.';
            console.log(message);
            return NextResponse.json({ success: true, message });
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
                console.log('Cron job check: Range not set, skipping notification.');
                return NextResponse.json({ success: true, message: 'Range not set.' });
            }

            const isOutOfRange = currentRatio < min || currentRatio > max;
            const currentState = isOutOfRange ? 'out-of-range' : 'in-range';
            
            if (currentState !== prefs.lastNotifiedState) {
                console.log(`State changed to ${currentState}. Sending notification.`);
                const emailToSend = isOutOfRange ? sendOutOfRangeEmail : sendInRangeEmail;
                try {
                    await emailToSend({
                        to: prefs.email,
                        ratio: currentRatio,
                        minRange: min,
                        maxRange: max,
                        newState: currentState,
                    });

                    await updateUserPreferences({ lastNotifiedState: currentState });
                    return NextResponse.json({ success: true, message: 'Notification sent.' });

                } catch (emailError) {
                    console.error("Critical error in cron job: Failed to send notification email.", emailError);
                    return NextResponse.json({ success: false, error: 'Failed to send email.' }, { status: 500 });
                }
            } else {
                console.log(`Cron job check: State unchanged (${currentState}). No notification needed.`);
            }
        }
    } catch (error) {
        console.error('Error in cron job:', error);
        return NextResponse.json({ success: false, error: 'Cron job failed.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Cron job finished.' });
}
