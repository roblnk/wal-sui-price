
'use server';

import { NextResponse } from 'next/server';
import { readUserPreferences, updateUserPreferences } from '@/services/db';
import { sendNotification } from '@/ai/flows/send-notification-flow';
import { fetchPrice } from '@/app/api/prices/route';

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
        const walUrl = "https://api.bybit.com/v5/market/tickers?category=spot&symbol=WALUSDT";
        const suiUrl = "https://api.bybit.com/v5/market/tickers?category=spot&symbol=SUIUSDT";

        
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
