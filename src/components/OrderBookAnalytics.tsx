import React, { useState, useEffect, useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, ShieldAlert, Zap } from 'lucide-react';

interface DepthLevel {
    price: number;
    quantity: number;
}

interface DepthState {
    lastUpdateId: number;
    bids: DepthLevel[];
    asks: DepthLevel[];
}

interface OrderBookAnalyticsProps {
    depth: DepthState;
    asset: 'BTC' | 'ETH';
}

export default function OrderBookAnalytics({ depth, asset }: OrderBookAnalyticsProps) {
    const [previousAskVol, setPreviousAskVol] = useState(0);
    const [previousBidVol, setPreviousBidVol] = useState(0);
    const [spoofWarning, setSpoofWarning] = useState<string | null>(null);

    // Calculate quantitative metrics
    const metrics = useMemo(() => {
        if (!depth.asks.length || !depth.bids.length) return null;

        const totalAsks = depth.asks.reduce((sum, level) => sum + level.quantity, 0);
        const totalBids = depth.bids.reduce((sum, level) => sum + level.quantity, 0);

        // A. Order Book Imbalance (OBI)
        // Values between -1 (100% sellers) and +1 (100% buyers)
        const imbalance = (totalBids - totalAsks) / (totalBids + totalAsks);

        // B. Spread Squeezing
        const lowestAsk = depth.asks[0].price; // Binance depth sends asks sorted ascending
        const highestBid = depth.bids[0].price; // and bids sorted descending
        const spread = lowestAsk - highestBid;

        return {
            totalAsks,
            totalBids,
            imbalance,
            spread,
            lowestAsk,
            highestBid
        };
    }, [depth]);

    // Track order absorption / spoofing based on delta flow
    useEffect(() => {
        if (!metrics) return;

        // Determine if a massive volume drop occurred without the spread crossing it
        // Note: Real spoof detection requires trade stream, but this is a solid heuristic
        // looking for sudden > 10% drops in overall wall sizes
        const askDelta = metrics.totalAsks - previousAskVol;
        const bidDelta = metrics.totalBids - previousBidVol;

        if (previousAskVol > 0 && previousBidVol > 0) {
            if (askDelta < -(previousAskVol * 0.15)) {
                setSpoofWarning('🚨 POSSIBLE SPOOFING: Massive Sell Wall Pulled');
            } else if (bidDelta < -(previousBidVol * 0.15)) {
                setSpoofWarning('🚨 POSSIBLE SPOOFING: Massive Buy Wall Pulled');
            } else if (askDelta > (previousAskVol * 0.15)) {
                setSpoofWarning('🟢 ABSORPTION: Heavy Sell Limit Added');
            } else if (bidDelta > (previousBidVol * 0.15)) {
                setSpoofWarning('🟢 ABSORPTION: Heavy Buy Limit Added');
            } else {
                // Clear warning if stable
                setSpoofWarning(null);
            }
        }

        setPreviousAskVol(metrics.totalAsks);
        setPreviousBidVol(metrics.totalBids);

        // We specifically DO NOT want to trigger this effect too fast or it will just be noise.
        // The parent throttles the WebSocket updates, so this runs on every parent frame update.
    }, [metrics?.totalAsks, metrics?.totalBids]);

    if (!metrics) return null;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);

    const isBullish = metrics.imbalance > 0.1;
    const isBearish = metrics.imbalance < -0.1;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono mb-8">
            {/* Card 1: Order Book Imbalance */}
            <div className={`p-4 border bg-black flex flex-col justify-center ${isBullish ? 'border-emerald-500/50' : isBearish ? 'border-rose-500/50' : 'border-slate-800'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Book Imbalance (OBI)</span>
                </div>
                <div className="flex items-end gap-2">
                    <span className={`text-2xl font-bold ${metrics.imbalance > 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                        {(metrics.imbalance * 100).toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-500 mb-1">
                        {metrics.imbalance > 0 ? 'Heavy Bids (Bullish)' : 'Heavy Asks (Bearish)'}
                    </span>
                </div>
                {/* Visual Imbalance Bar */}
                <div className="w-full h-1 flex mt-3 rounded-full overflow-hidden bg-slate-800">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(metrics.totalBids / (metrics.totalAsks + metrics.totalBids)) * 100}%` }}></div>
                    <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${(metrics.totalAsks / (metrics.totalAsks + metrics.totalBids)) * 100}%` }}></div>
                </div>
            </div>

            {/* Card 2: Spread Squeezing */}
            <div className="p-4 border border-slate-800 bg-black flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Spread Squeezing</span>
                </div>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-amber-500">
                        {formatCurrency(metrics.spread)}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">Spread</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 uppercase flex justify-between">
                    <span>Ask: {formatCurrency(metrics.lowestAsk)}</span>
                    <span>Bid: {formatCurrency(metrics.highestBid)}</span>
                </div>
            </div>

            {/* Card 3: Spoofing / Absorption Detection */}
            <div className={`p-4 border bg-black flex flex-col justify-center transition-colors duration-300 ${spoofWarning?.includes('SPOOFING') ? 'border-rose-500/50 bg-rose-500/5' :
                    spoofWarning?.includes('ABSORPTION') ? 'border-amber-500/50 bg-amber-500/5' :
                        'border-slate-800'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Delta Flow</span>
                </div>

                {spoofWarning ? (
                    <div className={`text-sm font-bold mt-1 ${spoofWarning.includes('SPOOFING') ? 'text-rose-500 animate-pulse' : 'text-amber-500'
                        }`}>
                        {spoofWarning}
                    </div>
                ) : (
                    <div className="text-sm font-bold mt-1 text-slate-500">
                        🟢 Stable Volume
                    </div>
                )}
                <div className="text-[10px] text-slate-500 mt-auto pt-2 uppercase flex justify-between">
                    <span>Ask Vol: {metrics.totalAsks.toFixed(2)}</span>
                    <span>Bid Vol: {metrics.totalBids.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
