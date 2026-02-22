import React from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import { Bell, Trash2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx } from 'clsx';

export default function Alerts() {
  const { alerts, coins, removeAlert, toggleAlert } = useCryptoStore();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6 font-mono">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          Alert Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">REAL-TIME PRICE MONITORING SYSTEM</p>
      </div>

      <div className="grid gap-0 border border-slate-800 bg-black">
        {alerts.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-8 h-8 text-slate-700 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-500 uppercase">No Active Monitors</h3>
            <p className="text-xs text-slate-600 mt-1">INITIATE ALERTS FROM ASSET DETAIL VIEW</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const coin = coins.find(c => c.id === alert.coinId);
            if (!coin) return null;

            return (
              <div key={alert.id} className="p-3 flex items-center justify-between border-b border-slate-800 last:border-b-0 hover:bg-slate-900 transition-colors group">
                <div className="flex items-center gap-4">
                  {coin.image ? (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <img src={coin.image} alt={coin.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center text-xs font-bold text-amber-500 border border-slate-800 bg-slate-900">
                      {coin.symbol[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white text-sm uppercase">{coin.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>CURRENT: <span className="text-slate-300">{formatCurrency(coin.current_price)}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-600 uppercase font-bold mb-1">Trigger Condition</div>
                    <div className="flex items-center gap-2 text-sm text-white font-bold">
                      {alert.condition === 'above' ? (
                        <span className="text-emerald-500 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> ABOVE</span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> BELOW</span>
                      )}
                      {formatCurrency(alert.targetPrice)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-l border-slate-800 pl-8">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className={clsx("transition-colors", alert.isActive ? "text-amber-500" : "text-slate-700")}
                    >
                      {alert.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
