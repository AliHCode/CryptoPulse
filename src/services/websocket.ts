import { useCryptoStore } from '../store/cryptoStore';
import { useToastStore } from '../components/Toast';
import type { AlertEvaluationMessage, AlertTriggeredMessage } from '../workers/alertWorker';

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout;
let alertWorker: Worker | null = null;

import { getBinanceSymbol } from '../utils/symbolMap';

// Build a cached reverse map: Binance symbol -> geckoId
// Only built once when coins are first available, then reused
let reverseMapCache: Record<string, string> = {};
let reverseMapCoinCount = 0;

const buildReverseMap = (coins: any[]) => {
    if (coins.length === reverseMapCoinCount && Object.keys(reverseMapCache).length > 0) return;
    reverseMapCoinCount = coins.length;
    reverseMapCache = {};
    coins.forEach(c => {
        const binanceSymbol = getBinanceSymbol(c.id, c.symbol);
        // Only map valid USDT pairs (skip stablecoins and non-USDT overrides)
        if (binanceSymbol && binanceSymbol.endsWith('USDT')) {
            reverseMapCache[binanceSymbol] = c.id;
        }
    });
};

export const initializeWebSocket = () => {
    if (ws) return;

    if (!alertWorker) {
        alertWorker = new Worker(new URL('../workers/alertWorker.ts', import.meta.url), { type: 'module' });

        alertWorker.onmessage = (event: MessageEvent<AlertTriggeredMessage>) => {
            if (event.data.type === 'ALERT_TRIGGERED') {
                const { alertId, coinId, condition, targetPrice } = event.data.payload;

                const coins = useCryptoStore.getState().coins;
                const coin = coins.find(c => c.id === coinId);

                // Toggle alert off to prevent spamming
                useCryptoStore.getState().toggleAlert(alertId);

                if (coin) {
                    const title = 'SYSTEM ALERT TRIGGERED';
                    const message = `${coin.symbol.toUpperCase()} dropped ${condition} target of $${targetPrice}`;

                    // Show in-app toast
                    useToastStore.getState().addToast({
                        title,
                        message,
                        type: condition === 'above' ? 'success' : 'warning'
                    });

                    // Fire Native Push Notification if permitted
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: coin.image || '/icon.svg'
                        });
                    }
                }
            }
        };
    }

    const connect = () => {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (!Array.isArray(data)) return;

                const coins = useCryptoStore.getState().coins;
                if (coins.length === 0) return;

                buildReverseMap(coins);

                const mappedPrices: Record<string, number> = {};

                data.forEach((ticker: any) => {
                    // Only process USDT-denominated pairs
                    if (!ticker.s || !ticker.s.endsWith('USDT')) return;
                    const geckoId = reverseMapCache[ticker.s];
                    if (geckoId) {
                        mappedPrices[geckoId] = parseFloat(ticker.c);
                    }
                });

                if (Object.keys(mappedPrices).length > 0) {
                    useCryptoStore.getState().updateCoinPrices(mappedPrices);

                    // Dispatch to Web Worker for background evaluation
                    const alerts = useCryptoStore.getState().alerts;
                    if (alerts.length > 0 && alertWorker) {
                        const msg: AlertEvaluationMessage = {
                            type: 'EVALUATE_ALERTS',
                            payload: { alerts, prices: mappedPrices }
                        };
                        alertWorker.postMessage(msg);
                    }
                }

            } catch (e) {
                console.error('Error parsing Binance websocket message', e);
            }
        };

        ws.onclose = () => {
            ws = null;
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
            console.error('Binance WebSocket Error:', error);
            ws?.close();
        };
    };

    connect();
};

export const closeWebSocket = () => {
    if (ws) {
        ws.onclose = null; // Prevent the reconnect timer from firing
        ws.onerror = null;

        // If the socket is still in the process of connecting (readyState 0),
        // closing it immediately throws a browser warning. Wait for it or just null it.
        if (ws.readyState === WebSocket.CONNECTING) {
            // We can't close it cleanly yet without a warning, so we just remove handlers
            // and let it naturally die or get garbage collected when the component unmounts
            ws.onopen = () => {
                ws?.close();
            };
        } else {
            ws.close();
        }
        ws = null;
    }
    clearTimeout(reconnectTimer);
};
