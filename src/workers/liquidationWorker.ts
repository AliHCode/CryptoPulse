// Liquidation Heatmap Worker
// Connects to Binance Futures and aggregates liquidation events into price buckets over time

interface ForceOrder {
    price: number;
    volume: number;
    time: number;
    side: 'SELL' | 'BUY';
}

interface Bucket {
    timeIndex: number;      // e.g., bucketed to every ~5 seconds
    priceIndex: number;     // e.g., bucketed to every $10 or $50
    volume: number;
    side: 'SELL' | 'BUY';
}

let ws: WebSocket | null = null;
let liquidations: ForceOrder[] = [];
let currentAsset: string = 'BTCUSDT';
let maxVolume = 1;

// Grid configurations
const BUCKET_TIME_MS = 5000;   // 5 second columns
const MAX_HISTORY_MS = 15 * 60 * 1000; // Keep 15 minutes of history

const connect = (asset: string) => {
    if (ws) {
        ws.close();
    }

    currentAsset = asset.toUpperCase();
    liquidations = []; // Reset history on asset change
    maxVolume = 1;

    ws = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            // data is typically an array or an object
            const events = Array.isArray(data) ? data : [data];

            events.forEach((msg: any) => {
                if (msg.e === 'forceOrder' && msg.o && msg.o.s === currentAsset) {
                    const raw = msg.o;
                    const order: ForceOrder = {
                        price: parseFloat(raw.p),
                        volume: parseFloat(raw.q) * parseFloat(raw.p), // Total USD value
                        time: raw.T,
                        side: raw.S // 'SELL' means a long was liquidated, 'BUY' means a short was liquidated
                    };

                    liquidations.push(order);
                    if (order.volume > maxVolume) {
                        maxVolume = order.volume;
                    }
                }
            });

        } catch (err) {
            console.error('Liquidation Worker Error parsing message:', err);
        }
    };

    ws.onerror = (error) => {
        console.error('Liquidation WebSocket error:', error);
    };
};

// Periodic flush to main thread for Canvas Rendering
setInterval(() => {
    const now = Date.now();
    // Filter out expired history
    liquidations = liquidations.filter(liq => now - liq.time <= MAX_HISTORY_MS);

    if (liquidations.length > 0) {
        self.postMessage({
            type: 'LIQUIDATION_UPDATE',
            payload: {
                events: liquidations,
                maxVolume: maxVolume
            }
        });
    }
}, 1000); // Send update 1x a second to main thread. Main thread uses rAF to render smoothly

self.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'CONNECT') {
        connect(payload.asset);
    } else if (type === 'DISCONNECT') {
        if (ws) {
            ws.close();
            ws = null;
        }
    }
};
