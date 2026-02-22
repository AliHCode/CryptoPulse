<div align="center">

# ⚡ CryptoPulse
Your high-performance, real-time cryptocurrency trading terminal & portfolio tracker.<br>
Built with ❤️ using React, Tailwind v4 & Vite

[![React](https://img.shields.io/badge/React-18.x-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

---

## 📖 Overview

**CryptoPulse** is a professional-grade cryptocurrency tracking, analytics, and portfolio management terminal. Designed to mimic the high-performance interfaces used by enterprise traders, it leverages modern Web APIs to deliver real-time market intelligence without dropping frames.

Whether you're tracking your investments, analyzing 30-day percentage growth, or running historical Dollar Cost Averaging (DCA) simulations, CryptoPulse brings all the tools you need into one seamless, PWA-installable dashboard.

---

## ✨ Features

- 🟢 **Live Market Data**: Real-time ticker updates streamed directly via Binance WebSockets for zero-latency monitoring.
- 🔔 **Background Smart Alerts**: Service workers calculate user price targets completely off the main UI thread.
- 📱 **Native OS Push Notifications**: Web Notifications alert you of triggered limits even when the app is in the background.
- 💻 **Progressive Web App (PWA)**: Fully installable to your mobile device or desktop homescreen via modern manifest and Service Worker caching.
- 📊 **Advanced Data Visualization**: Custom integration of Recharts for dynamic Candlesticks, Line Charts, and interactive Portfolio Pie Charts.
- ⚖️ **Normalized Coin Comparison**: Select any two tracking assets and plot their normalized percentage-growth overlay on exactly intersecting timelines.
- 💰 **Dollar Cost Averaging Engine**: Compute real historical ROI across 3 years of actual OHLCV market data based on custom simulated recurring investments.
- 🧭 **Fear & Greed Gauge**: Custom mathematically-driven SVG needle dials mapping global market sentiment directly from `alternative.me`.
- 🌓 **Elegant Theming**: Instant Dark/Light mode execution leveraging pure CSS root variables bypassing Tailwind bloat.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: React 18, Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4), clsx
- **State Management**: Zustand (Persisted via localStorage)
- **Charting Engine**: Recharts, Lightweight Charts
- **Networking/Data**: Axios, Native WebSockets, Coingecko API, Binance API
- **Tooling**: ESLint, PostCSS, vite-plugin-pwa

### 🧠 Architecture Highlights
* **Off-Main-Thread Processing**: Dedicated `alertWorker.ts` handles massive price-alert evaluations to ensure the UI remains buttery smooth.
* **Component-Level Rendering**: Carefully mapped Zustand state ensures that WebSocket price updates only re-render the exact `PriceFlash` components on screen, not the entire table.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation Steps

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

---

## 📸 Screenshots

*(Add screenshots of your Dashboard, Analytics Tool, and Light/Dark mode here!)*

---

## 🤝 Contributing

Contributions make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <b>Built by <a href="https://github.com/AliHCode">AliHCode</a></b>
</div>
