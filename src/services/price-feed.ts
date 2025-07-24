
"use server";

import { z } from 'zod';

const BybitTickerSchema = z.object({
    retCode: z.number(),
    retMsg: z.string(),
    result: z.object({
        list: z.array(z.object({
            lastPrice: z.string(),
        })).optional(),
    }),
});

const fetchOptions = {
    cache: 'no-store' as RequestCache,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            console.error(`Attempt ${i + 1}: API request failed with status ${response.status}`);
        } catch (error) {
            console.error(`Attempt ${i + 1}: API request failed with error:`, error);
        }
        if (i < retries - 1) {
            await new Promise(res => setTimeout(res, delay));
        }
    }
    return null;
}


export async function getWalPrice(): Promise<number> {
    try {
        const response = await fetchWithRetry(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=WALUSDT`, fetchOptions);
        if (!response) {
            throw new Error(`Failed to fetch price for WAL from Bybit after multiple retries`);
        }

        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);

        if (parsedData.retCode !== 0 || !parsedData.result.list || parsedData.result.list.length === 0) {
            console.error('Bybit API error for WAL:', parsedData.retMsg);
            throw new Error(`Bybit API returned an error for WAL: ${parsedData.retMsg}`);
        }

        return parseFloat(parsedData.result.list[0].lastPrice);
    } catch (error) {
        console.error(`Error getting WAL price:`, error);
        // Re-throwing the original error to get more details in Vercel logs
        throw error;
    }
}

export async function getSuiPrice(): Promise<number> {
    try {
        const response = await fetchWithRetry(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=SUIUSDT`, fetchOptions);
        if (!response) {
            throw new Error(`Failed to fetch price for SUI from Bybit after multiple retries`);
        }
        
        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);

        if (parsedData.retCode !== 0 || !parsedData.result.list || parsedData.result.list.length === 0) {
            console.error('Bybit API error for SUI:', parsedData.retMsg);
            throw new Error(`Bybit API returned an error for SUI: ${parsedData.retMsg}`);
        }

        return parseFloat(parsedData.result.list[0].lastPrice);
    } catch (error) {
        console.error(`Error getting SUI price:`, error);
        // Re-throwing the original error to get more details in Vercel logs
        throw error;
    }
}
