import axios from 'axios';
import { kv } from '@vercel/kv';

export default async function handler(req: any, res: any) {
    console.log("CRON JOB: Starting CoinGecko scrape...");

    // Verify it's a legitimate cron invocation for security (optional but good practice)
    // Vercel sends an authorization header for crons
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
        console.warn("Unauthorized scrape attempt");
    }

    try {
        // Fetch 250 coins from CoinGecko (Maximum allowed per page on free tier)
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 250,
                page: 1,
                sparkline: true,
                price_change_percentage: '24h'
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        const latestData = response.data;
        const cacheTimestamp = Date.now();

        try {
            // Save the result directly into Vercel KV Redis
            await kv.set('coingecko_global_market', {
                lastUpdated: cacheTimestamp,
                coins: latestData
            });
            console.log(`CRON JOB: Successfully scraped and cached ${latestData.length} coins at ${new Date(cacheTimestamp).toISOString()}`);
            return res.status(200).json({ success: true, count: latestData.length, savedAt: cacheTimestamp });
        } catch (kvError) {
            console.error("CRON JOB FAILED: Could not write to Vercel KV Database (Check your KV_REST_API variables)", kvError);
            return res.status(500).json({ error: 'Failed to write to Vercel KV' });
        }

    } catch (error) {
        console.error("CRON JOB FAILED: CoinGecko API Error", error);
        return res.status(500).json({ error: 'Failed to scrape and cache data' });
    }
}
