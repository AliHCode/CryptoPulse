import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';

interface LiquidationHeatmapProps {
    asset: 'BTC' | 'ETH';
}

interface ForceOrder {
    price: number;
    volume: number;
    time: number;
    side: 'SELL' | 'BUY';
}

export default function LiquidationHeatmap({ asset }: LiquidationHeatmapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [hoverData, setHoverData] = useState<{ x: number, y: number, price: number, volume: number, side: string, time: number } | null>(null);

    const liquidationsRef = useRef<ForceOrder[]>([]);
    const maxVolumeRef = useRef<number>(1);
    const animationRef = useRef<number>(0);

    // Time window: Last 15 minutes
    const TIME_WINDOW_MS = 15 * 60 * 1000;

    const drawHeatmap = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS;

        const events = liquidationsRef.current;
        const maxVolume = maxVolumeRef.current;

        // Clear background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, width, height);

        if (events.length === 0) {
            ctx.fillStyle = '#475569';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('WAITING FOR LIQUIDATION EVENTS...', width / 2, height / 2);
            animationRef.current = requestAnimationFrame(drawHeatmap);
            return;
        }

        // Auto-scale Y Axis (Price)
        const prices = events.map(e => e.price);
        const minPrice = Math.min(...prices) * 0.999;
        const maxPrice = Math.max(...prices) * 1.001;
        const priceRange = maxPrice - minPrice || 1;

        // Draw grid
        ctx.strokeStyle = '#1e293b'; // slate-800
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (i / 5) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Price labels
            ctx.fillStyle = '#64748b'; // slate-500
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('$' + (maxPrice - (i / 5) * priceRange).toFixed(0), width - 5, y + 12);
        }

        // Draw Heatmap Data Points
        events.forEach(ev => {
            // X position (Time)
            let x = ((ev.time - startTime) / TIME_WINDOW_MS) * width;
            // Ensure x is sliding smoothly
            x = Math.max(0, Math.min(width, x));

            // Y position (Price)
            const y = height - ((ev.price - minPrice) / priceRange) * height;

            // Size & Color Intensity based on Volume
            const intensity = Math.min(1, ev.volume / (maxVolume * 0.5)); // Boost visibility of smaller ones
            const size = Math.max(4, intensity * 20); // Min 4px, Max 20px

            // Determine gradient/color
            // 'SELL' force orders happen when long positions are liquidated -> Price dropping -> Red
            // 'BUY' force orders happen when short positions are liquidated -> Price squeezing -> Green
            const r = ev.side === 'SELL' ? 244 : 16;
            const g = ev.side === 'SELL' ? 63 : 185;
            const b = ev.side === 'SELL' ? 94 : 129;

            // Radial gradient for glow effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.8 + intensity * 0.2})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        });

        animationRef.current = requestAnimationFrame(drawHeatmap);
    };

    useEffect(() => {
        // Canvas sizing setup
        const resizeCanvas = () => {
            if (canvasRef.current && containerRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Run animation loop
        animationRef.current = requestAnimationFrame(drawHeatmap);

        // Web Worker Setup
        workerRef.current = new Worker(new URL('../workers/liquidationWorker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (event) => {
            if (event.data.type === 'LIQUIDATION_UPDATE') {
                liquidationsRef.current = event.data.payload.events;
                maxVolumeRef.current = event.data.payload.maxVolume;
            }
        };

        workerRef.current.postMessage({ type: 'CONNECT', payload: { asset: asset + 'USDT' } });

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationRef.current);
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'DISCONNECT' });
                workerRef.current.terminate();
            }
        };
    }, [asset]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || liquidationsRef.current.length === 0) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        const events = liquidationsRef.current;

        // Find closest event
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS;

        const prices = events.map(ev => ev.price);
        const minPrice = Math.min(...prices) * 0.999;
        const maxPrice = Math.max(...prices) * 1.001;
        const priceRange = maxPrice - minPrice || 1;

        let closest: ForceOrder | null = null;
        let minDistance = 50; // Max hover radius in pixels

        for (const ev of events) {
            const evX = ((ev.time - startTime) / TIME_WINDOW_MS) * width;
            const evY = height - ((ev.price - minPrice) / priceRange) * height;

            const dist = Math.sqrt(Math.pow(mouseX - evX, 2) + Math.pow(mouseY - evY, 2));
            if (dist < minDistance) {
                minDistance = dist;
                closest = ev;
            }
        }

        if (closest) {
            setHoverData({
                x: mouseX,
                y: mouseY,
                price: closest.price,
                volume: closest.volume,
                side: closest.side,
                time: closest.time
            });
        } else {
            setHoverData(null);
        }
    };

    const handleMouseLeave = () => setHoverData(null);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Crosshair className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Real-Time Liquidations</h2>
                <span className="ml-auto text-xs text-slate-500 font-mono">Last 15 Minutes</span>
            </div>

            <div ref={containerRef} className="w-full h-80 relative border border-slate-800 bg-slate-900 cursor-crosshair overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="absolute inset-0 w-full h-full block"
                />

                {hoverData && (
                    <div
                        className="absolute z-10 bg-black/90 border border-slate-700 p-3 shadow-2xl backdrop-blur-sm pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]"
                        style={{ left: hoverData.x, top: hoverData.y }}
                    >
                        <div className="text-[10px] text-slate-400 font-mono mb-1 text-center border-b border-slate-800 pb-1">
                            {new Date(hoverData.time).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-4 font-mono whitespace-nowrap">
                            <div>
                                <div className="text-[10px] uppercase text-slate-500">Price</div>
                                <div className="font-bold text-white text-sm">{formatCurrency(hoverData.price)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-slate-500">Liq Volume</div>
                                <div className="font-bold text-amber-500 text-sm">{formatCurrency(hoverData.volume)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-slate-500">Type</div>
                                <div className={`font-bold text-sm ${hoverData.side === 'SELL' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {hoverData.side === 'SELL' ? 'LONG REKT' : 'SHORT REKT'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 flex gap-4 font-mono text-[10px] bg-black/80 p-2 backdrop-blur-sm border border-slate-800 rounded pointer-events-none">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500 opacity-80 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                        <span className="text-slate-300">Long Liquidated (Price Drop)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-80 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <span className="text-slate-300">Short Liquidated (Price Spike)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
