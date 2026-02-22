import React, { useState, useMemo, useEffect } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { Search, ArrowUpRight, ArrowDownRight, Terminal, Activity, Star, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { analyzeMarket } from '../services/gemini';
import { useToastStore } from '../components/Toast';
import PriceFlash from '../components/PriceFlash';

type SortKey = 'rank' | 'price' | 'change24h' | 'marketCap' | 'volume';
type SortDir = 'asc' | 'desc';

export default function Dashboard() {
  const { coins, isLoading, watchlist, addToWatchlist, removeFromWatchlist, searchQuery, setSearchQuery } = useCryptoStore();
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const { addToast } = useToastStore();
  const [tab, setTab] = useState<'all' | 'watchlist'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Listen for analysis results from the global header button
  useEffect(() => {
    const handler = () => {
      setAiAnalysis((window as any).__aiAnalysis);
    };
    window.addEventListener('ai-analysis-ready', handler);
    return () => window.removeEventListener('ai-analysis-ready', handler);
  }, []);

  // Reset to All tab when searching
  useEffect(() => {
    if (searchQuery) setTab('all');
  }, [searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline-block ml-1" />
      : <ChevronDown className="w-3 h-3 inline-block ml-1" />;
  };

  const filteredCoins = useMemo(() => {
    let base = tab === 'watchlist'
      ? coins.filter(c => watchlist.includes(c.id))
      : searchQuery
        ? coins.filter(c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : coins.slice(0, 50);

    // Sort
    const sorted = [...base].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'rank': diff = a.market_cap_rank - b.market_cap_rank; break;
        case 'price': diff = a.current_price - b.current_price; break;
        case 'change24h': diff = (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0); break;
        case 'marketCap': diff = a.market_cap - b.market_cap; break;
        case 'volume': diff = a.total_volume - b.total_volume; break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return sorted;
  }, [coins, searchQuery, tab, watchlist, sortKey, sortDir]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(val);

  const formatPercent = (val: number | null | undefined) => {
    if (val == null) return '0.00%';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const toggleWatchlist = (coinId: string) => {
    if (watchlist.includes(coinId)) {
      removeFromWatchlist(coinId);
    } else {
      addToWatchlist(coinId);
    }
  };

  return (
    <div className="space-y-6">

      {/* AI Analysis Terminal */}
      {aiAnalysis && (
        <div className="bg-black border border-amber-500/30 p-4 font-mono text-sm relative">
          <div className="absolute top-0 left-0 px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase border-b border-r border-amber-500/30">
            Gemini Intelligence
          </div>
          <div className="mt-4 grid md:grid-cols-4 gap-6">
            <div className="border-r border-slate-800 pr-6">
              <p className="text-xs text-slate-500 uppercase mb-1">Sentiment</p>
              <p className={clsx(
                "text-xl font-bold uppercase",
                aiAnalysis.sentiment === 'Bullish' ? 'text-emerald-500' :
                  aiAnalysis.sentiment === 'Bearish' ? 'text-rose-500' : 'text-amber-500'
              )}>{aiAnalysis.sentiment}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-xs text-slate-500 uppercase mb-2">Key Takeaways</p>
              <ul className="space-y-1">
                {aiAnalysis.takeaways?.map((t: string, i: number) => (
                  <li key={i} className="text-slate-300 flex items-start gap-2">
                    <span className="text-amber-500">&gt;</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Market Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Market Cap</p>
          <div className="text-lg font-bold text-white tabular-nums">
            {coins.length > 0 ? `$${(coins.reduce((s, c) => s + c.market_cap, 0) / 1e12).toFixed(2)}T` : '—'}
          </div>
        </div>
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">24h Volume</p>
          <div className="text-lg font-bold text-slate-300 tabular-nums">
            {coins.length > 0 ? `$${(coins.reduce((s, c) => s + c.total_volume, 0) / 1e9).toFixed(2)}B` : '—'}
          </div>
        </div>
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Avg 24h Change</p>
          {(() => {
            const avg = coins.length > 0 ? coins.reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / coins.length : 0;
            return (
              <div className={clsx("text-lg font-bold tabular-nums", avg >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {avg > 0 ? '+' : ''}{avg.toFixed(2)}%
              </div>
            );
          })()}
        </div>
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Assets Tracked</p>
          <div className="text-lg font-bold text-amber-500 tabular-nums">{coins.length}</div>
        </div>
      </div>

      {/* Top Gainers & Losers */}
      <div className="grid lg:grid-cols-2 gap-4 font-mono">
        {/* Top Gainers */}
        <div className="border border-slate-800 bg-black">
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest text-[10px]">
            <TrendingUp className="w-3 h-3" />
            Top Gainers (24h)
          </div>
          <div className="divide-y divide-slate-800">
            {[...coins].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 5).map((coin, i) => (
              <Link to={`/coin/${coin.id}`} key={coin.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-900 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-4 font-bold">{i + 1}</span>
                  {coin.image && <img src={coin.image} alt={coin.name} className="w-4 h-4 object-contain" />}
                  <span className="text-xs font-bold text-slate-200 uppercase group-hover:text-white">{coin.symbol}</span>
                </div>
                <div className="text-xs font-bold text-emerald-500 tabular-nums">{formatPercent(coin.price_change_percentage_24h)}</div>
              </Link>
            ))}
          </div>
        </div>
        {/* Top Losers */}
        <div className="border border-slate-800 bg-black">
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 text-rose-500 font-bold uppercase tracking-widest text-[10px]">
            <TrendingDown className="w-3 h-3" />
            Top Losers (24h)
          </div>
          <div className="divide-y divide-slate-800">
            {[...coins].sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)).slice(0, 5).map((coin, i) => (
              <Link to={`/coin/${coin.id}`} key={coin.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-900 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-4 font-bold">{i + 1}</span>
                  {coin.image && <img src={coin.image} alt={coin.name} className="w-4 h-4 object-contain" />}
                  <span className="text-xs font-bold text-slate-200 uppercase group-hover:text-white">{coin.symbol}</span>
                </div>
                <div className="text-xs font-bold text-rose-500 tabular-nums">{formatPercent(coin.price_change_percentage_24h)}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-slate-800 font-mono">
        <button
          onClick={() => setTab('all')}
          className={clsx(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
            tab === 'all' ? "text-amber-500 border-amber-500" : "text-slate-500 border-transparent hover:text-slate-300"
          )}
        >
          All Assets <span className="text-[10px] text-slate-600 ml-1">({coins.length > 50 && !searchQuery ? 50 : filteredCoins.length})</span>
        </button>
        <button
          onClick={() => setTab('watchlist')}
          className={clsx(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1",
            tab === 'watchlist' ? "text-amber-500 border-amber-500" : "text-slate-500 border-transparent hover:text-slate-300"
          )}
        >
          <Star className="w-3 h-3" />
          Watchlist <span className="text-[10px] text-slate-600 ml-1">({watchlist.length})</span>
        </button>
      </div>

      {/* Data Grid */}
      <div className="border border-slate-800 bg-black">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-4 px-4 font-normal w-8"></th>
                <th className="py-4 px-4 font-normal cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('rank')}>
                  Asset<SortIcon column="rank" />
                </th>
                <th className="py-4 px-4 text-right font-normal cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('price')}>
                  Price (USD)<SortIcon column="price" />
                </th>
                <th className="py-4 px-4 text-right font-normal cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('change24h')}>
                  24h %<SortIcon column="change24h" />
                </th>
                <th className="py-4 px-4 text-right font-normal hidden md:table-cell cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('marketCap')}>
                  Market Cap<SortIcon column="marketCap" />
                </th>
                <th className="py-4 px-4 text-right font-normal hidden lg:table-cell cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('volume')}>
                  Vol (24h)<SortIcon column="volume" />
                </th>
                <th className="py-4 px-4 text-right font-normal w-24">Trend (7d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && coins.length === 0 ? (
                [...Array(15)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-2 pl-4"><div className="w-4 h-4 rounded bg-slate-800" /></td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-slate-800" />
                        <div className="w-6 h-6 rounded-full bg-slate-800" />
                        <div className="w-16 h-4 rounded bg-slate-800" />
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right"><div className="w-20 h-4 rounded bg-slate-800 ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="w-12 h-4 rounded bg-slate-800 ml-auto" /></td>
                    <td className="py-4 px-4 text-right hidden md:table-cell"><div className="w-16 h-4 rounded bg-slate-800 ml-auto" /></td>
                    <td className="py-4 px-4 text-right hidden lg:table-cell"><div className="w-16 h-4 rounded bg-slate-800 ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="w-20 h-5 rounded bg-slate-800 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCoins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Star className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-bold uppercase">
                      {tab === 'watchlist' ? 'No coins in watchlist. Star coins to add them.' : 'No results found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCoins.map((coin) => (
                  <tr key={coin.id} className="group hover:bg-slate-900 transition-colors">
                    <td className="py-4 px-2 pl-4">
                      <button
                        onClick={() => toggleWatchlist(coin.id)}
                        className="p-1 transition-colors"
                      >
                        <Star className={clsx(
                          "w-3.5 h-3.5 transition-colors",
                          watchlist.includes(coin.id)
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-700 hover:text-slate-500"
                        )} />
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <Link to={`/coin/${coin.id}`} className="flex items-center gap-2">
                        <span className="font-bold text-amber-500 w-6 text-right text-xs">{coin.market_cap_rank}</span>
                        {coin.image && (
                          <img src={coin.image} alt={coin.name} className="w-5 h-5 object-contain" />
                        )}
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-white group-hover:underline decoration-amber-500 underline-offset-2 text-sm">{coin.symbol.toUpperCase()}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-200 text-sm tabular-nums">
                      <PriceFlash value={coin.current_price} formatter={formatCurrency} />
                    </td>
                    <td className={clsx(
                      "py-4 px-4 text-right font-bold text-sm tabular-nums",
                      (coin.price_change_percentage_24h || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      <PriceFlash value={coin.price_change_percentage_24h || 0} formatter={formatPercent} />
                    </td>
                    <td className="py-4 px-4 text-right text-slate-400 hidden md:table-cell text-sm tabular-nums">
                      {(coin.market_cap / 1e9).toFixed(2)}B
                    </td>
                    <td className="py-4 px-4 text-right text-slate-400 hidden lg:table-cell text-sm tabular-nums">
                      {(coin.total_volume / 1e6).toFixed(2)}M
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-5 w-20 ml-auto">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke={(coin.price_change_percentage_24h || 0) >= 0 ? "#10b981" : "#f43f5e"}
                            strokeWidth="1.5"
                            points={(() => {
                              const arr = coin.sparkline_in_7d?.price;
                              if (!arr || arr.length < 2) return '';
                              const min = Math.min(...arr);
                              const max = Math.max(...arr);
                              const range = max - min;
                              return arr.map((p, i) => {
                                const x = (i / (arr.length - 1)) * 100;
                                const y = range === 0 ? 20 : 40 - ((p - min) / range) * 40;
                                return `${x},${y}`;
                              }).join(' ');
                            })()}
                          />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
