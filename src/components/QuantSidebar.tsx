import React, { useState, useEffect, useRef } from 'react';
import OrderBookAnalytics from './OrderBookAnalytics';
import { Activity } from 'lucide-react';

interface DepthLevel {
    price: number;
    quantity: number;
}

interface DepthState {
    lastUpdateId: number;
    bids: DepthLevel[];
    asks: DepthLevel[];
}

export default function QuantSidebar({ symbol }: { symbol: string }) {
    const [depth, setDepth] = useState<DepthState>({ lastUpdateId: 0, bids: [], asks: [] });
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        setDepth({ lastUpdateId: 0, bids: [], asks: [] });
        if (wsRef.current) wsRef.current.close();

        const formattedSymbol = symbol.toLowerCase() + 'usdt';
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${formattedSymbol}@depth20@100ms`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.lastUpdateId) {
                setDepth({
                    lastUpdateId: data.lastUpdateId,
                    bids: data.bids.map((b: string[]) => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
                    asks: data.asks.map((a: string[]) => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
                });
            }
        };

        wsRef.current = ws;
        return () => ws.close();
    }, [symbol]);

    return (
        <div className="h-full border border-slate-800 bg-black p-4 flex flex-col">
            <h3 className="text-sm font-bold text-amber-500 uppercase flex items-center gap-2 mb-4 border-b border-slate-800 pb-2 shrink-0">
                <Activity className="w-4 h-4" />
                Institutional Metrics
            </h3>
            {depth.lastUpdateId === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse text-center">
                    CONNECTING TO ORDER BOOK...
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    <OrderBookAnalytics depth={depth} asset={symbol} layout="vertical" />
                </div>
            )}
        </div>
    );
}
