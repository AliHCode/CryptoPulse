export interface AlertEvaluationMessage {
    type: 'EVALUATE_ALERTS';
    payload: {
        alerts: Array<{
            id: string;
            coinId: string;
            targetPrice: number;
            condition: 'above' | 'below';
            isActive: boolean;
            type: 'price' | 'percent';
            percentChange?: number;
            referencePrice?: number;
        }>;
        prices: Record<string, number>;
    };
}

export interface AlertTriggeredMessage {
    type: 'ALERT_TRIGGERED';
    payload: {
        alertId: string;
        coinId: string;
        condition: 'above' | 'below';
        targetPrice: number;
        currentPrice: number;
        type: 'price' | 'percent';
    };
}

// Ensure the worker knows about the postMessage API
declare const self: Worker;

self.onmessage = (event: MessageEvent<AlertEvaluationMessage>) => {
    if (event.data.type === 'EVALUATE_ALERTS') {
        const { alerts, prices } = event.data.payload;

        alerts.forEach((alert) => {
            if (!alert.isActive) return;

            const currentPrice = prices[alert.coinId];
            if (currentPrice === undefined) return;

            let isTriggered = false;

            if (alert.type === 'percent' && alert.referencePrice && alert.percentChange !== undefined) {
                // Percentage-based alert
                const actualChange = ((currentPrice - alert.referencePrice) / alert.referencePrice) * 100;
                isTriggered = alert.condition === 'above'
                    ? actualChange >= alert.percentChange
                    : actualChange <= -alert.percentChange;
            } else {
                // Absolute price alert
                isTriggered = alert.condition === 'above'
                    ? currentPrice > alert.targetPrice
                    : currentPrice < alert.targetPrice;
            }

            if (isTriggered) {
                const msg: AlertTriggeredMessage = {
                    type: 'ALERT_TRIGGERED',
                    payload: {
                        alertId: alert.id,
                        coinId: alert.coinId,
                        condition: alert.condition,
                        targetPrice: alert.targetPrice,
                        currentPrice,
                        type: alert.type,
                    },
                };
                self.postMessage(msg);
            }
        });
    }
};
