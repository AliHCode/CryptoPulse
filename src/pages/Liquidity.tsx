import React, { useState, useEffect, useRef } from 'react';
import { Layers, Activity } from 'lucide-react';
import LiquidationHeatmap from '../components/LiquidationHeatmap';
import OrderBookAnalytics from '../components/OrderBookAnalytics';

interface DepthLevel {
    price: number;
    quantity: number;
}

interface DepthState {
    lastUpdateId: number;
    bids: DepthLevel[];
    asks: DepthLevel[];
}

export default function Liquidity() {
    const [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC');
    const [depth, setDepth] = useState<DepthState>({ lastUpdateId: 0, bids: [], asks: [] });
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Clear existing data
        setDepth({ lastUpdateId: 0, bids: [], asks: [] });
        if (wsRef.current) {
            wsRef.current.close();
        }

        const symbol = asset === 'BTC' ? 'btcusdt' : 'ethusdt';
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth20@100ms`);

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

        return () => {
            ws.close();
        };
    }, [asset]);

    // Calculations for visual heat map scaling
    const maxAskVolume = Math.max(...depth.asks.map(a => a.quantity), 1);
    const maxBidVolume = Math.max(...depth.bids.map(b => b.quantity), 1);
    const maxVolume = Math.max(maxAskVolume, maxBidVolume);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-amber-500" />
                    <h1 className="text-lg font-bold tracking-widest text-slate-100 uppercase">Live Order Book</h1>
                </div>

                <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value as 'BTC' | 'ETH')}
                    className="bg-black border border-slate-700 text-amber-500 font-bold px-3 py-1.5 text-sm font-mono uppercase focus:outline-none focus:border-amber-500"
                >
                    <option value="BTC">Bitcoin (BTC/USDT)</option>
                    <option value="ETH">Ethereum (ETH/USDT)</option>
                </select>
            </div>

            {depth.lastUpdateId === 0 ? (
                <div className="grid md:grid-cols-2 gap-8 animate-pulse">
                    {/* Ask Skeletons */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-2">
                            <span>Price (Sell)</span>
                            <span>Liquidity Depth</span>
                        </div>
                        <div className="bg-black border border-slate-800 flex flex-col-reverse p-1 gap-1">
                            {[...Array(15)].map((_, i) => (
                                <div key={`skel-ask-${i}`} className="h-6 bg-slate-800/50 rounded flex items-center justify-between px-2">
                                    <div className="h-3 w-16 bg-rose-500/20 rounded"></div>
                                    <div className="h-3 w-20 bg-slate-700 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bid Skeletons */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-2">
                            <span>Price (Buy)</span>
                            <span>Liquidity Depth</span>
                        </div>
                        <div className="bg-black border border-slate-800 p-1 flex flex-col gap-1">
                            {[...Array(15)].map((_, i) => (
                                <div key={`skel-bid-${i}`} className="h-6 bg-slate-800/50 rounded flex items-center justify-between px-2">
                                    <div className="h-3 w-16 bg-emerald-500/20 rounded"></div>
                                    <div className="h-3 w-20 bg-slate-700 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Asks (Sell Walls) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-2">
                            <span>Price (Sell)</span>
                            <span>Liquidity Depth</span>
                        </div>
                        <div className="bg-black border border-slate-800 divide-y divide-slate-800/50 flex flex-col-reverse">
                            {depth.asks.slice(0, 15).reverse().map((ask, i) => {
                                const heatPercent = (ask.quantity / maxVolume) * 100;
                                return (
                                    <div key={`ask-${i}`} className="relative flex justify-between px-3 py-1 text-sm font-mono group overflow-hidden">
                                        <div
                                            className="absolute top-0 right-0 bottom-0 bg-rose-500/20 transition-all duration-100 ease-linear"
                                            style={{ width: `${heatPercent}%` }}
                                        ></div>
                                        <span className="text-rose-500 font-bold z-10">{formatCurrency(ask.price)}</span>
                                        <span className="text-slate-300 z-10">{ask.quantity.toFixed(4)} {asset}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bids (Buy Walls) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-2">
                            <span>Price (Buy)</span>
                            <span>Liquidity Depth</span>
                        </div>
                        <div className="bg-black border border-slate-800 divide-y divide-slate-800/50">
                            {depth.bids.slice(0, 15).map((bid, i) => {
                                const heatPercent = (bid.quantity / maxVolume) * 100;
                                return (
                                    <div key={`bid-${i}`} className="relative flex justify-between px-3 py-1 text-sm font-mono group overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 bottom-0 bg-emerald-500/20 transition-all duration-100 ease-linear"
                                            style={{ width: `${heatPercent}%` }}
                                        ></div>
                                        <span className="text-emerald-500 font-bold z-10">{formatCurrency(bid.price)}</span>
                                        <span className="text-slate-300 z-10">{bid.quantity.toFixed(4)} {asset}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-800">
                <OrderBookAnalytics depth={depth} asset={asset} />
                <LiquidationHeatmap asset={asset} />
            </div>
        </div>
    );
}
