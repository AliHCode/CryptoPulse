import axios from 'axios';
import { kv } from '@vercel/kv';

export default async function handler(req: any, res: any) {
    // Add proper CORS headers so the frontend can read the response ALWAYS
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Set Edge Caching headers so Vercel caches this response at the CDN edge for 60 seconds.
    // This makes the API effectively instantly fast (<30ms) for end users.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    try {
        // Attempt to read the entire 250-coin payload directly from our Vercel KV Redis database
        let cachedData = null;
        try {
            if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
                cachedData = await kv.get('coingecko_global_market');
            } else {
                console.warn("Vercel KV Env variables missing. Skipping cache read.");
            }
        } catch (kvError) {
            console.warn("Vercel KV Read Error (skipping cache):", kvError);
        }

        if (cachedData && (cachedData as any).coins) {
            console.log("CACHE HIT: Serving 250 coins from Vercel KV Redis");
            return res.status(200).json((cachedData as any).coins);
        }

        console.warn("CACHE MISS: Vercel KV is empty or unavailable. Falling back to direct CoinGecko fetch.");

        // Fallback for Local Development (before the Cron Job has ever run)
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 250, // Keep it at 250 so local dev mirrors Production layout expectations
                page: 1,
                sparkline: true,
                price_change_percentage: '24h',
            },
        });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("Vercel KV / CoinGecko Proxy Error:", error);
        return res.status(500).json({ error: 'Failed to fetch coin data' });
    }
}
