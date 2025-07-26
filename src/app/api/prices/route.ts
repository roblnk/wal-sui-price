
import { NextResponse } from 'next/server';
import { z } from 'zod';

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
        throw new Error(`Failed to fetch price for ${tokenName} from Bybit: ${response.statusText}`);
    }

    const data = await response.json();
    const parsedData = BybitTickerSchema.parse(data);

    if (parsedData.result.list.length > 0) {
        return parseFloat(parsedData.result.list[0].lastPrice);
    }

    throw new Error(`${tokenName} price not found in Bybit response`);
}

export async function GET() {
    try {
        const walUrl = process.env.NEXT_PUBLIC_BYBIT_WAL_API_URL;
        const suiUrl = process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL;

        if (!walUrl || !suiUrl) {
            throw new Error('API URLs are not defined in environment variables.');
        }

        const [walPrice, suiPrice] = await Promise.all([
            fetchPrice(walUrl, 'WAL'),
            fetchPrice(suiUrl, 'SUI'),
        ]);

        return NextResponse.json({ walPrice, suiPrice });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: `Failed to fetch prices: ${errorMessage}` }, { status: 500 });
    }
}
