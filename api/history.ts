import axios from 'axios';

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { coinId, days } = req.query;

    if (!coinId || !days) {
        return res.status(400).json({ error: 'Missing coinId or days parameter' });
    }

    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
            params: {
                vs_currency: 'usd',
                days: days,
            },
        });

        // Add proper CORS headers
        res.setHeader('Access-Control-Allow-Credentials', true)
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("CoinGecko History Proxy Error:", error);
        return res.status(500).json({ error: 'Failed to fetch coin history' });
    }
}
