import React, { useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, Bell, TrendingUp, Menu, X, BarChart3, Search, Terminal, Sun, Moon, Newspaper, Radar } from 'lucide-react';
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const { setCoins, setLoading, coins, alerts, searchQuery, setSearchQuery } = useCryptoStore();
  const { addToast } = useToastStore();
  const location = useLocation();

  // Handle Search Result Selection
  const navigate = useNavigate();
  const handleSelectSearchResult = (coinId: string) => {
    setSearchQuery('');
    setIsMobileSearchOpen(false);
    navigate(`/coin/${coinId}`);
  };

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
    { to: '/news', icon: Newspaper, label: 'News' },
    { to: '/whales', icon: Radar, label: 'Whale Alerts' },
    { to: '/alerts', icon: Bell, label: 'Price Alerts' },
  ];
  const filteredSearch = searchQuery.trim() === '' ? [] : coins.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="min-h-screen bg-black text-slate-300 font-mono selection:bg-slate-800 pt-8">
      <NewsTicker />
      {/* Global Header */}
      <div className="flex items-center justify-between flex-wrap p-2 sm:p-4 border-b border-slate-800 bg-black sticky top-8 z-50 gap-2 sm:gap-4">
        <Link to="/" className="font-bold text-base sm:text-lg tracking-widest text-slate-100 uppercase shrink-0 hover:text-amber-500 transition-colors">
          CRYPTOPULSE
        </Link>
        {/* Desktop Search / Mobile Toggle */}
        <div className={clsx("flex items-center gap-1 sm:gap-3 flex-1 justify-end", isMobileSearchOpen ? "hidden" : "flex")}>
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="SEARCH TICKER..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-black border border-slate-700 text-white pl-9 pr-4 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-700 uppercase"
            />
            {/* Desktop Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 max-h-64 overflow-y-auto z-50 shadow-2xl">
                {filteredSearch.length > 0 ? (
                  filteredSearch.map(coin => (
                    <button
                      key={coin.id}
                      onClick={() => handleSelectSearchResult(coin.id)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-800 last:border-0"
                    >
                      {coin.image && <img src={coin.image} alt={coin.name} className="w-5 h-5 object-contain" />}
                      <span className="font-bold text-slate-200">{coin.symbol.toUpperCase()}</span>
                      <span className="text-slate-500 text-xs truncate ml-auto">{coin.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-500">NO RESULTS FOUND</div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="p-2 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors lg:hidden text-amber-500"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

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
            className="flex items-center gap-2 px-2 sm:px-4 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-500 text-xs font-bold font-mono uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Run Market Analysis"
          >
            {analyzing ? (
              <span className="animate-pulse flex items-center gap-2"><Terminal className="w-4 h-4" /><span className="hidden sm:inline">PROCESSING...</span></span>
            ) : (
              <>
                <Terminal className="w-4 h-4 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Run Analysis</span>
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

        {/* Mobile Search Overlay */}
        {isMobileSearchOpen && (
          <div className="flex-1 flex items-center gap-2 lg:hidden w-full absolute inset-0 bg-black px-2 z-50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                autoFocus
                placeholder="SEARCH TICKER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500 text-white pl-9 pr-4 py-2 text-sm font-mono focus:outline-none transition-colors placeholder:text-slate-500 uppercase"
              />
              {/* Mobile Dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 max-h-64 overflow-y-auto z-50 shadow-2xl">
                  {filteredSearch.length > 0 ? (
                    filteredSearch.map(coin => (
                      <button
                        key={coin.id}
                        onClick={() => handleSelectSearchResult(coin.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-800 last:border-0"
                      >
                        {coin.image && <img src={coin.image} alt={coin.name} className="w-5 h-5 object-contain" />}
                        <span className="font-bold text-slate-200">{coin.symbol.toUpperCase()}</span>
                        <span className="text-slate-500 text-xs truncate ml-auto">{coin.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-500">NO RESULTS FOUND</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-2 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
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
