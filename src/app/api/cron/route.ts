
'use server';

import { NextResponse } from 'next/server';
import { readUserPreferences, updateUserPreferences } from '@/services/db';
import { sendNotification } from '@/ai/flows/send-notification-flow';
import { z } from 'zod';

const BybitTickerSchema = z.object({
    result: z.object({
        list: z.array(z.object({
            lastPrice: z.string(),
        })),
    }),
});
export async function GET() {
    console.log('Cron job started...');

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        const message = 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in .env.local. Notifications will not be sent.';
        console.error(message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    console.log('Telegram credentials found. Proceeding with cron job.');

    try {
        const prefs = await readUserPreferences();

        if (!prefs.notificationsEnabled || !prefs.minRange || !prefs.maxRange) {
            const message = 'Cron job stopping: Notifications disabled or preferences incomplete.';
            console.log(message);
            return NextResponse.json({ success: true, message });
        }

        
        const walUrl = process.env.NEXT_PUBLIC_BYBIT_WAL_API_URL;
        const suiUrl = process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL;

        
        const [wal, sui] = await Promise.all([
            fetchPrice(walUrl, 'WAL'),
            fetchPrice(suiUrl, 'SUI'),
        ]);


        if (wal > 0 && sui > 0) {
            const currentRatio = wal / sui;
            const min = Number.parseFloat(prefs.minRange);
            const max = Number.parseFloat(prefs.maxRange);

            if (min === 0 && max === 0) {
                console.log('Cron job check: Range not set, skipping notification.');
                return NextResponse.json({ success: true, message: 'Range not set.' });
            }

            const isOutOfRange = currentRatio < min || currentRatio > max;
            const currentState = isOutOfRange ? 'out-of-range' : 'in-range';
            
            if (currentState !== prefs.lastNotifiedState) {
                console.log(`State changed to ${currentState}. Sending notification.`);
                try {
                    await sendNotification({
                        ratio: currentRatio,
                        minRange: min,
                        maxRange: max,
                        newState: currentState,
                    });

                    await updateUserPreferences({ lastNotifiedState: currentState });
                    return NextResponse.json({ success: true, message: 'Notification sent.' });

                } catch (notificationError) {
                    console.error("Critical error in cron job: Failed to send notification.", notificationError);
                    return NextResponse.json({ success: false, error: 'Failed to send notification.' }, { status: 500 });
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

export async function fetchPrice(url: string, tokenName:string): Promise<number> {
    try {
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
            const errorBody = await response.text();
            console.error(`Bybit API Error for ${tokenName}: ${response.status} ${response.statusText}`, {
                errorBody,
                headers: response.headers
            });
            throw new Error(`Failed to fetch price for ${tokenName} from Bybit: ${response.statusText}`);
        }

        const data = await response.json();
        const parsedData = BybitTickerSchema.safeParse(data);

        if (parsedData.success && parsedData.data.result.list.length > 0) {
            return parseFloat(parsedData.data.result.list[0].lastPrice);
        }

        console.error(`Error parsing Bybit response for ${tokenName}`, {
            parsingError: parsedData.success ? 'List is empty' : parsedData.error,
            responseData: data
        });

        throw new Error(`${tokenName} price not found in Bybit response`);
    } catch (error) {
        console.error(`Exception in fetchPrice for ${tokenName}:`, error);
        // Re-throw the error to be caught by the GET handler
        throw error;
    }
}