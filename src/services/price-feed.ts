
'use server';

import { z } from 'zod';

const BybitTickerSchema = z.object({
    result: z.object({
        list: z.array(z.object({
            lastPrice: z.string(),
        })),
    }),
});


export async function getWalPrice(): Promise<number> {
    try {
        const response = await fetch(process.env.NEXT_PUBLIC_BYBIT_WAL_API_URL!, { 
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch price for WAL from Bybit: ${response.statusText}`);
            return 0;
        }
        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);
        if (parsedData.result.list.length > 0) {
            return parseFloat(parsedData.result.list[0].lastPrice);
        }
        console.error('WAL price not found in Bybit response');
        return 0;
    } catch (error) {
        console.error(`Error fetching price for WAL:`, error);
        return 0;
    }
}

export async function getSuiPrice(): Promise<number> {
    try {
        const response = await fetch(process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL!, { 
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch price for SUI from Bybit: ${response.statusText}`);
            return 0;
        }
        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);
        if (parsedData.result.list.length > 0) {
            return parseFloat(parsedData.result.list[0].lastPrice);
        }
        console.error('SUI price not found in Bybit response');
        return 0;
    } catch (error) {
        console.error(`Error fetching price for SUI:`, error);
        return 0;
    }
}

