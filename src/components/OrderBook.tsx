import React, { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { getBinanceSymbol } from '../utils/symbolMap';

interface OrderBookProps {
    symbol: string;
    coinId?: string;
}

interface OrderLevel {
    price: string;
    amount: string;
    total: number;
}

export default function OrderBook({ symbol, coinId }: OrderBookProps) {
    const [bids, setBids] = useState<OrderLevel[]>([]);
    const [asks, setAsks] = useState<OrderLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        let cancelled = false; // Prevents stale WS handlers from updating state after cleanup
        setLoading(true);
        setUnavailable(false);

        // Use the central symbol mapper to resolve the correct Binance pair
        const binanceSymbol = coinId ? getBinanceSymbol(coinId, symbol) : `${symbol.toUpperCase()}USDT`;
        const formattedSymbol = binanceSymbol.toLowerCase();
        let receivedData = false;
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${formattedSymbol}@depth20@100ms`);

        ws.onopen = () => {
            if (!cancelled) setLoading(false);
        };

        ws.onmessage = (event) => {
            if (cancelled) return;
            receivedData = true;
            const data = JSON.parse(event.data);
            if (data.bids && data.asks) {
                // Parse bids
                let bidTotal = 0;
                const parsedBids = data.bids.slice(0, 15).map((b: [string, string]) => {
                    bidTotal += parseFloat(b[1]);
                    return { price: parseFloat(b[0]).toFixed(2), amount: parseFloat(b[1]).toFixed(4), total: bidTotal };
                });

                // Parse asks
                let askTotal = 0;
                const parsedAsks = data.asks.slice(0, 15).map((a: [string, string]) => {
                    askTotal += parseFloat(a[1]);
                    return { price: parseFloat(a[0]).toFixed(2), amount: parseFloat(a[1]).toFixed(4), total: askTotal };
                });

                setBids(parsedBids);
                setAsks(parsedAsks);
            }
        };

        ws.onclose = () => {
            if (cancelled) return;
            // If we never received any data, the pair doesn't exist on Binance
            if (!receivedData) {
                setUnavailable(true);
                setLoading(false);
            }
        };

        ws.onerror = () => {
            if (cancelled) return;
            setUnavailable(true);
            setLoading(false);
        };

        return () => {
            cancelled = true; // Mark this effect as stale
            if (ws.readyState === 0) {
                ws.onopen = () => ws.close(1000, "Unmounting");
            } else if (ws.readyState === 1) {
                ws.close(1000, "Unmounting");
            }
        };
    }, [symbol, coinId]);

    if (loading) {
        return (
            <div className="border border-slate-800 bg-black p-4 h-full min-h-[400px] flex items-center justify-center">
                <span className="text-slate-500 text-xs animate-pulse font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    CONNECTING L2 DATA...
                </span>
            </div>
        );
    }

    if (unavailable) {
        return (
            <div className="border border-slate-800 bg-black p-4 h-full min-h-[400px] flex flex-col items-center justify-center gap-3">
                <Layers className="w-6 h-6 text-slate-700" />
                <span className="text-slate-600 text-xs font-mono font-bold uppercase tracking-wider">
                    {symbol.toUpperCase()}/USDT
                </span>
                <span className="text-slate-500 text-[10px] font-mono uppercase">
                    Order Book Not Available on Binance
                </span>
            </div>
        );
    }

    // Formatting helpers
    const maxTotal = Math.max(
        bids.length > 0 ? bids[bids.length - 1].total : 0,
        asks.length > 0 ? asks[asks.length - 1].total : 0
    );

    return (
        <div className="border border-slate-800 bg-black h-full font-mono text-xs flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest">
                <Layers className="w-3 h-3 text-amber-500" />
                Order Book (L2)
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between px-3 py-2 text-slate-500 border-b border-slate-800 bg-slate-900/20">
                    <span className="w-1/3 text-left">Price</span>
                    <span className="w-1/3 text-right">Size</span>
                    <span className="w-1/3 text-right">Total</span>
                </div>

                {/* Asks (Sell Orders) - Rendered from Highest (bottom) to Lowest (near spread) conventionally */}
                {/* But standard terminal shows Asks top, Bids bottom. So we reverse asks to show higher prices at the top */}
                <div className="flex-1 overflow-hidden flex flex-col-reverse p-1">
                    {asks.toReversed().map((ask, i) => {
                        const depthPercentage = (ask.total / maxTotal) * 100;
                        return (
                            <div key={`ask-${i}`} className="flex justify-between px-2 py-1 relative group cursor-crosshair">
                                <div className="absolute right-0 top-0 bottom-0 bg-rose-500/10 z-0 transition-all" style={{ width: `${depthPercentage}%` }} />
                                <span className="w-1/3 text-left text-rose-500 font-bold z-10">{ask.price}</span>
                                <span className="w-1/3 text-right text-slate-300 z-10">{ask.amount}</span>
                                <span className="w-1/3 text-right text-slate-500 z-10">{ask.total.toFixed(4)}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Spread Divider */}
                <div className="py-2 text-center text-slate-500 border-y border-slate-800 bg-slate-900/50 font-bold flex justify-center items-center gap-2">
                    --- SPREAD ---
                </div>

                {/* Bids (Buy Orders) */}
                <div className="flex-1 overflow-hidden p-1">
                    {bids.map((bid, i) => {
                        const depthPercentage = (bid.total / maxTotal) * 100;
                        return (
                            <div key={`bid-${i}`} className="flex justify-between px-2 py-1 relative group cursor-crosshair">
                                <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 z-0 transition-all" style={{ width: `${depthPercentage}%` }} />
                                <span className="w-1/3 text-left text-emerald-500 font-bold z-10">{bid.price}</span>
                                <span className="w-1/3 text-right text-slate-300 z-10">{bid.amount}</span>
                                <span className="w-1/3 text-right text-slate-500 z-10">{bid.total.toFixed(4)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
