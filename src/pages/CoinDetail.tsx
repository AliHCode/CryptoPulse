import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCryptoStore } from '../store/cryptoStore';
import { fetchCoinHistory } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ArrowLeft, Bell, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import OrderBook from '../components/OrderBook';
import PriceFlash from '../components/PriceFlash';

export default function CoinDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { coins, addToPortfolio, addAlert } = useCryptoStore();
  const coin = coins.find(c => c.id === id);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(7);
  const [history, setHistory] = useState<any[]>([]);

  // Modal States
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [posAmount, setPosAmount] = useState('');
  const [posPrice, setPosPrice] = useState(coin?.current_price.toString() || '');

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState(coin ? (coin.current_price * 1.05).toString() : '');
  const [alertCond, setAlertCond] = useState<'above' | 'below'>('above');
  const [alertType, setAlertType] = useState<'price' | 'percent'>('price');
  const [alertPercent, setAlertPercent] = useState('5');

  useEffect(() => {
    if (!id) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await fetchCoinHistory(id, timeframe, coin?.symbol);
        setHistory(data.map((item: any[]) => ({
          time: item[0],
          price: item[1]
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [id, timeframe]);

  if (!coin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 font-mono">
        <p>ASSET_NOT_FOUND_OR_LOADING</p>
        <button onClick={() => navigate('/')} className="mt-4 text-amber-500 hover:underline">
          RETURN_TO_DASHBOARD
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6 font-mono">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-500 hover:text-amber-500 transition-colors text-xs uppercase"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Index
      </button>

      {/* Header Section */}
      <div className="border border-slate-800 bg-black p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-4">
              {coin.image && (
                <img src={coin.image} alt={coin.name} className="w-10 h-10 object-contain" />
              )}
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase">{coin.name}</h1>
                <span className="text-xl text-amber-500">{coin.symbol.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-bold tracking-wider">
              <span>RANK: #{coin.market_cap_rank}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setPosPrice(coin.current_price.toString());
                setPosAmount('');
                setShowPositionModal(true);
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-200 hover:text-amber-500 text-xs font-bold uppercase transition-all"
            >
              + Add Position
            </button>
            <button
              onClick={() => {
                setAlertPrice((coin.current_price * 1.05).toFixed(2));
                setAlertCond('above');
                setShowAlertModal(true);
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-200 hover:text-amber-500 text-xs font-bold uppercase transition-all"
            >
              + Set Alert
            </button>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-8 pt-8 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Price (USD)</p>
            <div className="text-2xl font-bold text-white">
              <PriceFlash value={coin.current_price} formatter={formatCurrency} />
            </div>
            <div className={clsx(
              "text-xs mt-1 flex items-center gap-1",
              coin.price_change_percentage_24h >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {coin.price_change_percentage_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <PriceFlash value={Math.abs(coin.price_change_percentage_24h)} formatter={(v) => `${v.toFixed(2)}%`} />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Market Cap</p>
            <div className="text-xl font-bold text-slate-200">${(coin.market_cap / 1e9).toFixed(2)}B</div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Volume (24h)</p>
            <div className="text-xl font-bold text-slate-200">${(coin.total_volume / 1e6).toFixed(2)}M</div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">All Time High</p>
            <div className="text-xl font-bold text-slate-200">{formatCurrency(coin.ath)}</div>
            <p className="text-[10px] text-slate-600 mt-1">
              {new Date(coin.ath_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-3 border border-slate-800 bg-black p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-amber-500 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Price Action
            </h2>
            <div className="flex border border-slate-800">
              {[1, 7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTimeframe(d)}
                  className={clsx(
                    "px-3 py-1 text-xs font-bold transition-all border-r border-slate-800 last:border-r-0",
                    timeframe === d ? "bg-amber-500 text-black" : "text-slate-500 hover:text-white hover:bg-slate-900"
                  )}
                >
                  {d === 1 ? '24H' : `${d}D`}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full relative">
            {loading ? (
              <div className="absolute inset-0 z-10 flex flex-col gap-4 p-4 animate-pulse">
                {/* Chart Skeleton */}
                <div className="w-32 h-6 bg-slate-800 rounded" />
                <div className="flex-1 w-full bg-slate-900/50 border border-slate-800 rounded flex items-end p-4 gap-2">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="flex-1 bg-slate-800 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
                  ))}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis
                    dataKey="time"
                    domain={['dataMin', 'dataMax']}
                    type="number"
                    tickFormatter={(time) => format(time, timeframe === 1 ? 'HH:mm' : 'MMM dd')}
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', borderColor: '#334155', borderRadius: '0' }}
                    itemStyle={{ color: '#f59e0b' }}
                    labelFormatter={(label) => format(label, 'MMM dd, yyyy HH:mm')}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#f59e0b', stroke: '#000' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Book Section */}
        <div className="lg:col-span-1 h-[500px]">
          <OrderBook symbol={coin.symbol} coinId={coin.id} />
        </div>
      </div>

      {/* Modals */}
      {showPositionModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-black border border-slate-800 p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-amber-500 uppercase flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" />
              Initialize Position
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase mb-1">Asset Amount</label>
                <input
                  type="number"
                  value={posAmount}
                  onChange={e => setPosAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase mb-1">Entry Price (USD)</label>
                <input
                  type="number"
                  value={posPrice}
                  onChange={e => setPosPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowPositionModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase">Cancel</button>
                <button
                  onClick={() => {
                    const amt = parseFloat(posAmount);
                    const prc = parseFloat(posPrice);
                    if (!isNaN(amt) && !isNaN(prc) && amt > 0) {
                      addToPortfolio({ coinId: coin.id, amount: amt, buyPrice: prc });
                      setShowPositionModal(false);
                      setPosAmount('');
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black transition-colors text-xs font-bold uppercase"
                >
                  Confirm Execution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-black border border-slate-800 p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-amber-500 uppercase flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4" />
              Configure System Alert
            </h3>
            <div className="space-y-4">
              {/* Alert Type Switcher */}
              <div className="flex border border-slate-700">
                <button
                  onClick={() => setAlertType('price')}
                  className={clsx(
                    "flex-1 px-3 py-2 text-xs font-bold uppercase transition-colors",
                    alertType === 'price' ? "bg-amber-500/20 text-amber-500 border-r border-slate-700" : "text-slate-500 hover:text-slate-300 border-r border-slate-700"
                  )}
                >Price Target</button>
                <button
                  onClick={() => setAlertType('percent')}
                  className={clsx(
                    "flex-1 px-3 py-2 text-xs font-bold uppercase transition-colors",
                    alertType === 'percent' ? "bg-amber-500/20 text-amber-500" : "text-slate-500 hover:text-slate-300"
                  )}
                >% Change</button>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase mb-1">Trigger Condition</label>
                <select
                  value={alertCond}
                  onChange={(e: any) => setAlertCond(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:outline-none focus:border-amber-500 appearance-none uppercase"
                >
                  <option value="above">{alertType === 'price' ? 'Price Rises Above' : 'Increases By'}</option>
                  <option value="below">{alertType === 'price' ? 'Price Drops Below' : 'Decreases By'}</option>
                </select>
              </div>

              {alertType === 'price' ? (
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">Target Price (USD)</label>
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={e => setAlertPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    value={alertPercent}
                    onChange={e => setAlertPercent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="5"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAlertModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase">Cancel</button>
                <button
                  onClick={() => {
                    if (alertType === 'price') {
                      const prc = parseFloat(alertPrice);
                      if (!isNaN(prc) && prc > 0) {
                        addAlert({ id: crypto.randomUUID(), coinId: coin.id, targetPrice: prc, condition: alertCond, isActive: true, type: 'price' });
                        setShowAlertModal(false);
                      }
                    } else {
                      const pct = parseFloat(alertPercent);
                      if (!isNaN(pct) && pct > 0 && coin) {
                        addAlert({
                          id: crypto.randomUUID(),
                          coinId: coin.id,
                          targetPrice: 0,
                          condition: alertCond,
                          isActive: true,
                          type: 'percent',
                          percentChange: pct,
                          referencePrice: coin.current_price,
                        });
                        setShowAlertModal(false);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black transition-colors text-xs font-bold uppercase"
                >
                  Deploy Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
