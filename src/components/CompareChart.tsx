import React, { useState, useEffect } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { fetchCoinHistory } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { GitCompare, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function CompareChart() {
    const { coins } = useCryptoStore();
    const [coinA, setCoinA] = useState(coins[0]?.id || 'bitcoin');
    const [coinB, setCoinB] = useState(coins[1]?.id || 'ethereum');

    // Derived state for easy access to full coin details
    const coinADetails = coins.find(c => c.id === coinA);
    const coinBDetails = coins.find(c => c.id === coinB);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        if (!coinA || !coinB || !coinADetails || !coinBDetails) return;

        let active = true;
        const loadComparison = async () => {
            setLoading(true);
            try {
                // Fetch 30-day history for both
                const [histA, histB] = await Promise.all([
                    fetchCoinHistory(coinA, 30, coinADetails.symbol),
                    fetchCoinHistory(coinB, 30, coinBDetails.symbol)
                ]);

                if (!active || !histA.length || !histB.length) return;

                // Normalize data: align by timestamp
                // Using histA as the foundation timeline.
                const mapB = new Map<number, number>();
                histB.forEach(([time, price]: [number, number]) => {
                    // binance klines return timestamps that might not match exactly, so round to nearest hour
                    const hour = Math.floor(time / 3600000) * 3600000;
                    mapB.set(hour, price);
                });

                const startPriceA = histA[0][1];
                let startPriceB: number | null = null;

                const mergedMap = new Map<number, { time: number, valA: number, valB?: number }>();

                histA.forEach(([time, price]: [number, number]) => {
                    const hour = Math.floor(time / 3600000) * 3600000;
                    const priceB = mapB.get(hour);

                    if (priceB !== undefined) {
                        if (startPriceB === null) startPriceB = priceB;

                        // Calculate percentage change from start
                        const percentA = ((price - startPriceA) / startPriceA) * 100;
                        const percentB = ((priceB - startPriceB) / startPriceB) * 100;

                        mergedMap.set(hour, {
                            time,
                            valA: percentA,
                            valB: percentB
                        });
                    }
                });

                const mergedData = Array.from(mergedMap.values()).sort((a, b) => a.time - b.time);
                setData(mergedData);

            } catch (err) {
                console.error(err);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadComparison();

        return () => { active = false; };
    }, [coinA, coinB, coinADetails, coinBDetails]);

    if (!coinADetails || !coinBDetails) return null;

    return (
        <div className="border border-slate-800 bg-black p-6 font-mono">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-xs">
                    <GitCompare className="w-4 h-4" />
                    Relative Performance (30d)
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={coinA}
                        onChange={e => setCoinA(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs p-1.5 focus:border-amber-500 outline-none uppercase"
                    >
                        {coins.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
                    </select>
                    <span className="text-slate-500 text-xs">vs</span>
                    <select
                        value={coinB}
                        onChange={e => setCoinB(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs p-1.5 focus:border-emerald-500 outline-none uppercase"
                    >
                        {coins.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
                    </select>
                </div>
            </div>

            <div className="h-[300px] w-full relative">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                    </div>
                )}

                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="time"
                                domain={['dataMin', 'dataMax']}
                                type="number"
                                tickFormatter={(time) => format(time, 'MMM dd')}
                                stroke="#334155"
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                minTickGap={30}
                            />
                            <YAxis
                                tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`}
                                stroke="#334155"
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', borderColor: '#334155', borderRadius: '0' }}
                                itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                                labelFormatter={(label) => format(label, 'MMM dd, yyyy HH:mm')}
                                formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, name === 'valA' ? coinADetails.symbol.toUpperCase() : coinBDetails.symbol.toUpperCase()]}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Line
                                name="valA"
                                type="monotone"
                                dataKey="valA"
                                stroke="#f59e0b" /* Amber */
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#f59e0b', stroke: '#000' }}
                            />
                            <Line
                                name="valB"
                                type="monotone"
                                dataKey="valB"
                                stroke="#10b981" /* Emerald */
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#10b981', stroke: '#000' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-600 text-xs">
                        NO COMPARABLE DATA FOUND
                    </div>
                )}
            </div>
        </div>
    );
}
