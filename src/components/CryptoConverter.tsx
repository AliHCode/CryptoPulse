import React, { useState, useMemo } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { ArrowLeftRight, Calculator } from 'lucide-react';

export default function CryptoConverter() {
    const { coins } = useCryptoStore();
    const [amount, setAmount] = useState<string>('1000');
    const [fromAsset, setFromAsset] = useState<string>('usd');
    const [toAsset, setToAsset] = useState<string>('bitcoin');

    // Create a special USD "coin" to mix with our actual tracked crypto for the dropdowns
    const allAssets = useMemo(() => {
        return [
            { id: 'usd', symbol: 'USD', name: 'US Dollar', current_price: 1, image: '' },
            ...coins
        ];
    }, [coins]);

    const handleSwap = () => {
        setFromAsset(toAsset);
        setToAsset(fromAsset);
    };

    const conversionResult = useMemo(() => {
        const fromPrice = allAssets.find(c => c.id === fromAsset)?.current_price || 0;
        const toPrice = allAssets.find(c => c.id === toAsset)?.current_price || 0;

        const numAmount = parseFloat(amount) || 0;
        if (fromPrice === 0 || toPrice === 0 || numAmount === 0) return 0;

        // Convert source to USD, then USD to Target
        const valueInUsd = numAmount * fromPrice;
        return valueInUsd / toPrice;
    }, [allAssets, amount, fromAsset, toAsset]);

    const formatResult = (val: number) => {
        if (toAsset === 'usd') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        }
        // If converting to a crypto, show up to 6 decimals based on value
        return val.toLocaleString(undefined, { maximumFractionDigits: val < 1 ? 6 : 2 });
    };

    return (
        <div className="border border-slate-800 bg-black font-mono flex flex-col h-full">
            <div className="p-2.5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-[10px]">
                <Calculator className="w-3 h-3" />
                Quick Convert
            </div>

            <div className="p-4 flex-1 flex flex-col justify-center gap-4">
                {/* From Input */}
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">You Pay</label>
                    <div className="flex bg-slate-900 border border-slate-700 focus-within:border-indigo-500 transition-colors">
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-transparent text-white p-3 w-full outline-none font-bold tabular-nums"
                            placeholder="0.00"
                        />
                        <select
                            value={fromAsset}
                            onChange={(e) => setFromAsset(e.target.value)}
                            className="bg-slate-800 text-slate-200 border-l border-slate-700 p-3 outline-none font-bold uppercase w-32 cursor-pointer"
                        >
                            {allAssets.map(asset => (
                                <option key={`from-${asset.id}`} value={asset.id}>{asset.symbol}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-2 relative z-10">
                    <button
                        onClick={handleSwap}
                        className="bg-slate-800 border border-slate-700 p-2 rounded-full text-slate-400 hover:text-white hover:border-indigo-500 transition-all cursor-pointer"
                        title="Swap Currencies"
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                    </button>
                </div>

                {/* To Input (Readonly) */}
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">You Receive</label>
                    <div className="flex bg-slate-900/50 border border-slate-800">
                        <div className="p-3 w-full font-bold tabular-nums text-emerald-500 truncate flex items-center">
                            {formatResult(conversionResult)}
                        </div>
                        <select
                            value={toAsset}
                            onChange={(e) => setToAsset(e.target.value)}
                            className="bg-slate-800 text-slate-200 border-l border-slate-700 p-3 outline-none font-bold uppercase w-32 cursor-pointer"
                        >
                            {allAssets.map(asset => (
                                <option key={`to-${asset.id}`} value={asset.id}>{asset.symbol}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
