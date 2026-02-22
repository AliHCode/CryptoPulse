export default function NewsTicker() {
    // Realistic financial terminal mock headlines
    const headlines = [
        "ASSET MATRIX: Global cryptocurrency market cap stands at $2.14 Trillion.",
        "BULL ALERT: Institutional flows shift positively towards major large-cap assets.",
        "SEC REGULATION: New compliance frameworks proposed for decentralized exchanges.",
        "NETWORK UPGRADE: Major Layer-1 protocols announce concurrent scalability hard-forks.",
        "DEFI YIELDS: Stablecoin liquidity protocols observe a 14% WoW increase in TVL.",
        "WHALE MOVEMENT: 15,000 BTC moved from cold storage to active exchange wallets.",
        "MACRO ECON: US FED signals potential rate adjustments affecting high-risk assets.",
        "MINING DIFFICULTY: Proof of Work network difficulty hits all-time structural highs."
    ];

    return (
        <div className="fixed top-0 left-0 right-0 h-8 bg-amber-500 text-black font-mono text-xs font-bold uppercase overflow-hidden z-[60] flex items-center border-b-2 border-amber-600">
            <div className="flex whitespace-nowrap animate-marquee w-full">
                {/* We double the headlines to create a seamless loop effect */}
                {[...headlines, ...headlines].map((headline, index) => (
                    <div key={index} className="flex items-center">
                        <span className="mx-8">&bull;</span>
                        <span>{headline}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
