import { Coin } from "../store/cryptoStore";

export const analyzeMarket = async (coins: Coin[]) => {
  const topCoins = coins.slice(0, 10).map(c => ({
    name: c.name,
    symbol: c.symbol,
    price: c.current_price,
    change24h: c.price_change_percentage_24h,
    marketCap: c.market_cap
  }));

  const prompt = `
    Analyze the current cryptocurrency market based on these top 10 coins:
    ${JSON.stringify(topCoins, null, 2)}

    Provide a concise market sentiment analysis (Bullish, Bearish, or Neutral) and 3 key takeaways.
    Format the response as JSON with keys: "sentiment" (string), "takeaways" (array of strings), "summary" (string).
  `;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null; // Return null gracefully if API fails or running locally without Vercel backend
  }
};

export const analyzePortfolio = async (portfolio: any[], coins: Coin[]) => {
  // Enrich portfolio with current data
  const enrichedPortfolio = portfolio.map(item => {
    const coin = coins.find(c => c.id === item.coinId);
    return {
      ...item,
      currentPrice: coin?.current_price,
      name: coin?.name,
      symbol: coin?.symbol,
      value: (coin?.current_price || 0) * item.amount
    };
  });

  const prompt = `
    Analyze this crypto portfolio:
    ${JSON.stringify(enrichedPortfolio, null, 2)}

    Provide investment advice, risk assessment, and potential diversification opportunities.
    Format as JSON: "riskLevel" (Low/Medium/High), "advice" (string), "diversification" (string).
  `;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini portfolio analysis failed:", error);
    return null;
  }
};
