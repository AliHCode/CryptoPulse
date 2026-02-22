import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, Bell, TrendingUp, Menu, X, BarChart3, Search, Terminal, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { useCryptoStore } from '../store/cryptoStore';
import { fetchCoins } from '../services/api';
import { initializeWebSocket, closeWebSocket } from '../services/websocket';
import { ToastContainer, useToastStore } from './Toast';
import NewsTicker from './NewsTicker';
import { analyzeMarket } from '../services/gemini';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const { setCoins, setLoading, coins, alerts, searchQuery, setSearchQuery } = useCryptoStore();
  const { addToast } = useToastStore();
  const location = useLocation();

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadCoins = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await fetchCoins();
        setCoins(data);

        // Alerts are now processed efficiently in the background via alertWorker.ts
        // whenever the Binance WebSocket streams new prices.

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    // Initial load - show loading if we don't have data
    loadCoins(coins.length === 0);

    // Poll every 60s - silent backup update
    const interval = setInterval(() => loadCoins(false), 60000);

    // Start WebSocket
    initializeWebSocket();

    return () => {
      clearInterval(interval);
      closeWebSocket();
    };
  }, [setCoins, setLoading, addToast]); // coins.length is intentionally omitted

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/portfolio', icon: PieChart, label: 'Portfolio' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
  ];

  return (
    <div className="min-h-screen bg-black text-slate-300 font-mono selection:bg-slate-800 pt-8">
      <NewsTicker />
      {/* Global Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-black sticky top-8 z-50 gap-4">
        <div className="font-bold text-lg tracking-widest text-slate-100 uppercase shrink-0">
          CRYPTOPULSE
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="SEARCH TICKER..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 bg-black border border-slate-700 text-white pl-9 pr-4 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-700 uppercase"
            />
          </div>
          <button
            onClick={async () => {
              setAnalyzing(true);
              try {
                const result = await analyzeMarket(coins);
                (window as any).__aiAnalysis = result;
                window.dispatchEvent(new Event('ai-analysis-ready'));
              } catch (e) {
                console.error(e);
                addToast({ title: 'ANALYSIS FAILED', message: 'API CONNECTION ERROR', type: 'error' });
              } finally {
                setAnalyzing(false);
              }
            }}
            disabled={analyzing || coins.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-500 text-xs font-bold font-mono uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {analyzing ? (
              <span className="animate-pulse">PROCESSING...</span>
            ) : (
              <>
                <Terminal className="w-3 h-3" />
                Run Analysis
              </>
            )}
          </button>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors text-amber-500"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={clsx(
            "fixed bottom-0 right-0 z-40 w-64 bg-black border-l border-slate-800 transform transition-transform duration-200 ease-in-out flex flex-col",
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ top: 'calc(2rem + 3.25rem + 1rem)' }}
        >

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-4 py-3 transition-colors font-bold text-xs uppercase border-r-4",
                    isActive
                      ? "bg-slate-900 text-amber-500 border-amber-500"
                      : "text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-900 border border-slate-800 p-4">
              <p className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest">System Status</p>
              <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase">
                <div className="w-2 h-2 bg-emerald-500 animate-pulse" />
                Live Data Stream
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-black">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>

        {/* Overlay for sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/80 z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
