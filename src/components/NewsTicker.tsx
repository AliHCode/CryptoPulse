import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function NewsTicker() {
    const [headlines, setHeadlines] = useState<string[]>([
        "ASSET MATRIX: Global cryptocurrency market cap stands at $2.14 Trillion.",
        "BULL ALERT: Institutional flows shift positively towards major large-cap assets.",
        "SEC REGULATION: New compliance frameworks proposed for decentralized exchanges.",
        "NETWORK UPGRADE: Major Layer-1 protocols announce concurrent scalability hard-forks."
    ]);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // Fetch live news from our Vercel Serverless Function proxy
                // Fallback to direct CryptoCompare API if running in local dev outside Vercel
                let response = await axios.get('/api/news').catch(async () => {
                    return await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
                });

                if (typeof response.data === 'string') {
                    console.warn("Vite caught News proxy request. Reverting to direct api call.");
                    response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
                }

                if (response.data && response.data.Data && response.data.Data.length > 0) {
                    const fetchedHeadlines = response.data.Data.slice(0, 10).map((item: any) => item.title.toUpperCase());
                    setHeadlines(fetchedHeadlines);
                }
            } catch (error) {
                console.error("Failed to load live news, using fallback local headlines:", error);
            }
        };

        fetchNews();
        // Refresh news every 5 minutes
        const interval = setInterval(fetchNews, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 h-8 bg-amber-500 text-black font-mono text-xs font-bold uppercase overflow-hidden z-[60] flex items-center border-b-2 border-amber-600">
            <div className="flex whitespace-nowrap animate-marquee w-max">
                {/* We double the headlines to create a seamless loop effect */}
                {[...headlines, ...headlines].map((headline, index) => (
                    <div key={index} className="flex items-center">
                        <span className="mx-8">&bull;</span>
                        <span>{headline}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
