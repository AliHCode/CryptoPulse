import React, { useState } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trash2, Edit2, TrendingUp, TrendingDown, Wallet, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { analyzePortfolio } from '../services/gemini';
import { useToastStore } from '../components/Toast';
import { ethers } from 'ethers';
import CryptoConverter from '../components/CryptoConverter';

export default function Portfolio() {
  const { portfolio, coins, removeFromPortfolio, updatePortfolioItem } = useCryptoStore();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { addToast } = useToastStore();

  const handleConnectWallet = async () => {
    if (!(window as any).ethereum) {
      addToast({ title: 'WEB3 ERROR', message: 'METAMASK NOT DETECTED', type: 'error' });
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        const balance = await provider.getBalance(accounts[0]);
        const ethBalance = parseFloat(ethers.formatEther(balance));

        const ethCoin = coins.find(c => c.id === 'ethereum');
        if (ethCoin) {
          // Add or overwrite the Ethereum position with the live on-chain balance
          // Assuming a cost basis of current price for simplicity, or 0 if preferred
          // store updatePortfolioItem only takes amount, buyPrice is kept or updated?
          // Since updatePortfolioItem expects just amount in Portfolio modal usually, wait:
          // The updatePortfolioItem function in cryptoStore takes (id: string, amount: number) 
          // but if it doesn't exist it sets buyPrice = current price.
          updatePortfolioItem('ethereum', ethBalance);
          addToast({ title: 'WALLET CONNECTED', message: `SYNCED ${ethBalance.toFixed(4)} ETH`, type: 'success' });
        }
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      addToast({ title: 'CONNECTION FAILED', message: 'USER REJECTED REQUEST OR ERROR', type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  // Calculate portfolio stats with P/L
  const portfolioData = portfolio.map(item => {
    const coin = coins.find(c => c.id === item.coinId);
    if (!coin) return null;
    const costBasis = item.amount * item.buyPrice;
    const currentValue = item.amount * coin.current_price;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
    return {
      ...item,
      name: coin.name,
      symbol: coin.symbol,
      image: coin.image,
      currentPrice: coin.current_price,
      costBasis,
      value: currentValue,
      pnl,
      pnlPercent,
      allocation: 0 // calculated below
    };
  }).filter(Boolean) as any[];

  const totalValue = portfolioData.reduce((acc, item) => acc + item.value, 0);
  const totalCostBasis = portfolioData.reduce((acc, item) => acc + item.costBasis, 0);
  const totalPnl = totalValue - totalCostBasis;
  const totalPnlPercent = totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0;

  // Add allocation
  portfolioData.forEach(item => {
    item.allocation = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
  });

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzePortfolio(portfolio, coins);
      setAiAnalysis(result);
    } catch (e) {
      console.error(e);
      addToast({
        title: 'ANALYSIS FAILED',
        message: 'API CONNECTION ERROR',
        type: 'error'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveEdit = (coinId: string) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount >= 0) {
      updatePortfolioItem(coinId, amount);
    }
    setIsEditing(null);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center font-mono">
        <div className="w-16 h-16 border border-slate-800 flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 uppercase">Portfolio Empty</h2>
        <p className="text-slate-500 max-w-md mb-8 text-xs">NO ASSETS DETECTED. INITIATE POSITIONS VIA MARKET DATA.</p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a href="/" className="px-6 py-2 bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-500 font-bold uppercase text-xs transition-colors">
            Initialize Manually
          </a>
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="px-6 py-2 bg-indigo-600/20 border border-indigo-500/50 hover:border-indigo-500 text-indigo-400 font-bold uppercase text-xs transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isConnecting ? <span className="animate-pulse">CONNECTING...</span> : 'CONNECT WEB3 WALLET'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            Portfolio Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">ASSET ALLOCATION & PERFORMANCE METRICS</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-900/40 border border-indigo-700 hover:border-indigo-500 text-indigo-400 text-xs font-bold uppercase transition-all disabled:opacity-50"
          >
            {isConnecting ? <span className="animate-pulse">CONNECTING...</span> : 'Connect Web3'}
          </button>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-500 text-xs font-bold uppercase transition-all disabled:opacity-50"
          >
            {analyzing ? <span className="animate-pulse">PROCESSING...</span> : <Terminal className="w-3 h-3" />}
            Run Audit
          </button>
        </div>
      </div>

      {/* AI Analysis Terminal */}
      {aiAnalysis && (
        <div className="bg-black border border-amber-500/30 p-4 font-mono text-sm relative">
          <div className="absolute top-0 left-0 px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase border-b border-r border-amber-500/30">
            Gemini Intelligence
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-6">
            <div className="border-r border-slate-800 pr-6">
              <p className="text-xs text-slate-500 uppercase mb-1">Risk Profile</p>
              <p className={clsx(
                "text-xl font-bold uppercase",
                aiAnalysis.riskLevel === 'High' ? 'text-rose-500' :
                  aiAnalysis.riskLevel === 'Low' ? 'text-emerald-500' : 'text-amber-500'
              )}>{aiAnalysis.riskLevel}</p>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Strategic Advice</p>
                <p className="text-slate-300 text-xs leading-relaxed border-l-2 border-amber-500 pl-3">{aiAnalysis.advice}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Diversification</p>
                <p className="text-slate-300 text-xs leading-relaxed border-l-2 border-blue-500 pl-3">{aiAnalysis.diversification}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Cost Basis</p>
          <div className="text-lg font-bold text-slate-300 tabular-nums">{formatCurrency(totalCostBasis)}</div>
        </div>
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Current Value</p>
          <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(totalValue)}</div>
        </div>
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total P/L</p>
          <div className={clsx("text-lg font-bold tabular-nums", totalPnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </div>
        </div>
        <div className="bg-black border border-slate-800 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Performance</p>
          <div className={clsx("text-lg font-bold tabular-nums flex items-center gap-2", totalPnlPercent >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {totalPnlPercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Col: Stats & List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Holdings List */}
          <div className="border border-slate-800 bg-black">
            <div className="p-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Asset Breakdown</h3>
              <span className="text-[10px] text-slate-600 pr-2">{portfolioData.length} POSITIONS</span>
            </div>
            <div className="divide-y divide-slate-800">
              {portfolioData.map((item) => (
                <div key={item.coinId} className="p-3 flex items-center justify-between hover:bg-slate-900 transition-colors group">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center text-xs font-bold text-amber-500 border border-slate-800 bg-slate-900">
                        {item.symbol[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-white text-sm uppercase">{item.name}</div>
                      <div className="text-xs text-slate-500 uppercase">{item.amount} {item.symbol} @ {formatCurrency(item.buyPrice)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-slate-600 uppercase">Cost / Value</div>
                      <div className="text-xs text-slate-400 tabular-nums">{formatCurrency(item.costBasis)} → {formatCurrency(item.value)}</div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <div className={clsx("font-bold text-sm tabular-nums", item.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
                      </div>
                      <div className={clsx("text-xs tabular-nums", item.pnlPercent >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditing === item.coinId ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-20 bg-black border border-amber-500 px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(item.coinId)} className="text-emerald-500 hover:text-emerald-400 text-xs font-bold uppercase">SAVE</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setIsEditing(item.coinId);
                            setEditAmount(item.amount.toString());
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromPortfolio(item.coinId)}
                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Chart */}
        <div className="space-y-6">
          <div className="bg-black border border-slate-800 p-6 h-96">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-6">Allocation Distribution</h3>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {portfolioData.map((entry, index) => (
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
                <div key={item.coinId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-slate-400">{item.allocation.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Converter Widget */}
          <div className="h-[350px]">
            <CryptoConverter />
          </div>
        </div>
      </div>
    </div>
  );
}
