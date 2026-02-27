import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Activity, Zap, Scale, BrainCircuit, Waves, Crosshair } from 'lucide-react';

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
    asset: 'BTC' | 'ETH' | string;
    layout?: 'horizontal' | 'vertical';
}

const [history, setHistory] = useState<{ mid: number, imbalance: number }[]>([]);
const [previousAskVol, setPreviousAskVol] = useState(0);
const [previousBidVol, setPreviousBidVol] = useState(0);
const [spoofWarning, setSpoofWarning] = useState<string | null>(null);

// Calculate quantitative metrics
const metrics = useMemo(() => {
    if (!depth.asks.length || !depth.bids.length) return null;

    const totalAsks = depth.asks.reduce((sum, level) => sum + level.quantity, 0);
    const totalBids = depth.bids.reduce((sum, level) => sum + level.quantity, 0);

    const lowestAsk = depth.asks[0].price;
    const highestBid = depth.bids[0].price;
    const highestAsk = depth.asks[depth.asks.length - 1].price;
    const lowestBid = depth.bids[depth.bids.length - 1].price;
    const midPrice = (lowestAsk + highestBid) / 2;

    // 1. Order Book Micro-Price
    const microPrice = (totalBids * lowestAsk + totalAsks * highestBid) / (totalBids + totalAsks);

    // 1b. Imbalance & Spread
    const imbalance = (totalBids - totalAsks) / (totalBids + totalAsks);
    const spread = lowestAsk - highestBid;

    // 2. Liquidity Density (Path of Least Resistance)
    const askDensity = totalAsks / (highestAsk - lowestAsk || 1);
    const bidDensity = totalBids / (highestBid - lowestBid || 1);
    const leastResistance = askDensity > bidDensity ? 'DOWN' : 'UP';

    return {
        totalAsks,
        totalBids,
        lowestAsk,
        highestBid,
        midPrice,
        microPrice,
        imbalance,
        spread,
        askDensity,
        bidDensity,
        leastResistance
    };
}, [depth]);

// Track order absorption / spoofing based on delta flow
useEffect(() => {
    if (!metrics) return;

    const askDelta = metrics.totalAsks - previousAskVol;
    const bidDelta = metrics.totalBids - previousBidVol;

    if (previousAskVol > 0 && previousBidVol > 0) {
        if (askDelta < -(previousAskVol * 0.15)) {
            setSpoofWarning('🚨 POSSIBLE SPOOFING: Sell Wall Pulled');
        } else if (bidDelta < -(previousBidVol * 0.15)) {
            setSpoofWarning('🚨 POSSIBLE SPOOFING: Buy Wall Pulled');
        } else if (askDelta > (previousAskVol * 0.15)) {
            setSpoofWarning('🟢 ABSORPTION: Heavy Sell Limit Added');
        } else if (bidDelta > (previousBidVol * 0.15)) {
            setSpoofWarning('🟢 ABSORPTION: Heavy Buy Limit Added');
        } else {
            setSpoofWarning(null);
        }
    }

    setPreviousAskVol(metrics.totalAsks);
    setPreviousBidVol(metrics.totalBids);
}, [metrics?.totalAsks, metrics?.totalBids]);

useEffect(() => {
    if (!metrics) return;
    setHistory(prev => {
        const next = [...prev, { mid: metrics.midPrice, imbalance: metrics.totalBids / (metrics.totalBids + metrics.totalAsks) }];
        if (next.length > 50) next.shift(); // Keep last 50 ticks
        return next;
    });
}, [metrics?.midPrice]);

const advancedMetrics = useMemo(() => {
    if (!metrics || history.length < 2) return null;

    // 3. Simulated VWAP (using order book depth changes as synthetic volume)
    let vwapSum = 0;
    let volSum = 0;
    history.forEach(tick => {
        // Synthetic volume weight based on imbalance extremity
        const weight = Math.abs(tick.imbalance - 0.5) * 100;
        vwapSum += tick.mid * weight;
        volSum += weight;
    });
    const vwap = vwapSum / (volSum || 1);

    // 4. VPIN Toxicity Approximation
    // Measure the variance in order flow imbalance
    const imbalances = history.map(h => h.imbalance);
    const meanImb = imbalances.reduce((a, b) => a + b, 0) / imbalances.length;
    const variance = imbalances.reduce((a, b) => a + Math.pow(b - meanImb, 2), 0) / imbalances.length;
    const vpin = Math.min(100, variance * 10000); // Scale for visual %

    // 5. Markov Chain Transition Probability
    // Calculate probability of an UP tick based on history
    let upTicks = 0;
    for (let i = 1; i < history.length; i++) {
        if (history[i].mid > history[i - 1].mid) upTicks++;
    }
    const markovProb = history.length > 1 ? (upTicks / (history.length - 1)) * 100 : 50;

    return {
        vwap,
        vpin,
        markovProb
    };
}, [metrics, history]);

if (!metrics || !advancedMetrics) return null;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);

const isBullMicro = metrics.microPrice > metrics.midPrice;
const isBullishImbalance = metrics.imbalance > 0.1;
const isBearishImbalance = metrics.imbalance < -0.1;

return (
    <div className={`grid gap-3 font-mono ${layout === 'horizontal' ? 'grid-cols-2 md:grid-cols-4 mb-8' : 'grid-cols-1 mb-0'}`}>
        {/* 1. Order Book Imbalance */}
        <div className={`p-3 border bg-black flex flex-col justify-center ${isBullishImbalance ? 'border-emerald-500/50' : isBearishImbalance ? 'border-rose-500/50' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Book Imbalance (OBI)</span>
            </div>
            <div className={`text-xl font-bold ${metrics.imbalance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {(metrics.imbalance * 100).toFixed(1)}%
            </div>
            {/* Visual Imbalance Bar */}
            <div className="w-full h-1 flex mt-2 rounded-full overflow-hidden bg-slate-800">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(metrics.totalBids / (metrics.totalAsks + metrics.totalBids)) * 100}%` }}></div>
                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${(metrics.totalAsks / (metrics.totalAsks + metrics.totalBids)) * 100}%` }}></div>
            </div>
        </div>

        {/* 2. Spread Squeezing */}
        <div className="p-3 border border-slate-800 bg-black flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Spread Squeezing</span>
            </div>
            <div className="text-xl font-bold text-amber-500">
                {formatCurrency(metrics.spread)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase flex justify-between">
                <span>Ask: {formatCurrency(metrics.lowestAsk)}</span>
                <span>Bid: {formatCurrency(metrics.highestBid)}</span>
            </div>
        </div>

        {/* 3. Spoofing / Delta Flow */}
        <div className={`p-3 border bg-black flex flex-col justify-center transition-colors duration-300 ${spoofWarning?.includes('SPOOFING') ? 'border-rose-500/50 bg-rose-500/5' : spoofWarning?.includes('ABSORPTION') ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delta Flow</span>
            </div>
            {spoofWarning ? (
                <div className={`text-xs font-bold ${spoofWarning.includes('SPOOFING') ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`}>
                    {spoofWarning}
                </div>
            ) : (
                <div className="text-xs font-bold text-slate-500">
                    🟢 Stable Volume
                </div>
            )}
        </div>

        {/* 4. Micro-Price */}
        <div className={`p-3 border bg-black flex flex-col justify-center ${isBullMicro ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
            <div className="flex items-center gap-2 mb-2">
                <Crosshair className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Micro-Price</span>
            </div>
            <div className="text-xl font-bold text-white">
                {formatCurrency(metrics.microPrice)}
            </div>
            <div className={`text-[10px] uppercase mt-1 ${isBullMicro ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isBullMicro ? 'Leading Upwards' : 'Leading Downwards'}
            </div>
        </div>

        {/* 5. VWAP */}
        <div className="p-3 border border-slate-800 bg-black flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. VWAP</span>
            </div>
            <div className="text-xl font-bold text-white">
                {formatCurrency(advancedMetrics.vwap)}
            </div>
            <div className={`text-[10px] uppercase mt-1 ${metrics.midPrice > advancedMetrics.vwap ? 'text-emerald-500' : 'text-rose-500'}`}>
                {metrics.midPrice > advancedMetrics.vwap ? 'Price > VWAP (Bullish)' : 'Price < VWAP (Bearish)'}
            </div>
        </div>

        {/* 6. VPIN Toxicity */}
        <div className={`p-3 border bg-black flex flex-col justify-center ${advancedMetrics.vpin > 70 ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">VPIN Toxicity</span>
            </div>
            <div className={`text-xl font-bold ${advancedMetrics.vpin > 70 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`}>
                {advancedMetrics.vpin.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase">
                {advancedMetrics.vpin > 70 ? '🚨 HIGH INSIDER FLOW' : '🟢 NORMAL RETAIL FLOW'}
            </div>
        </div>

        {/* 7. Markov Probability */}
        <div className={`p-3 border bg-black flex flex-col justify-center ${advancedMetrics.markovProb > 60 ? 'border-emerald-500/50' : advancedMetrics.markovProb < 40 ? 'border-rose-500/50' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Markov UP-Tick P(x)</span>
            </div>
            <div className={`text-xl font-bold ${advancedMetrics.markovProb > 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {advancedMetrics.markovProb.toFixed(1)}%
            </div>
            <div className="w-full h-1 mt-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${advancedMetrics.markovProb}%` }}></div>
            </div>
        </div>

        {/* 8. Liquidity Density */}
        <div className="p-3 border border-slate-800 bg-black flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
                <Waves className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Density (Least Resist)</span>
            </div>
            <div className={`text-xl font-bold ${metrics.leastResistance === 'UP' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {metrics.leastResistance}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase flex justify-between">
                <span>Ask: {metrics.askDensity.toFixed(1)}</span>
                <span>Bid: {metrics.bidDensity.toFixed(1)}</span>
            </div>
        </div>
    </div>
);
}
