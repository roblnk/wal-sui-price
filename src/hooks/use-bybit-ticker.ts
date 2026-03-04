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
        console.log('Bybit WS connected');
        // Subscribe
        const subscribeMsg = {
          op: 'subscribe',
          args: symbols.map(s => `tickers.${s}`),
        };

        ws.send(JSON.stringify(subscribeMsg));
        console.log('[Bybit WS] Sent subscribe:', subscribeMsg);
        // Ping mỗi 20s để giữ kết nối (Bybit yêu cầu)
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 'ping' }));
            console.log('[Bybit WS] Sent ping');
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('[Bybit WS] Received raw message:', msg);

          // Handle subscribe response
          if (msg.success !== undefined) {
            if (msg.success) {
              console.log('[Bybit WS] Subscribe success for args:', msg.args || msg.arg);
            } else {
              console.error('[Bybit WS] Subscribe failed:', msg.ret_msg || msg);
            }
            return;
          }

          // Heartbeat/pong
          if (msg.ret_msg === 'pong' || msg.op === 'ping') {
            console.log('[Bybit WS] Heartbeat received');
            return;
          }

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
              console.log(`[Bybit WS] Updated ${data.symbol}: lastPrice = ${data.lastPrice}`);

            } else {
              console.warn('[Bybit WS] Invalid ticker data format:', data);
            }
          }
        } catch (err) {
          console.error('[Bybit WS] Parse message error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Bybit WS error:', err);
        ws.close();
      };

      ws.onclose = () => {
        console.log('Bybit WS closed → reconnecting in 5s...');
        reconnectTimeout.current = setTimeout(connect, 5000);
      };

      wsRef.current = ws;
    };

    connect();

   return () => {
      console.log('[Bybit WS] Cleanup');
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [symbols]);
 useEffect(() => {
  if (prices['WALUSDT']) {
    console.log(`WALUSDT Price: ${prices['WALUSDT'].lastPrice}`);
  }
  if (prices['SUIUSDT']) {
    console.log(`SUIUSDT Price: ${prices['SUIUSDT'].lastPrice}`);
  }
}, [prices]);
  return prices;
}