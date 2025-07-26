
import { NextResponse } from 'next/server';
import { z } from 'zod';

const BybitTickerSchema = z.object({
    result: z.object({
        list: z.array(z.object({
            lastPrice: z.string(),
        })),
    }),
});

async function fetchPrice(url: string, tokenName:string): Promise<number> {
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

export async function GET() {
    try {
        const walUrl = process.env.NEXT_PUBLIC_BYBIT_WAL_API_URL;
        const suiUrl = process.env.NEXT_PUBLIC_BYBIT_SUI_API_URL;

        if (!walUrl || !suiUrl) {
            console.error('API URLs are not defined in environment variables. Make sure NEXT_PUBLIC_BYBIT_WAL_API_URL and NEXT_PUBLIC_BYBIT_SUI_API_URL are set in your deployment environment.');
            return NextResponse.json({ error: 'Server configuration error: API URLs are not defined.' }, { status: 500 });
        }

        const [walPrice, suiPrice] = await Promise.all([
            fetchPrice(walUrl, 'WAL'),
            fetchPrice(suiUrl, 'SUI'),
        ]);

        return NextResponse.json({ walPrice, suiPrice });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        // Log the full error object to the console for better debugging in the deployed environment.
        console.error("Critical error in /api/prices GET handler:", error);
        return NextResponse.json({ error: `Failed to fetch prices. Please check server logs for details. Error: ${errorMessage}` }, { status: 500 });
    }
}
