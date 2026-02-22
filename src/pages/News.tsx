import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Newspaper, ExternalLink, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NewsArticle {
    id: string;
    published_on: number;
    title: string;
    url: string;
    imageurl: string;
    body: string;
    source_info: {
        name: string;
        img: string;
    };
}

export default function News() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                let response = await axios.get('/api/news').catch(async () => {
                    return await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
                });

                if (typeof response.data === 'string') {
                    console.warn("Vite caught News proxy request. Reverting to direct api call.");
                    response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
                }

                if (response.data && response.data.Data && response.data.Data.length > 0) {
                    setArticles(response.data.Data);
                }
            } catch (error) {
                console.error("Failed to load full news feed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    return (
        <div className="space-y-6 font-mono pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-amber-500" />
                        Global Market Intelligence
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">REAL-TIME CRYPTOCURRENCY NEWS AGGREGATION</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-700 text-amber-500 text-[10px] font-bold uppercase transition-all">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    LIVE FEED ACTIVE
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-600 text-xs font-mono animate-pulse">
                    <Activity className="w-8 h-8 mb-4 text-amber-500/50" />
                    ESTABLISHING CONNECTION TO NEWS ORACLES...
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {articles.map((article) => (
                        <a
                            key={article.id}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col border border-slate-800 bg-black hover:border-slate-600 group transition-all"
                        >
                            <div className="relative h-48 w-full bg-slate-900 overflow-hidden border-b border-slate-800">
                                {article.imageurl ? (
                                    <img
                                        src={article.imageurl}
                                        alt={article.title}
                                        className="w-full h-full object-cover transition-transform duration-500 grayscale group-hover:grayscale-0"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Newspaper className="w-8 h-8 text-slate-700" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm border border-slate-700 px-2 py-1 flex items-center gap-2">
                                    {article.source_info?.img && (
                                        <img src={article.source_info.img} alt={article.source_info.name} className="w-3 h-3 object-contain rounded-full" />
                                    )}
                                    <span className="text-[10px] font-bold text-slate-200 uppercase">{article.source_info?.name || 'UNKNOWN SOURCE'}</span>
                                </div>
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors">
                                    {article.title}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-1">
                                    {article.body}
                                </p>
                                <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-auto">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                                        {formatDistanceToNow(new Date(article.published_on * 1000), { addSuffix: true })}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-amber-500 uppercase font-bold transition-colors">
                                        Read Article <ExternalLink className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
