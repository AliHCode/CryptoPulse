import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: null | {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface PortfolioItem {
  coinId: string;
  amount: number;
  buyPrice: number; // Average buy price
}

export interface PriceAlert {
  id: string;
  coinId: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  type: 'price' | 'percent';
  percentChange?: number;
  referencePrice?: number;
}

interface CryptoState {
  coins: Coin[];
  portfolio: PortfolioItem[];
  alerts: PriceAlert[];
  watchlist: string[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  setCoins: (coins: Coin[]) => void;
  updateCoinPrices: (prices: Record<string, number>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;

  addToPortfolio: (item: PortfolioItem) => void;
  removeFromPortfolio: (coinId: string) => void;
  updatePortfolioItem: (coinId: string, amount: number) => void;

  addAlert: (alert: PriceAlert) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;

  addToWatchlist: (coinId: string) => void;
  removeFromWatchlist: (coinId: string) => void;
}

export const useCryptoStore = create<CryptoState>()(
  persist(
    (set) => ({
      coins: [],
      portfolio: [],
      alerts: [],
      watchlist: [],
      searchQuery: '',
      isLoading: false,
      error: null,

      setCoins: (coins) => set({ coins }),
      updateCoinPrices: (prices) => set((state) => ({
        coins: state.coins.map((coin) => {
          if (prices[coin.id]) {
            const oldPrice = coin.current_price;
            const newPrice = prices[coin.id];
            // Only update if it actually changed
            if (oldPrice === newPrice) return coin;

            // Re-calculate 24h percentage changes based on the new price.
            // (current_price - price_24h_ago) / price_24h_ago
            // We can approximate price_24h_ago by reversing the current percentage:
            // price_24h_ago = current_price / (1 + (percentage / 100))
            const price24hAgo = oldPrice / (1 + (coin.price_change_percentage_24h / 100));
            const newPercentage = ((newPrice - price24hAgo) / price24hAgo) * 100;

            return {
              ...coin,
              current_price: newPrice,
              price_change_percentage_24h: newPercentage,
              // We could also add a temporary "flash" directional coloring property if we wanted here,
              // but we can track it in the UI instead using a custom hook. 
            };
          }
          return coin;
        })
      })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      addToPortfolio: (item) =>
        set((state) => {
          const existing = state.portfolio.find((p) => p.coinId === item.coinId);
          if (existing) {
            // Update existing holding (simple average cost basis logic could go here, but keeping it simple for now)
            return {
              portfolio: state.portfolio.map((p) =>
                p.coinId === item.coinId
                  ? { ...p, amount: p.amount + item.amount }
                  : p
              ),
            };
          }
          return { portfolio: [...state.portfolio, item] };
        }),

      removeFromPortfolio: (coinId) =>
        set((state) => ({
          portfolio: state.portfolio.filter((p) => p.coinId !== coinId),
        })),

      updatePortfolioItem: (coinId, amount) =>
        set((state) => ({
          portfolio: state.portfolio.map((p) =>
            p.coinId === coinId ? { ...p, amount } : p
          ),
        })),

      addAlert: (alert) =>
        set((state) => ({ alerts: [...state.alerts, alert] })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a
          ),
        })),

      addToWatchlist: (coinId) =>
        set((state) => ({
          watchlist: state.watchlist.includes(coinId) ? state.watchlist : [...state.watchlist, coinId],
        })),

      removeFromWatchlist: (coinId) =>
        set((state) => ({
          watchlist: state.watchlist.filter((id) => id !== coinId),
        })),
    }),
    {
      name: 'crypto-storage',
      partialize: (state) => ({
        portfolio: state.portfolio,
        alerts: state.alerts,
        watchlist: state.watchlist,
      }),
    }
  )
);
