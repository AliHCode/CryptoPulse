import React from 'react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

interface TradingViewChartProps {
    symbol: string; // TradingView uses "BINANCE:BTCUSDT" format
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
    // Convert CoinGecko symbol (e.g. "btc") to Binance TradingView format (e.g. "BINANCE:BTCUSDT")
    const formattedSymbol = `BINANCE:${symbol.toUpperCase()}USDT`;

    return (
        <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
            <AdvancedRealTimeChart
                symbol={formattedSymbol}
                theme="dark"
                width="100%"
                height="100%"
                allow_symbol_change={false}
                backgroundColor="#000000"
                hide_top_toolbar={false}
                hide_legend={false}
                save_image={false}
                container_id="tradingview_chart"
                style="1" // 1 = Candles
                toolbar_bg="#0f172a"
                enable_publishing={false}
                hide_side_toolbar={false} // Show drawing tools
            />
        </div>
    );
}
