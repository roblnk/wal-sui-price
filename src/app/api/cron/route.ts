
'use server';

import { NextResponse } from 'next/server';
import { readUserPreferences, updateUserPreferences } from '@/services/db';
import { sendNotiEmail } from '@/ai/flows/send-email-flow';
import { fetchPrice } from '@/app/api/prices/route';

export async function GET() {
    console.log('Cron job started...');
    try {
        const prefs = await readUserPreferences();

        if (!prefs.notificationsEnabled || !prefs.email || !prefs.minRange || !prefs.maxRange) {
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
                const emailToSend = sendNotiEmail;
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
