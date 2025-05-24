/**
 * Technical Indicators Library
 * Contains implementations of common technical analysis indicators
 */
class TechnicalIndicators {
    
    /**
     * Calculate Simple Moving Average (SMA)
     * @param {Array<number>} prices - Price array
     * @param {number} period - Period for calculation
     * @returns {Array<number>} SMA values
     */
    static sma(prices, period) {
        const result = [];
        
        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const sum = slice.reduce((a, b) => a + b, 0);
            result[i] = sum / period;
        }
        
        return result;
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     * @param {Array<number>} prices - Price array
     * @param {number} period - Period for calculation
     * @returns {Array<number>} EMA values
     */
    static ema(prices, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        
        // Start with SMA for first value
        let sum = 0;
        for (let i = 0; i < period && i < prices.length; i++) {
            sum += prices[i];
        }
        result[period - 1] = sum / period;
        
        // Calculate EMA for remaining values
        for (let i = period; i < prices.length; i++) {
            result[i] = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
        }
        
        return result;
    }

    /**
     * Calculate dynamic EMA with variable periods
     * @param {Array<number>} prices - Price array
     * @param {Array<number>} periods - Array of periods for each price point
     * @returns {Array<number>} Dynamic EMA values
     */
    static dynamicEMA(prices, periods) {
        const result = [];
        
        for (let i = 0; i < prices.length; i++) {
            const period = periods[i];
            if (period && i >= period - 1) {
                // Calculate EMA for the current window
                const startIdx = Math.max(0, i - period + 1);
                const priceSlice = prices.slice(startIdx, i + 1);
                const ema = this.ema(priceSlice, Math.min(period, priceSlice.length));
                result[i] = ema[ema.length - 1];
            }
        }
        
        return result;
    }

    /**
     * Calculate Rolling Standard Deviation (Volatility)
     * @param {Array<number>} prices - Price array
     * @param {number} window - Rolling window size
     * @returns {Array<number>} Standard deviation values
     */
    static rollingStd(prices, window = 20) {
        const result = [];
        
        for (let i = window - 1; i < prices.length; i++) {
            const slice = prices.slice(i - window + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b) / slice.length;
            const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
            result[i] = Math.sqrt(variance);
        }
        
        return result;
    }

    /**
     * Calculate Rolling Volatility as percentage of price
     * @param {Array<number>} prices - Price array
     * @param {number} window - Rolling window size
     * @returns {Array<number>} Volatility percentage values
     */
    static rollingVolatilityPct(prices, window = 20) {
        const stdDev = this.rollingStd(prices, window);
        const result = [];
        
        for (let i = 0; i < prices.length; i++) {
            if (stdDev[i] !== undefined && prices[i] > 0) {
                result[i] = (stdDev[i] / prices[i]) * 100;
            }
        }
        
        return result;
    }

    /**
     * Calculate OHLC4 price (average of open, high, low, close)
     * @param {Array<Object>} candles - Array of candlestick objects
     * @returns {Array<number>} OHLC4 prices
     */
    static ohlc4(candles) {
        return candles.map(candle => 
            (candle.open + candle.high + candle.low + candle.close) / 4
        );
    }

    /**
     * Calculate HLC3 price (average of high, low, close)
     * @param {Array<Object>} candles - Array of candlestick objects
     * @returns {Array<number>} HLC3 prices
     */
    static hlc3(candles) {
        return candles.map(candle => 
            (candle.high + candle.low + candle.close) / 3
        );
    }

    /**
     * Calculate HL2 price (average of high, low)
     * @param {Array<Object>} candles - Array of candlestick objects
     * @returns {Array<number>} HL2 prices
     */
    static hl2(candles) {
        return candles.map(candle => 
            (candle.high + candle.low) / 2
        );
    }

    /**
     * Calculate percentage change between two arrays
     * @param {Array<number>} baseline - Baseline values
     * @param {Array<number>} comparison - Comparison values
     * @returns {Array<number>} Percentage changes
     */
    static percentageChange(baseline, comparison) {
        const result = [];
        
        for (let i = 0; i < Math.min(baseline.length, comparison.length); i++) {
            if (baseline[i] && baseline[i] !== 0) {
                result[i] = ((comparison[i] - baseline[i]) / baseline[i]) * 100;
            }
        }
        
        return result;
    }

    /**
     * Smooth an array using exponential moving average
     * @param {Array<number>} values - Values to smooth
     * @param {number} smoothingFactor - EMA period for smoothing
     * @returns {Array<number>} Smoothed values
     */
    static smooth(values, smoothingFactor = 3) {
        return this.ema(values, smoothingFactor);
    }

    /**
     * Calculate True Range for volatility analysis
     * @param {Array<Object>} candles - Array of candlestick objects
     * @returns {Array<number>} True Range values
     */
    static trueRange(candles) {
        const result = [];
        
        for (let i = 1; i < candles.length; i++) {
            const current = candles[i];
            const previous = candles[i - 1];
            
            const tr1 = current.high - current.low;
            const tr2 = Math.abs(current.high - previous.close);
            const tr3 = Math.abs(current.low - previous.close);
            
            result[i] = Math.max(tr1, tr2, tr3);
        }
        
        return result;
    }

    /**
     * Calculate Average True Range (ATR)
     * @param {Array<Object>} candles - Array of candlestick objects
     * @param {number} period - Period for ATR calculation
     * @returns {Array<number>} ATR values
     */
    static atr(candles, period = 14) {
        const trueRanges = this.trueRange(candles);
        return this.ema(trueRanges.filter(tr => tr !== undefined), period);
    }

    /**
     * Utility: Fill missing values with previous valid value
     * @param {Array} array - Array with potential undefined values
     * @returns {Array} Array with filled values
     */
    static fillForward(array) {
        const result = [...array];
        let lastValid = null;
        
        for (let i = 0; i < result.length; i++) {
            if (result[i] !== undefined && result[i] !== null) {
                lastValid = result[i];
            } else if (lastValid !== null) {
                result[i] = lastValid;
            }
        }
        
        return result;
    }

    /**
     * Utility: Validate input arrays
     * @param {Array} array - Array to validate
     * @param {string} name - Name for error messages
     * @throws {Error} If array is invalid
     */
    static validateArray(array, name = 'array') {
        if (!Array.isArray(array)) {
            throw new Error(`${name} must be an array`);
        }
        
        if (array.length === 0) {
            throw new Error(`${name} cannot be empty`);
        }
    }

    /**
     * Utility: Check if value is a valid number
     * @param {*} value - Value to check
     * @returns {boolean} Whether value is a valid number
     */
    static isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
}