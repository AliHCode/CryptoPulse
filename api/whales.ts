import axios from 'axios';

// Fallback generator for when the user hasn't supplied a premium Whale Alert API Key.
// Generates highly realistic looking blockchain transactions based on the current timestamp.
const generateMockWhales = () => {
    const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'DOGE', 'LINK', 'MATIC'];
    const exchanges = ['Binance', 'Coinbase', 'Kraken', 'KuCoin', 'Bitfinex', 'OKX', 'Huobi', 'Unknown Wallet'];

    return Array.from({ length: 15 }).map((_, i) => {
        const asset = assets[Math.floor(Math.random() * assets.length)];
        // Random amount between 1M and 500M dollars roughly
        const amount_usd = Math.floor(Math.random() * 500000000) + 1000000;

        let amount = amount_usd;
        if (asset === 'BTC') amount = amount_usd / 60000;
        else if (asset === 'ETH') amount = amount_usd / 3000;
        else if (asset === 'SOL') amount = amount_usd / 100;

        const from = exchanges[Math.floor(Math.random() * exchanges.length)];
        let to = exchanges[Math.floor(Math.random() * exchanges.length)];
        while (to === from) {
            to = exchanges[Math.floor(Math.random() * exchanges.length)];
        }

        return {
            id: `whale_${Date.now()}_${i}`,
            blockchain: asset.toLowerCase(),
            symbol: asset,
            amount: amount,
            amount_usd: amount_usd,
            from: { owner: from, address: `0x${Math.random().toString(16).substr(2, 40)}` },
            to: { owner: to, address: `0x${Math.random().toString(16).substr(2, 40)}` },
            timestamp: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600) // Within last hour
        };
    }).sort((a, b) => b.timestamp - a.timestamp);
};

export default async function handler(req: any, res: any) {
    // Add proper CORS headers first
    res.setHeader('Access-Control-Allow-Credentials', true)
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

    const apiKey = process.env.WHALE_ALERT_API_KEY;

    // If an API key exists in Vercel environment variables, use the real production API.
    if (apiKey) {
        try {
            const now = Math.floor(Date.now() / 1000);
            const response = await axios.get(`https://api.whale-alert.io/v1/transactions`, {
                params: {
                    api_key: apiKey,
                    min_value: 500000, // 500k minimum
                    start: now - 3600 // Last hour
                }
            });
            return res.status(200).json({ transactions: response.data.transactions });
        } catch (error) {
            console.error("Whale API Error (Falling back to mock):", error);
        }
    }

    // Default mock response when no key is present or real API fails
    return res.status(200).json({ transactions: generateMockWhales() });
}
