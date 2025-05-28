/**
 * Coin Symbols Reference Data
 * Contains mapping of trading symbols to coin names for search functionality
 */
const COIN_SYMBOLS = [
    // Top cryptocurrencies by market cap
    { symbol: "BTCUSDT", name: "Bitcoin" },
    { symbol: "ETHUSDT", name: "Ethereum" },
    { symbol: "ADAUSDT", name: "Cardano" },
    { symbol: "DOTUSDT", name: "Polkadot" },
    { symbol: "LINKUSDT", name: "Chainlink" },
    
    // Additional major coins
    { symbol: "BNBUSDT", name: "BNB" },
    { symbol: "XRPUSDT", name: "XRP" },
    { symbol: "SOLUSDT", name: "Solana" },
    { symbol: "LTCUSDT", name: "Litecoin" },
    { symbol: "BCHUSDT", name: "Bitcoin Cash" },
    { symbol: "EOSUSDT", name: "EOS" },
    { symbol: "TRXUSDT", name: "TRON" },
    { symbol: "XLMUSDT", name: "Stellar" },
    { symbol: "XMRUSDT", name: "Monero" },
    { symbol: "ETCUSDT", name: "Ethereum Classic" },
    
    // DeFi tokens
    { symbol: "UNIUSDT", name: "Uniswap" },
    { symbol: "AAVEUSDT", name: "Aave" },
    { symbol: "SUSHIUSDT", name: "SushiSwap" },
    { symbol: "COMPUSDT", name: "Compound" },
    { symbol: "MKRUSDT", name: "Maker" },
    { symbol: "YFIUSDT", name: "yearn.finance" },
    { symbol: "CRVUSDT", name: "Curve DAO Token" },
    { symbol: "SNXUSDT", name: "Synthetix" },
    { symbol: "1INCHUSDT", name: "1inch" },
    { symbol: "ALPHAUSDT", name: "Alpha Finance Lab" },
    
    // Layer 1 & Layer 2
    { symbol: "AVAXUSDT", name: "Avalanche" },
    { symbol: "MATICUSDT", name: "Polygon" },
    { symbol: "ATOMUSDT", name: "Cosmos" },
    { symbol: "ALGOUSDT", name: "Algorand" },
    { symbol: "FTMUSDT", name: "Fantom" },
    { symbol: "NEARUSDT", name: "NEAR Protocol" },
    { symbol: "LUNAUSDT", name: "Terra Luna" },
    { symbol: "ICPUSDT", name: "Internet Computer" },
    { symbol: "FILUSDT", name: "Filecoin" },
    { symbol: "VETUSDT", name: "VeChain" },
    
    // Meme coins
    { symbol: "DOGEUSDT", name: "Dogecoin" },
    { symbol: "SHIBUSDT", name: "Shiba Inu" },
    
    // Enterprise & Utility
    { symbol: "HBARUSDT", name: "Hedera" },
    { symbol: "XTZUSDT", name: "Tezos" },
    { symbol: "IOTAUSDT", name: "IOTA" },
    { symbol: "NEOUSDT", name: "Neo" },
    { symbol: "ONTUSDT", name: "Ontology" },
    { symbol: "QTUMUSDT", name: "Qtum" },
    { symbol: "ZECUSDT", name: "Zcash" },
    { symbol: "DASHUSDT", name: "Dash" },
    
    // Gaming & NFT
    { symbol: "AXSUSDT", name: "Axie Infinity" },
    { symbol: "SANDUSDT", name: "The Sandbox" },
    { symbol: "MANAUSDT", name: "Decentraland" },
    { symbol: "ENJUSDT", name: "Enjin Coin" },
    { symbol: "CHZUSDT", name: "Chiliz" },
    
    // Exchange tokens
    { symbol: "CAKEUSDT", name: "PancakeSwap" },
    { symbol: "KCSUSDT", name: "KuCoin Token" },
    { symbol: "HTUSDT", name: "Huobi Token" },
    { symbol: "OKBUSDT", name: "OKB" },
];

/**
 * Search coins by symbol or name
 * @param {string} query - Search query
 * @param {number} limit - Maximum results to return
 * @returns {Array} Matching coins
 */
function searchCoins(query, limit = 5) {
    if (!query || query.length < 1) {
        // Return default top 5 coins when no query
        return COIN_SYMBOLS.slice(0, 5);
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    // Filter coins that match symbol or name
    const matches = COIN_SYMBOLS.filter(coin => {
        const symbolMatch = coin.symbol.toLowerCase().includes(searchTerm);
        const nameMatch = coin.name.toLowerCase().includes(searchTerm);
        return symbolMatch || nameMatch;
    });
    
    // Sort by relevance (exact matches first, then starts-with matches)
    matches.sort((a, b) => {
        const aSymbolExact = a.symbol.toLowerCase() === searchTerm;
        const bSymbolExact = b.symbol.toLowerCase() === searchTerm;
        const aNameExact = a.name.toLowerCase() === searchTerm;
        const bNameExact = b.name.toLowerCase() === searchTerm;
        
        // Exact matches first
        if (aSymbolExact || aNameExact) return -1;
        if (bSymbolExact || bNameExact) return 1;
        
        // Then starts-with matches
        const aSymbolStarts = a.symbol.toLowerCase().startsWith(searchTerm);
        const bSymbolStarts = b.symbol.toLowerCase().startsWith(searchTerm);
        const aNameStarts = a.name.toLowerCase().startsWith(searchTerm);
        const bNameStarts = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aSymbolStarts || aNameStarts) return -1;
        if (bSymbolStarts || bNameStarts) return 1;
        
        // Finally alphabetical by name
        return a.name.localeCompare(b.name);
    });
    
    return matches.slice(0, limit);
}

/**
 * Get coin by symbol
 * @param {string} symbol - Trading symbol (e.g., "BTCUSDT")
 * @returns {Object|null} Coin object or null if not found
 */
function getCoinBySymbol(symbol) {
    return COIN_SYMBOLS.find(coin => coin.symbol === symbol) || null;
}

/**
 * Format coin for display in dropdown
 * @param {Object} coin - Coin object
 * @returns {string} Formatted display string
 */
function formatCoinDisplay(coin) {
    const pair = coin.symbol.replace('USDT', ' / USDT');
    return `${pair} - ${coin.name}`;
}