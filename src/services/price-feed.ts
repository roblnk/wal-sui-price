"use server";

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
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch price for WAL from Bybit`);
        }
        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);
        if (parsedData.result.list.length > 0) {
            return parseFloat(parsedData.result.list[0].lastPrice);
        }
        throw new Error('WAL price not found in Bybit response');
    } catch (error) {
        console.error(`Error fetching price for WAL:`, error);
        throw error;
    }
}

export async function getSuiPrice(): Promise<number> {
    try {
        const response = await fetch(process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL!, { 
            cache: 'no-store',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch price for SUI from Bybit`);
        }
        const data = await response.json();
        const parsedData = BybitTickerSchema.parse(data);
        if (parsedData.result.list.length > 0) {
            return parseFloat(parsedData.result.list[0].lastPrice);
        }
        throw new Error('SUI price not found in Bybit response');
    } catch (error) {
        console.error(`Error fetching price for SUI:`, error);
        throw error;
    }
}
