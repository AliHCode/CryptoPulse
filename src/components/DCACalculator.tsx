import React, { useState, useMemo } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { fetchCoinHistory } from '../services/api';
import { Calculator, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore } from './Toast';

export default function DCACalculator() {
    const { coins } = useCryptoStore();
    const { addToast } = useToastStore();

    const [coinId, setCoinId] = useState(coins[0]?.id || 'bitcoin');
    const [amount, setAmount] = useState('100');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [durationDays, setDurationDays] = useState('365'); // Default 1 year

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ invested: number, currentValue: number, coinAmount: number } | null>(null);

    const calculateDCA = async () => {
        const parsedAmount = parseFloat(amount);
        const parsedDays = parseInt(durationDays);

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            addToast({ title: 'Invalid Input', message: 'Amount must be greater than 0', type: 'error' });
            return;
        }

        const coin = coins.find(c => c.id === coinId);
        if (!coin) return;

        setLoading(true);
        try {
            // Fetch historical data for the requested duration
            const history = await fetchCoinHistory(coinId, parsedDays, coin.symbol);

            if (!history || history.length === 0) {
                addToast({ title: 'Data Unavailable', message: `Not enough historical data for ${coin.name}`, type: 'error' });
                return;
            }

            // history is array of [timestamp, price] sorted oldest to newest normally, but let's ensure order
            const sortedHistory = [...history].sort((a, b) => a[0] - b[0]);

            let totalInvested = 0;
            let totalCoinsOwned = 0;

            // Determine step interval in ms based on frequency
            const dayMs = 24 * 60 * 60 * 1000;
            let stepMs = dayMs * 7; // weekly default
            if (frequency === 'daily') stepMs = dayMs;
            if (frequency === 'monthly') stepMs = dayMs * 30;

            // We simulate buying from the start of the fetched history
            let nextPurchaseTime = sortedHistory[0][0];

            // Step through history and "buy" at intervals
            sortedHistory.forEach(([time, price]) => {
                if (time >= nextPurchaseTime) {
                    totalInvested += parsedAmount;
                    totalCoinsOwned += parsedAmount / price;
                    nextPurchaseTime += stepMs;
                }
            });

            // The exact current value is total coins * current live price
            const currentValue = totalCoinsOwned * coin.current_price;

            setResult({
                invested: totalInvested,
                currentValue: currentValue,
                coinAmount: totalCoinsOwned
            });

        } catch (err) {
            console.error(err);
            addToast({ title: 'Calculation Error', message: 'Failed to fetch historical data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const profit = result ? result.currentValue - result.invested : 0;
    const profitPercent = result && result.invested > 0 ? (profit / result.invested) * 100 : 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="border border-slate-800 bg-black p-6 font-mono">
            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6">
                <Calculator className="w-4 h-4" />
                DCA Simulator
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-500 uppercase mb-1">Asset</label>
                        <select
                            value={coinId}
                            onChange={e => setCoinId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:border-indigo-500 outline-none uppercase"
                        >
                            {coins.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 uppercase mb-1">Buy Amount ($)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 uppercase mb-1">Frequency</label>
                            <select
                                value={frequency}
                                onChange={e => setFrequency(e.target.value as any)}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:border-indigo-500 outline-none uppercase cursor-pointer"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-500 uppercase mb-1">Duration</label>
                        <select
                            value={durationDays}
                            onChange={e => setDurationDays(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:border-indigo-500 outline-none uppercase cursor-pointer"
                        >
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="180">Last 6 Months</option>
                            <option value="365">Last 1 Year</option>
                            <option value="1095">Last 3 Years</option>
                        </select>
                    </div>

                    <button
                        onClick={calculateDCA}
                        disabled={loading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Simulate Strategy'}
                    </button>
                </div>

                {/* Results */}
                <div className="bg-slate-900 border border-slate-800 p-6 flex flex-col justify-center relative overflow-hidden">
                    {/* Background decoration */}
                    <Calculator className="absolute -right-6 -bottom-6 w-32 h-32 text-slate-800/30" />

                    {result ? (
                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Total Amount Invested</p>
                                <div className="text-2xl font-bold text-slate-200">{formatCurrency(result.invested)}</div>
                            </div>

                            <div>
                                <p className="text-xs text-slate-500 uppercase">Current Portfolio Value</p>
                                <div className={clsx("text-3xl font-bold", profit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {formatCurrency(result.currentValue)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Total Profit/Loss</p>
                                    <div className={clsx("text-sm font-bold", profit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Return on Investment (ROI)</p>
                                    <div className={clsx("text-sm font-bold", profitPercent >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 text-xs relative z-10">
                            Configure parameters and click simulate to view historical returns.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
