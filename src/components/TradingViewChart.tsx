import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { fetchCoinOHLC } from '../services/api';
import { RefreshCw } from 'lucide-react';

interface TradingViewChartProps {
    coinId: string;
    days: number;
}

export default function TradingViewChart({ coinId, days }: TradingViewChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b', // slate-500
                fontFamily: '"JetBrains Mono", monospace',
            },
            grid: {
                vertLines: { color: '#1e293b' }, // slate-800
                horzLines: { color: '#1e293b' },
            },
            crosshair: {
                mode: 1, // Normal crosshair mode
                vertLine: { color: '#64748b', style: 3 },
                horzLine: { color: '#64748b', style: 3 },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Add Candlestick Series
        // Provide TS any cast because v5 IChartApi signature is strict on extension types
        const candlestickSeries = (chart as any).addCandlestickSeries({
            upColor: '#10b981', // emerald-500
            downColor: '#ef4444', // red-500
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // Cleanup function for when component unmounts
        return () => {
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // Load Data Effect
    useEffect(() => {
        let active = true;

        const loadData = async () => {
            if (!seriesRef.current || !chartRef.current) return;

            setLoading(true);
            try {
                // Fetch OHLC data (Coingecko returns [time, open, high, low, close])
                const rawData = await fetchCoinOHLC(coinId, days);

                if (!active || !rawData || !rawData.length) return;

                // Format data for Lightweight Charts
                const formattedData: CandlestickData[] = rawData.map((candle: [number, number, number, number, number]) => {
                    // Coingecko returns timestamp in ms. Lightweight charts expects seconds for unix time
                    return {
                        time: (candle[0] / 1000) as Time,
                        open: candle[1],
                        high: candle[2],
                        low: candle[3],
                        close: candle[4]
                    };
                });

                seriesRef.current.setData(formattedData);
                chartRef.current.timeScale().fitContent();

            } catch (err) {
                console.error("Failed to load candlestick data", err);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadData();

        return () => { active = false; };
    }, [coinId, days]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        // Trigger initial resize
        setTimeout(handleResize, 50);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="w-full h-full relative">
            {loading && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                </div>
            )}
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
