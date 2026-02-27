import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Radar, Activity, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WhaleTransaction {
    id: string;
    blockchain: string;
    symbol: string;
    transaction_type: string;
    hash: string;
    from: { address: string; owner_type: string; owner?: string };
    to: { address: string; owner_type: string; owner?: string };
    timestamp: number;
    amount: number;
    amount_usd: number;
}

export default function WhaleAlerts() {
    const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to Binance Spot WebSocket for major pairs
        const streams = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'dogeusdt', 'bnbusdt']
            .map(s => `${s}@aggTrade`)
            .join('/');

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

        ws.onopen = () => {
            setLoading(false);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'aggTrade') {
                const price = parseFloat(data.p);
                const quantity = parseFloat(data.q);
                const amountUsd = price * quantity;

                // Threshold: Only show trades > $500,000 USD to ensure constant dopamine without overwhelming the UI
                if (amountUsd > 500000) {
                    const symbol = data.s.replace('USDT', '');
                    const isSell = data.m; // m: true means the buyer was the market maker (so it was a market sell)

                    const newTx: WhaleTransaction = {
                        id: `binance-${data.a}`,
                        blockchain: 'Binance Exchange',
                        symbol: symbol,
                        transaction_type: isSell ? 'SELL EXECUTION' : 'BUY EXECUTION',
                        hash: data.a.toString(), // Aggregate Trade ID
                        from: {
                            address: isSell ? 'Market Seller' : 'Binance Orderbook',
                            owner_type: 'exchange',
                            owner: 'Binance'
                        },
                        to: {
                            address: isSell ? 'Binance Orderbook' : 'Market Buyer',
                            owner_type: 'exchange',
                            owner: 'Binance'
                        },
                        timestamp: Math.floor(data.T / 1000),
                        amount: quantity,
                        amount_usd: amountUsd
                    };

                    setTransactions(prev => {
                        const next = [newTx, ...prev];
                        if (next.length > 50) next.pop(); // Keep last 50 alerts
                        return next;
                    });
                }
            }
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const formatAddress = (entity: { address: string; owner_type: string; owner?: string }) => {
        return entity.address;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    const getBlockExplorerUrl = (symbol: string) => {
        return `https://www.binance.com/en/trade/${symbol}_USDT`;
    };

    return (
        <div className="space-y-6 font-mono pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
                        <Radar className="w-5 h-5 text-indigo-500" />
                        Whale Execution Radar
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">REAL-TIME LARGE CAP EXCHANGE EXECUTIONS {'>'} $500K USD</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-700 text-indigo-400 text-[10px] font-bold uppercase transition-all">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    MONITORING BINANCE ORDERFLOW
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-600 text-xs font-mono animate-pulse">
                    <Activity className="w-8 h-8 mb-4 text-indigo-500/50" />
                    CONNECTING TO LIVE ORDERFLOW...
                </div>
            ) : (
                <div className="border border-slate-800 bg-black overflow-hidden relative">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] uppercase text-slate-500 tracking-wider">
                                    <th className="p-4 font-bold">Time</th>
                                    <th className="p-4 font-bold">Asset</th>
                                    <th className="p-4 font-bold leading-tight">Amount<br />(USD Value)</th>
                                    <th className="p-4 font-bold hidden sm:table-cell">Movement Route</th>
                                    <th className="p-4 font-bold text-right">Blockchain Hash</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors group">
                                        <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                                            {formatDistanceToNow(tx.timestamp * 1000, { addSuffix: true })}
                                        </td>

                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {(tx.symbol || 'UNK').substring(0, 3)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-200 uppercase">{tx.symbol}</span>
                                                    <span className={`text-[10px] uppercase font-bold ${tx.transaction_type.includes('SELL') ? 'text-rose-500' : 'text-emerald-500'}`}>{tx.transaction_type}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-indigo-400 tabular-nums">
                                                    {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tx.symbol}
                                                </span>
                                                <span className="text-[10px] text-slate-500 tabular-nums">
                                                    {formatCurrency(tx.amount_usd)}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 hidden sm:table-cell">
                                            <div className="flex items-center gap-3 text-xs uppercase">
                                                <div className="flex flex-col max-w-[120px]">
                                                    <span className="text-slate-300 font-bold truncate" title={formatAddress(tx.from)}>{formatAddress(tx.from)}</span>
                                                    <span className="text-[10px] text-rose-500">{tx.from.owner_type}</span>
                                                </div>

                                                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                                                <div className="flex flex-col max-w-[120px]">
                                                    <span className="text-slate-300 font-bold truncate" title={formatAddress(tx.to)}>{formatAddress(tx.to)}</span>
                                                    <span className="text-[10px] text-emerald-500">{tx.to.owner_type}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <a
                                                href={getBlockExplorerUrl(tx.symbol)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-400 font-bold font-mono hover:text-indigo-400 hover:border-indigo-500 transition-colors uppercase"
                                            >
                                                Chart
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
