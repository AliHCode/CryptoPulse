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

    let buffer: Record<string, number> = {};
    let flushInterval: any = null;

    const connect = () => {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (!Array.isArray(data)) return;

                const coins = useCryptoStore.getState().coins;
                if (coins.length === 0) return;

                buildReverseMap(coins);

                data.forEach((ticker: any) => {
                    // Only process USDT-denominated pairs
                    if (!ticker.s || !ticker.s.endsWith('USDT')) return;
                    const geckoId = reverseMapCache[ticker.s];
                    if (geckoId) {
                        buffer[geckoId] = parseFloat(ticker.c);
                    }
                });

                // Start the flush interval if it's not running
                if (!flushInterval) {
                    flushInterval = setInterval(() => {
                        if (Object.keys(buffer).length > 0) {
                            useCryptoStore.getState().updateCoinPrices(buffer);

                            // Dispatch to Web Worker for background evaluation
                            const alerts = useCryptoStore.getState().alerts;
                            if (alerts.length > 0 && alertWorker) {
                                const msg: AlertEvaluationMessage = {
                                    type: 'EVALUATE_ALERTS',
                                    payload: { alerts, prices: { ...buffer } }
                                };
                                alertWorker.postMessage(msg);
                            }

                            // Reset buffer
                            buffer = {};
                        }
                    }, 1000); // Flush updates once per second
                }

            } catch (e) {
                console.error('Error parsing Binance websocket message', e);
            }
        };

        ws.onclose = () => {
            ws = null;
            if (flushInterval) {
                clearInterval(flushInterval);
                flushInterval = null;
            }
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

        // Clean up flush interval
        // We can't access flushInterval from here directly in the current scope if we are not careful
        // But for this implementation, it's better to manage it inside the store or as a higher level ref
        // For now, we will handle it in the connection lifecycle

        if (ws.readyState === WebSocket.CONNECTING) {
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
