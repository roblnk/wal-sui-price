
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
    try {
        const response = await fetch(url, { 
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Access-Control-Allow-Origin': '*',
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
                "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin, Authorization, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
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
        console.error('Failed to fetch prices:', error);
        return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
    }
}
