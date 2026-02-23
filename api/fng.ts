import axios from 'axios';

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

    try {
        const response = await axios.get('https://api.alternative.me/fng/?limit=1');
        return res.status(200).json(response.data);
    } catch (error) {
        console.error("Fear & Greed Proxy Error:", error);
        return res.status(500).json({ error: 'Failed to fetch Fear & Greed index' });
    }
}
