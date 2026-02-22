# ⚡ CryptoPulse Terminal

**CryptoPulse** is a professional-grade cryptocurrency tracking, analytics, and portfolio management terminal. Designed to mimic the high-performance interfaces used by enterprise traders, it leverages modern Web APIs to deliver real-time market intelligence without dropping frames.

Built from the ground up with **React, TypeScript, Tailwind CSS**, and **Vite**, this application demonstrates advanced frontend architecture, state management, and real-time data handling.

## ✨ Features

- **Live Market Data**: Real-time ticker updates streamed directly via Binance WebSockets for zero-latency monitoring.
- **Background Smart Alerts**: Service workers calculate user price targets completely off the main UI thread.
- **Native OS Push Notifications**: Web Notifications alert you of triggered limits even when the app is in the background.
- **Progressive Web App (PWA)**: Fully installable to your mobile device or desktop homescreen via modern manifest and Service Worker caching.
- **Advanced Data Visualization**: Custom integration of Recharts for dynamic Candlesticks, Line Charts, and interactive Portfolio Pie Charts.
- **Normalized Coin Comparison**: Select any two tracking assets and plot their normalized percentage-growth overlay on exactly intersecting timelines.
- **Dollar Cost Averaging Engine**: Compute real historical ROI across 3 years of actual OHLCV market data based on custom simulated recurring investments.
- **Fear & Greed Index Gauge**: Custom mathematically-driven SVG needle dials mapping global market sentiment directly from `alternative.me`.
- **CSS Variable Theming**: Elegant Dark/Light mode execution leveraging pure CSS root variables bypassing Tailwind bloat.

## 🛠️ Tech Stack

- **Framework**: React 18, Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4), clsx
- **State Management**: Zustand
- **Charting**: Recharts, Lightweight Charts (TradingView)
- **Networking**: Axios, Native WebSockets
- **Icons**: Lucide React
- **Date Formatting**: date-fns
- **Tooling**: ESLint, PostCSS

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AliHCode/CryptoPulse.git
   cd CryptoPulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 📸 Screenshots

*(Add screenshots of your Dashboard, Analytics, and Compare pages here)*

## 💡 Architecture Notes

- **Zustand `useCryptoStore`**: Manages the global data dictionary mapping symbols to current prices perfectly syncing between REST initial fetches and Binance WebSocket streams.
- **`alertWorker.ts`**: Pure JavaScript Web Worker dedicated solely to processing thousands of theoretical price limits per second so that the UI never stutters during massive market movement.
- **PWA Integration**: Managed seamlessly through `vite-plugin-pwa` ensuring offline fallbacks and proper icon mapping across iOS and Android browsers.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
