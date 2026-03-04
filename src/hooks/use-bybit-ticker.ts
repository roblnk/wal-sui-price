'use client';

import { useEffect, useRef, useState } from 'react';

type TickerData = {
  symbol: string;
  lastPrice: string;
  // Thêm các field khác nếu cần: highPrice24h, lowPrice24h, price24hPcnt...
};

export function useBybitTicker(symbols: string[] = ['WALUSDT', 'SUIUSDT']) {
  const [prices, setPrices] = useState<Record<string, TickerData>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[Bybit WS] Bắt đầu kết nối cho symbols:', symbols);
    const connect = async () => {
      // Chọn endpoint phù hợp:
      // - spot: wss://stream.bybit.com/v5/public/spot
      // - linear (USDT perpetual): wss://stream.bybit.com/v5/public/linear
      // - inverse: wss://stream.bybit.com/v5/public/inverse
      const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot'); // Thay đổi nếu cần spot/inverse
      
      let pingInterval: NodeJS.Timeout | null = null;

      ws.onopen = () => {
        // Subscribe
        const subscribeMsg = {
          op: 'subscribe',
          args: symbols.map(s => `tickers.${s}`),
        };

        ws.send(JSON.stringify(subscribeMsg));
        // Ping mỗi 20s để giữ kết nối (Bybit yêu cầu)
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);


        

          // Ticker data (spot luôn snapshot, data là object)
          if (msg.topic?.startsWith('tickers.')) {
            const data = msg.data;
            console.log('[Bybit WS] Ticker data:', data);

            if (data && typeof data === 'object' && data.symbol && data.lastPrice) {
              setPrices((prev) => ({
                ...prev,
                [data.symbol]: {
                  symbol: data.symbol,
                  lastPrice: data.lastPrice,
                },
              }));

            } else {
            }
          }
        } catch (err) {
        }
      };

      ws.onerror = (err) => {
        ws.close();
      };

      ws.onclose = () => {
        reconnectTimeout.current = setTimeout(connect, 5000);
      };

      wsRef.current = ws;
    };

    connect();

   return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [symbols]);
  return prices;
}