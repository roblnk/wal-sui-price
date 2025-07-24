
"use server";

import { z } from 'zod';

const BinanceTickerSchema = z.object({
    symbol: z.string(),
    price: z.string(),
});

const fetchOptions: RequestInit = {
    // Vercel automatically caches fetch requests, this explicitly disables it
    cache: 'no-store',
    headers: {
        // Some APIs block requests without a User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
};


export async function getWalPrice(): Promise<number> {
    try {
        // WAL is not on Binance, so we'll have to keep using Bybit and hope the User-Agent helps.
        // If this continues to fail, a different source for WAL will be needed.
        const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=WALUSDT`, fetchOptions);

        if (!response.ok) {
            throw new Error(`Failed to fetch WAL price from Bybit. Status: ${response.status} ${response.statusText}`);
        }
        
        const BybitTickerSchema = z.object({
            retCode: z.number(),
            retMsg: z.string(),
            result: z.object({
                list: z.array(z.object({
                    lastPrice: z.string(),
                })).optional(),
            }),
        });
        
        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);

        if (parsedData.retCode !== 0 || !parsedData.result.list || parsedData.result.list.length === 0) {
            console.error('Bybit API error for WAL:', parsedData.retMsg);
            throw new Error(`Bybit API returned an error for WAL: ${parsedData.retMsg}`);
        }

        return parseFloat(parsedData.result.list[0].lastPrice);
    } catch (error) {
        console.error(`Error getting WAL price:`, error);
        throw error;
    }
}

export async function getSuiPrice(): Promise<number> {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=SUIUSDT`, fetchOptions);

        if (!response.ok) {
            throw new Error(`Failed to fetch SUI price from Binance. Status: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const parsedData = BinanceTickerSchema.parse(data);

        return parseFloat(parsedData.price);
    } catch (error) {
        console.error(`Error getting SUI price:`, error);
        throw error;
    }
}
