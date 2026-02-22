import axios from 'axios';
import { Coin } from '../store/cryptoStore';
import { getBinanceSymbol } from '../utils/symbolMap';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Simple cache to prevent hitting rate limits too hard in dev
let cache: { data: Coin[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

export const fetchCoins = async (): Promise<Coin[]> => {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: true,
        price_change_percentage: '24h,7d',
      },
    });

    cache = { data: response.data, timestamp: Date.now() };
    return response.data;
  } catch (error) {
    console.error('Error fetching coins:', error);
    throw error;
  }
};


export const fetchCoinHistory = async (coinId: string, days: number = 7, coinSymbol?: string) => {
  // Strategy: Try Binance first (unlimited, fast), fall back to CoinGecko if the pair doesn't exist
  try {
    const symbol = getBinanceSymbol(coinId, coinSymbol);

    // Determine interval based on requested days
    let interval = '1d';
    if (days === 1) interval = '15m';
    else if (days === 7) interval = '2h';
    else if (days === 30) interval = '4h';
    else if (days === 90) interval = '12h';

    const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: interval,
        limit: 500
      },
    });

    if (response.data && response.data.length > 0) {
      return response.data.map((kline: any[]) => [kline[0], parseFloat(kline[4])]);
    }
    // If Binance returns empty, fall through to CoinGecko
    throw new Error('Empty Binance response');
  } catch (_binanceError) {
    // Binance failed (pair doesn't exist) — fall back to CoinGecko
    console.warn(`Binance unavailable for ${coinId}, falling back to CoinGecko`);
    try {
      const response = await axios.get(`${COINGECKO_API}/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
        },
      });
      return response.data.prices; // Array of [timestamp, price]
    } catch (geckoError) {
      console.error(`Both Binance and CoinGecko failed for ${coinId}:`, geckoError);
      return [];
    }
  }
};

export const fetchCoinOHLC = async (coinId: string, days: number = 7) => {
  try {
    const response = await axios.get(`${COINGECKO_API}/coins/${coinId}/ohlc`, {
      params: {
        vs_currency: 'usd',
        days: days,
      },
    });
    // Returns array of [timestamp, open, high, low, close]
    // The timestamp is in milliseconds
    return response.data;
  } catch (error) {
    console.error('Error fetching coin OHLC:', error);
    throw error;
  }
};

export const fetchFearAndGreed = async () => {
  try {
    const response = await axios.get('https://api.alternative.me/fng/?limit=1');
    if (response.data && response.data.data && response.data.data.length > 0) {
      return {
        value: parseInt(response.data.data[0].value),
        classification: response.data.data[0].value_classification,
        timestamp: response.data.data[0].timestamp
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Fear & Greed index:', error);
    return null;
  }
};
