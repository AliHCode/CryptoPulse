import axios from 'axios';

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');

        // Add proper CORS headers
        res.setHeader('Access-Control-Allow-Credentials', true)
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("CryptoCompare News Proxy Error:", error);
        return res.status(500).json({ error: 'Failed to fetch news' });
    }
}
