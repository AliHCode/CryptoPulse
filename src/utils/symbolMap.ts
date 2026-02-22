export const getBinanceSymbol = (geckoId: string, coinSymbol?: string) => {
    // 1. Hardcoded overrides for known divergences
    const map: Record<string, string> = {
        'bitcoin': 'BTCUSDT',
        'ethereum': 'ETHUSDT',
        'tether': '',  // USDT can't be priced in USDT — keep CoinGecko price
        'binancecoin': 'BNBUSDT',
        'solana': 'SOLUSDT',
        'ripple': 'XRPUSDT',
        'usd-coin': '', // USDC can't be priced in USDT — keep CoinGecko price
        'staked-ether': 'ETHUSDT',
        'cardano': 'ADAUSDT',
        'avalanche-2': 'AVAXUSDT',
        'dogecoin': 'DOGEUSDT',
        'polkadot': 'DOTUSDT',
        'tron': 'TRXUSDT',
        'chainlink': 'LINKUSDT',
        'matic-network': 'MATICUSDT',
        'polygon-ecosystem': 'POLUSDT',
        'shiba-inu': 'SHIBUSDT',
        'litecoin': 'LTCUSDT',
        'bitcoin-cash': 'BCHUSDT',
        'uniswap': 'UNIUSDT',
        'internet-computer': 'ICPUSDT',
        'leo-token': 'LEOUSDT',
        'ethereum-classic': 'ETCUSDT',
        'stellar': 'XLMUSDT',
        'near': 'NEARUSDT',
        'aptos': 'APTUSDT',
        'cosmos': 'ATOMUSDT',
        'filecoin': 'FILUSDT',
        'crypto-com-chain': 'CROUSDT', // cronos
        'maker': 'MKRUSDT',
        'vechain': 'VETUSDT',
        'lido-dao': 'LDOUSDT',
        'optimism': 'OPUSDT',
        'the-graph': 'GRTUSDT',
        'injective-protocol': 'INJUSDT',
        'render-token': 'RNDRUSDT', // Note: Binance migrated RNDR to RENDER recently, could be either
        'theta-token': 'THETAUSDT',
        'fantom': 'FTMUSDT',
        'thorchain': 'RUNEUSDT',
        'havven': 'SNXUSDT', // synthetix
        'elrond-erd-2': 'EGLDUSDT',
        'iota': 'IOTAUSDT',
        'quant-network': 'QNTUSDT',
        'gala': 'GALAUSDT',
        'neo': 'NEOUSDT',
        'chiliz': 'CHZUSDT',
        'pancakeswap-token': 'CAKEUSDT',
        'zcash': 'ZECUSDT',
        'dash': 'DASHUSDT',
        'enjincoin': 'ENJUSDT',
        'bat': 'BATUSDT',
        'decentraland': 'MANAUSDT',
        'axie-infinity': 'AXSUSDT',
        'the-sandbox': 'SANDUSDT',
    };

    if (map[geckoId]) return map[geckoId];

    // 2. Dynamic generation based on the passed coinSymbol (if available)
    if (coinSymbol && typeof coinSymbol === 'string') {
        const cleanSymbol = coinSymbol.toUpperCase().trim();
        return `${cleanSymbol}USDT`;
    }

    // 3. Fallback attempt based purely on the geckoId string (unreliable for names like "avalanche-2")
    return `${geckoId.toUpperCase()}USDT`;
};
