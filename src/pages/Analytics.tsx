import React, { useMemo, useState, useEffect } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap, Compass } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { clsx } from 'clsx';
import { fetchFearAndGreed } from '../services/api';
import CompareChart from '../components/CompareChart';
import DCACalculator from '../components/DCACalculator';

export default function Analytics() {
    const { coins, portfolio } = useCryptoStore();
    const [fng, setFng] = useState<{ value: number, classification: string } | null>(null);

    useEffect(() => {
        fetchFearAndGreed().then(setFng);
    }, []);

    // Top Gainers & Losers (24h)
    const sortedBy24h = useMemo(() => [...coins].sort((a, b) =>
        (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    ), [coins]);

    const topGainers = sortedBy24h.slice(0, 5);
    const topLosers = sortedBy24h.slice(-5).reverse();

    // Volatility: std deviation of sparkline 7d prices
    const volatilityData = useMemo(() => {
        return coins
            .filter(c => c.sparkline_in_7d?.price?.length)
            .map(c => {
                const prices = c.sparkline_in_7d!.price;
                const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
                const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
                const stdDev = Math.sqrt(variance);
                const volatility = (stdDev / mean) * 100; // Coefficient of variation as %
                return { id: c.id, name: c.name, symbol: c.symbol, image: c.image, volatility };
            })
            .sort((a, b) => b.volatility - a.volatility)
            .slice(0, 10);
    }, [coins]);

    // Market Stats
    const totalMarketCap = useMemo(() => coins.reduce((sum, c) => sum + c.market_cap, 0), [coins]);
    const totalVolume = useMemo(() => coins.reduce((sum, c) => sum + c.total_volume, 0), [coins]);
    const avgChange = useMemo(() => {
        if (coins.length === 0) return 0;
        return coins.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / coins.length;
    }, [coins]);

    // Portfolio allocation for pie chart
    const portfolioData = useMemo(() => {
        return portfolio.map(item => {
            const coin = coins.find(c => c.id === item.coinId);
            if (!coin) return null;
            return { name: coin.symbol.toUpperCase(), value: item.amount * coin.current_price };
        }).filter(Boolean) as { name: string; value: number }[];
    }, [portfolio, coins]);

    const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);

    const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

    const formatLargeNumber = (val: number) => {
        if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        return formatCurrency(val);
    };

    return (
        <div className="space-y-6 font-mono">
            <div className="border-b border-slate-800 pb-4">
                <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-500" />
                    Analytics Terminal
                </h1>
                <p className="text-xs text-slate-500 mt-1">ADVANCED MARKET INTELLIGENCE & METRICS</p>
            </div>

            {/* Market Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black border border-slate-800 p-4">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Market Cap</p>
                    <div className="text-lg font-bold text-white tabular-nums">{formatLargeNumber(totalMarketCap)}</div>
                </div>
                <div className="bg-black border border-slate-800 p-4">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">24h Volume</p>
                    <div className="text-lg font-bold text-slate-300 tabular-nums">{formatLargeNumber(totalVolume)}</div>
                </div>
                <div className="bg-black border border-slate-800 p-4">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Avg 24h Change</p>
                    <div className={clsx("text-lg font-bold tabular-nums", avgChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatPercent(avgChange)}
                    </div>
                </div>
                <div className="bg-black border border-slate-800 p-4">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Assets Tracked</p>
                    <div className="text-lg font-bold text-amber-500 tabular-nums">{coins.length}</div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="border border-slate-800 bg-black">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest text-xs">
                        <TrendingUp className="w-3 h-3" />
                        Top Gainers (24h)
                    </div>
                    <div className="divide-y divide-slate-800">
                        {topGainers.map((coin, i) => (
                            <Link to={`/coin/${coin.id}`} key={coin.id} className="flex items-center justify-between p-3 hover:bg-slate-900 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-600 w-4 font-bold">{i + 1}</span>
                                    {coin.image && <img src={coin.image} alt={coin.name} className="w-5 h-5 object-contain" />}
                                    <span className="text-sm font-bold text-slate-200 uppercase group-hover:text-white">{coin.symbol}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-500 tabular-nums">{formatPercent(coin.price_change_percentage_24h || 0)}</div>
                                    <div className="text-[10px] text-slate-500 tabular-nums">{formatCurrency(coin.current_price)}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Top Losers */}
                <div className="border border-slate-800 bg-black">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-rose-500 font-bold uppercase tracking-widest text-xs">
                        <TrendingDown className="w-3 h-3" />
                        Top Losers (24h)
                    </div>
                    <div className="divide-y divide-slate-800">
                        {topLosers.map((coin, i) => (
                            <Link to={`/coin/${coin.id}`} key={coin.id} className="flex items-center justify-between p-3 hover:bg-slate-900 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-600 w-4 font-bold">{i + 1}</span>
                                    {coin.image && <img src={coin.image} alt={coin.name} className="w-5 h-5 object-contain" />}
                                    <span className="text-sm font-bold text-slate-200 uppercase group-hover:text-white">{coin.symbol}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-rose-500 tabular-nums">{formatPercent(coin.price_change_percentage_24h || 0)}</div>
                                    <div className="text-[10px] text-slate-500 tabular-nums">{formatCurrency(coin.current_price)}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Volatility, F&G, Portfolio */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Fear & Greed Index */}
                <div className="border border-slate-800 bg-black">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs">
                        <Compass className="w-3 h-3" />
                        Fear & Greed Index
                    </div>
                    {fng ? (
                        <div className="flex flex-col items-center justify-center p-6 relative h-[250px]">
                            <svg viewBox="0 0 200 120" className="w-full max-w-[200px] overflow-visible">
                                {/* Background Track */}
                                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" className="stroke-slate-800" strokeWidth="20" strokeLinecap="round" />

                                {/* Colored Progress */}
                                <path
                                    d="M 20 100 A 80 80 0 0 1 180 100"
                                    fill="none"
                                    stroke={fng.value > 75 ? '#10b981' : fng.value > 55 ? '#84cc16' : fng.value > 45 ? '#eab308' : fng.value > 25 ? '#f97316' : '#ef4444'}
                                    strokeWidth="20"
                                    strokeLinecap="round"
                                    strokeDasharray="251"
                                    strokeDashoffset={251 - (fng.value / 100) * 251}
                                    className="transition-all duration-1000 ease-out delay-300"
                                />

                                {/* Needle */}
                                <g className="transition-transform duration-1000 ease-out delay-300 fill-slate-300" style={{ transformOrigin: '100px 100px', transform: `rotate(${(fng.value / 100) * 180 - 90}deg)` }}>
                                    <polygon points="96,100 104,100 100,30" />
                                    <circle cx="100" cy="100" r="6" className="fill-slate-100" />
                                </g>
                            </svg>
                            <div className="absolute bottom-4 text-center">
                                <div className="text-4xl font-bold font-mono" style={{ color: fng.value > 75 ? '#10b981' : fng.value > 55 ? '#84cc16' : fng.value > 45 ? '#eab308' : fng.value > 25 ? '#f97316' : '#ef4444' }}>
                                    {fng.value}
                                </div>
                                <div className="text-xs uppercase font-bold text-slate-500 mt-1">{fng.classification}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[250px] text-slate-600 font-mono text-xs animate-pulse">
                            FETCHING_DATA...
                        </div>
                    )}
                </div>

                {/* Volatility Index */}
                <div className="border border-slate-800 bg-black">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-xs">
                        <Zap className="w-3 h-3" />
                        7d Volatility Index
                    </div>
                    <div className="divide-y divide-slate-800">
                        {volatilityData.map((item, i) => (
                            <div key={item.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-600 w-4 font-bold">{i + 1}</span>
                                    {item.image && <img src={item.image} alt={item.name} className="w-5 h-5 object-contain" />}
                                    <span className="text-sm font-bold text-slate-200 uppercase">{item.symbol}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-slate-900 h-2 overflow-hidden">
                                        <div
                                            className={clsx("h-full transition-all", item.volatility > 10 ? "bg-rose-500" : item.volatility > 5 ? "bg-amber-500" : "bg-emerald-500")}
                                            style={{ width: `${Math.min(item.volatility * 5, 100)}%` }}
                                        />
                                    </div>
                                    <span className={clsx(
                                        "text-xs font-bold tabular-nums min-w-[50px] text-right",
                                        item.volatility > 10 ? "text-rose-500" : item.volatility > 5 ? "text-amber-500" : "text-emerald-500"
                                    )}>
                                        {item.volatility.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Portfolio Allocation */}
                <div className="border border-slate-800 bg-black p-6">
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
                        <Activity className="w-3 h-3 text-amber-500" />
                        Portfolio Allocation
                    </div>
                    {portfolioData.length > 0 ? (
                        <>
                            <div className="h-[200px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={portfolioData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {portfolioData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#334155', borderRadius: '0', color: '#fff', fontFamily: 'JetBrains Mono' }}
                                            formatter={(val: number) => formatCurrency(val)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-1">
                                {portfolioData.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-slate-300 uppercase">{item.name}</span>
                                        </div>
                                        <span className="text-slate-400 tabular-nums">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] text-slate-600 text-xs uppercase">
                            <Activity className="w-6 h-6 mb-2" />
                            No positions to visualize
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Tools Section */}
            <div className="border-t border-slate-800 pt-8 mt-8 grid xl:grid-cols-2 gap-6">
                <CompareChart />
                <DCACalculator />
            </div>
        </div>
    );
}
