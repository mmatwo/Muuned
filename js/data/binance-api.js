/**
 * Binance API Client
 * Handles fetching market data from Binance public API
 */
class BinanceAPI {
    constructor() {
        this.baseUrl = 'https://api.binance.com/api/v3';
        this.rateLimit = 100; // ms between requests
    }

    /**
     * Fetch kline/candlestick data from Binance
     * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
     * @param {string} interval - Candlestick interval (e.g., '1h', '4h', '1d')
     * @param {number} startTime - Start time in milliseconds
     * @param {number} endTime - End time in milliseconds
     * @param {number} limit - Maximum number of records (max 1000)
     * @returns {Promise<Array>} Array of candlestick data
     */
    async fetchKlines(symbol, interval, startTime, endTime, limit = 1000) {
        const url = `${this.baseUrl}/klines`;
        const params = new URLSearchParams({
            symbol: symbol,
            interval: interval,
            startTime: startTime,
            endTime: endTime,
            limit: limit
        });

        try {
            const response = await fetch(`${url}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            return data.map(candle => ({
                timestamp: parseInt(candle[0]),
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5]),
                closeTime: parseInt(candle[6]),
                quoteVolume: parseFloat(candle[7]),
                trades: parseInt(candle[8]),
                baseAssetVolume: parseFloat(candle[9]),
                quoteAssetVolume: parseFloat(candle[10])
            }));

        } catch (error) {
            console.error('Error fetching data from Binance:', error);
            throw new Error(`Failed to fetch market data: ${error.message}`);
        }
    }

    /**
     * Fetch historical data for a date range
     * Handles pagination automatically for large date ranges
     * @param {string} symbol - Trading pair
     * @param {string} interval - Candlestick interval
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     * @param {Function} onProgress - Progress callback function
     * @returns {Promise<Array>} Complete historical data
     */
    async fetchHistoricalData(symbol, interval, startDate, endDate, onProgress = null) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const limit = 1000;

        let allData = [];
        let currentStart = start;
        let totalRequests = Math.ceil((end - start) / this.getIntervalMs(interval) / limit);
        let completedRequests = 0;

        console.log(`Fetching ${symbol} ${interval} data from ${startDate} to ${endDate}`);
        console.log(`Estimated ${totalRequests} API requests needed`);

        while (currentStart < end) {
            try {
                const batch = await this.fetchKlines(symbol, interval, currentStart, end, limit);
                
                if (batch.length === 0) {
                    console.log('No more data available');
                    break;
                }

                allData = allData.concat(batch);
                currentStart = batch[batch.length - 1].timestamp + 1;
                completedRequests++;

                // Update progress
                if (onProgress) {
                    const progress = Math.min(completedRequests / totalRequests, 1.0);
                    onProgress(progress);
                }

                // Rate limiting
                if (currentStart < end) {
                    await this.sleep(this.rateLimit);
                }

            } catch (error) {
                console.error(`Error fetching batch starting at ${new Date(currentStart)}:`, error);
                throw error;
            }
        }

        console.log(`Successfully fetched ${allData.length} candles`);
        return allData;
    }

    /**
     * Get interval duration in milliseconds
     * @param {string} interval - Binance interval string
     * @returns {number} Duration in milliseconds
     */
    getIntervalMs(interval) {
        const intervals = {
            '1m': 60 * 1000,
            '3m': 3 * 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '2h': 2 * 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '8h': 8 * 60 * 60 * 1000,
            '12h': 12 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '3d': 3 * 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
            '1M': 30 * 24 * 60 * 60 * 1000
        };

        return intervals[interval] || 60 * 60 * 1000; // Default to 1 hour
    }

    /**
     * Validate symbol format
     * @param {string} symbol - Trading pair symbol
     * @returns {boolean} Whether symbol is valid
     */
    isValidSymbol(symbol) {
        // Basic validation - should end with USDT, BTC, ETH, etc.
        const validQuotes = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD'];
        return validQuotes.some(quote => symbol.endsWith(quote));
    }

    /**
     * Get supported intervals
     * @returns {Array} Array of supported interval strings
     */
    getSupportedIntervals() {
        return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    }

    /**
     * Sleep utility for rate limiting
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check API connectivity
     * @returns {Promise<boolean>} Whether API is accessible
     */
    async checkConnectivity() {
        try {
            const response = await fetch(`${this.baseUrl}/ping`);
            return response.ok;
        } catch (error) {
            console.error('API connectivity check failed:', error);
            return false;
        }
    }
}