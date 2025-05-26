/**
 * Technical Indicators Library - Pine Script Compatible
 * Contains implementations of technical analysis indicators compatible with Pine Script naming
 */
class TechnicalIndicators {
    
    // ===== MOVING AVERAGES =====
    
    static sma(prices, period) {
        const result = [];
        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            result[i] = slice.reduce((a, b) => a + b, 0) / period;
        }
        return result;
    }

    static ema(prices, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        let sum = 0;
        for (let i = 0; i < period && i < prices.length; i++) {
            sum += prices[i];
        }
        result[period - 1] = sum / period;
        for (let i = period; i < prices.length; i++) {
            result[i] = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
        }
        return result;
    }

    static wma(prices, period) {
        const result = [];
        const weights = Array.from({length: period}, (_, i) => i + 1);
        const weightSum = weights.reduce((a, b) => a + b, 0);
        
        for (let i = period - 1; i < prices.length; i++) {
            let weightedSum = 0;
            for (let j = 0; j < period; j++) {
                weightedSum += prices[i - j] * weights[period - 1 - j];
            }
            result[i] = weightedSum / weightSum;
        }
        return result;
    }

    static vwma(prices, volumes, period) {
        const result = [];
        for (let i = period - 1; i < prices.length; i++) {
            let volumeWeightedSum = 0;
            let volumeSum = 0;
            for (let j = 0; j < period; j++) {
                volumeWeightedSum += prices[i - j] * volumes[i - j];
                volumeSum += volumes[i - j];
            }
            result[i] = volumeSum > 0 ? volumeWeightedSum / volumeSum : prices[i];
        }
        return result;
    }

    static swma(prices) {
        const result = [];
        const weights = [1, 2, 2, 1];
        const weightSum = 6;
        
        for (let i = 3; i < prices.length; i++) {
            let weightedSum = 0;
            for (let j = 0; j < 4; j++) {
                weightedSum += prices[i - j] * weights[j];
            }
            result[i] = weightedSum / weightSum;
        }
        return result;
    }

    static alma(prices, period, offset = 0.9, sigma = 6) {
        const result = [];
        const m = offset * (period - 1);
        const s = period / sigma;
        
        for (let i = period - 1; i < prices.length; i++) {
            let weightedSum = 0;
            let weightSum = 0;
            
            for (let j = 0; j < period; j++) {
                const weight = Math.exp(-((j - m) ** 2) / (2 * s * s));
                weightedSum += prices[i - j] * weight;
                weightSum += weight;
            }
            result[i] = weightedSum / weightSum;
        }
        return result;
    }

    static hma(prices, period) {
        const halfPeriod = Math.floor(period / 2);
        const sqrtPeriod = Math.floor(Math.sqrt(period));
        
        const wma1 = this.wma(prices, halfPeriod);
        const wma2 = this.wma(prices, period);
        
        const diff = [];
        for (let i = 0; i < prices.length; i++) {
            if (wma1[i] !== undefined && wma2[i] !== undefined) {
                diff[i] = 2 * wma1[i] - wma2[i];
            }
        }
        
        return this.wma(diff.filter(v => v !== undefined), sqrtPeriod);
    }

    // ===== OSCILLATORS =====

    static rsi(prices, period = 14) {
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains[i] = change > 0 ? change : 0;
            losses[i] = change < 0 ? -change : 0;
        }
        
        const avgGains = this.ema(gains, period);
        const avgLosses = this.ema(losses, period);
        
        return avgGains.map((gain, i) => {
            const loss = avgLosses[i];
            return loss === 0 ? 100 : 100 - (100 / (1 + gain / loss));
        });
    }

    static stoch(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
        const k = [];
        
        for (let i = kPeriod - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
            k[i] = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
        }
        
        const d = this.sma(k, dPeriod);
        return { k, d };
    }

    static stochrsi(prices, period = 14, kPeriod = 3, dPeriod = 3) {
        const rsi = this.rsi(prices, period);
        const stochRsi = [];
        
        for (let i = period - 1; i < rsi.length; i++) {
            const slice = rsi.slice(i - period + 1, i + 1).filter(v => v !== undefined);
            if (slice.length > 0) {
                const max = Math.max(...slice);
                const min = Math.min(...slice);
                stochRsi[i] = min === max ? 0 : ((rsi[i] - min) / (max - min)) * 100;
            }
        }
        
        const k = this.sma(stochRsi, kPeriod);
        const d = this.sma(k, dPeriod);
        return { stochRsi, k, d };
    }

    static cci(highs, lows, closes, period = 20) {
        const tp = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
        const smaTP = this.sma(tp, period);
        
        return tp.map((typical, i) => {
            if (smaTP[i] === undefined) return undefined;
            
            const slice = tp.slice(i - period + 1, i + 1);
            const meanDev = slice.reduce((sum, val) => sum + Math.abs(val - smaTP[i]), 0) / period;
            
            return meanDev === 0 ? 0 : (typical - smaTP[i]) / (0.015 * meanDev);
        });
    }

    static mfi(highs, lows, closes, volumes, period = 14) {
        const tp = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
        const mf = tp.map((typical, i) => typical * volumes[i]);
        
        const result = [];
        for (let i = period; i < mf.length; i++) {
            let positiveMF = 0;
            let negativeMF = 0;
            
            for (let j = 1; j <= period; j++) {
                if (tp[i - j + 1] > tp[i - j]) {
                    positiveMF += mf[i - j + 1];
                } else {
                    negativeMF += mf[i - j + 1];
                }
            }
            
            const mfr = positiveMF / negativeMF;
            result[i] = 100 - (100 / (1 + mfr));
        }
        
        return result;
    }

    static williamsR(highs, lows, closes, period = 14) {
        const result = [];
        
        for (let i = period - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
            result[i] = ((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100;
        }
        
        return result;
    }

    // ===== TREND INDICATORS =====

    static macd(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.ema(prices, fastPeriod);
        const slowEMA = this.ema(prices, slowPeriod);
        const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
        const signal = this.ema(macdLine.filter(v => v !== undefined), signalPeriod);
        const histogram = macdLine.map((macd, i) => macd - (signal[i] || 0));
        
        return { macd: macdLine, signal, histogram };
    }

    static adx(highs, lows, closes, period = 14) {
        const tr = this.trueRange({map: (_, i) => ({high: highs[i], low: lows[i], close: i > 0 ? closes[i-1] : closes[i]})});
        const plusDM = [];
        const minusDM = [];
        
        for (let i = 1; i < highs.length; i++) {
            const upMove = highs[i] - highs[i - 1];
            const downMove = lows[i - 1] - lows[i];
            
            plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
            minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
        }
        
        const atr = this.ema(tr.filter(v => v !== undefined), period);
        const plusDI = this.ema(plusDM, period).map((dm, i) => (dm / atr[i]) * 100);
        const minusDI = this.ema(minusDM, period).map((dm, i) => (dm / atr[i]) * 100);
        
        const dx = plusDI.map((plus, i) => {
            const minus = minusDI[i];
            return Math.abs(plus - minus) / (plus + minus) * 100;
        });
        
        const adx = this.ema(dx.filter(v => !isNaN(v)), period);
        
        return { adx, plusDI, minusDI };
    }

    static psar(highs, lows, closes, step = 0.02, max = 0.2) {
        const result = [];
        let trend = 1; // 1 for uptrend, -1 for downtrend
        let sar = lows[0];
        let ep = highs[0]; // extreme point
        let af = step; // acceleration factor
        
        result[0] = sar;
        
        for (let i = 1; i < closes.length; i++) {
            if (trend === 1) {
                sar = sar + af * (ep - sar);
                
                if (highs[i] > ep) {
                    ep = highs[i];
                    af = Math.min(af + step, max);
                }
                
                if (lows[i] < sar) {
                    trend = -1;
                    sar = ep;
                    ep = lows[i];
                    af = step;
                }
            } else {
                sar = sar + af * (ep - sar);
                
                if (lows[i] < ep) {
                    ep = lows[i];
                    af = Math.min(af + step, max);
                }
                
                if (highs[i] > sar) {
                    trend = 1;
                    sar = ep;
                    ep = highs[i];
                    af = step;
                }
            }
            
            result[i] = sar;
        }
        
        return result;
    }

    // ===== VOLATILITY INDICATORS =====

    static tr(candles) {
        return this.trueRange(candles);
    }

    static atr(candles, period = 14) {
        const trueRanges = this.trueRange(candles);
        return this.ema(trueRanges.filter(tr => tr !== undefined), period);
    }

    static bb(prices, period = 20, multiplier = 2) {
        const sma = this.sma(prices, period);
        const std = this.rollingStd(prices, period);
        
        const upper = sma.map((avg, i) => avg + (std[i] * multiplier));
        const lower = sma.map((avg, i) => avg - (std[i] * multiplier));
        
        return { upper, middle: sma, lower };
    }

    static kc(highs, lows, closes, period = 20, multiplier = 2) {
        const ema = this.ema(closes, period);
        const atr = this.atr(highs.map((h, i) => ({high: h, low: lows[i], close: closes[i]})), period);
        
        const upper = ema.map((avg, i) => avg + (atr[i] * multiplier));
        const lower = ema.map((avg, i) => avg - (atr[i] * multiplier));
        
        return { upper, middle: ema, lower };
    }

    // ===== VOLUME INDICATORS =====

    static obv(closes, volumes) {
        const result = [volumes[0]];
        
        for (let i = 1; i < closes.length; i++) {
            if (closes[i] > closes[i - 1]) {
                result[i] = result[i - 1] + volumes[i];
            } else if (closes[i] < closes[i - 1]) {
                result[i] = result[i - 1] - volumes[i];
            } else {
                result[i] = result[i - 1];
            }
        }
        
        return result;
    }

    static ad(highs, lows, closes, volumes) {
        const result = [0];
        
        for (let i = 0; i < closes.length; i++) {
            const clv = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
            const adValue = clv * volumes[i];
            result[i] = (result[i - 1] || 0) + adValue;
        }
        
        return result;
    }

    // ===== MOMENTUM INDICATORS =====

    static mom(prices, period = 10) {
        const result = [];
        for (let i = period; i < prices.length; i++) {
            result[i] = prices[i] - prices[i - period];
        }
        return result;
    }

    static roc(prices, period = 10) {
        const result = [];
        for (let i = period; i < prices.length; i++) {
            result[i] = ((prices[i] - prices[i - period]) / prices[i - period]) * 100;
        }
        return result;
    }

    // ===== UTILITY FUNCTIONS =====

    static crossover(series1, series2) {
        const result = [];
        for (let i = 1; i < Math.min(series1.length, series2.length); i++) {
            result[i] = series1[i] > series2[i] && series1[i - 1] <= series2[i - 1];
        }
        return result;
    }

    static crossunder(series1, series2) {
        const result = [];
        for (let i = 1; i < Math.min(series1.length, series2.length); i++) {
            result[i] = series1[i] < series2[i] && series1[i - 1] >= series2[i - 1];
        }
        return result;
    }

    static highest(values, period) {
        const result = [];
        for (let i = period - 1; i < values.length; i++) {
            result[i] = Math.max(...values.slice(i - period + 1, i + 1));
        }
        return result;
    }

    static lowest(values, period) {
        const result = [];
        for (let i = period - 1; i < values.length; i++) {
            result[i] = Math.min(...values.slice(i - period + 1, i + 1));
        }
        return result;
    }

    static change(values, period = 1) {
        const result = [];
        for (let i = period; i < values.length; i++) {
            result[i] = values[i] - values[i - period];
        }
        return result;
    }

    static rising(values, period = 1) {
        const changes = this.change(values, period);
        return changes.map(c => c > 0);
    }

    static falling(values, period = 1) {
        const changes = this.change(values, period);
        return changes.map(c => c < 0);
    }

    static nz(value, replacement = 0) {
        return value === null || value === undefined || isNaN(value) ? replacement : value;
    }

    static na(value) {
        return value === null || value === undefined || isNaN(value);
    }

    static fixnan(values, replacement = 0) {
        return values.map(v => this.nz(v, replacement));
    }

    // ===== MATH FUNCTIONS =====

    static abs(value) {
        return Math.abs(value);
    }

    static sign(value) {
        return Math.sign(value);
    }

    static round(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    static floor(value) {
        return Math.floor(value);
    }

    static ceil(value) {
        return Math.ceil(value);
    }

    static max(...values) {
        return Math.max(...values.flat());
    }

    static min(...values) {
        return Math.min(...values.flat());
    }

    static pow(base, exponent) {
        return Math.pow(base, exponent);
    }

    static sqrt(value) {
        return Math.sqrt(value);
    }

    static log(value) {
        return Math.log(value);
    }

    static log10(value) {
        return Math.log10(value);
    }

    static exp(value) {
        return Math.exp(value);
    }

    static sin(value) {
        return Math.sin(value);
    }

    static cos(value) {
        return Math.cos(value);
    }

    static tan(value) {
        return Math.tan(value);
    }

    static avg(values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    static sum(values) {
        return values.reduce((a, b) => a + b, 0);
    }

    static stdev(values) {
        const mean = this.avg(values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    static variance(values) {
        const mean = this.avg(values);
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    static correlation(x, y) {
        if (x.length !== y.length) return 0;
        
        const meanX = this.avg(x);
        const meanY = this.avg(y);
        
        let numerator = 0;
        let sumSqX = 0;
        let sumSqY = 0;
        
        for (let i = 0; i < x.length; i++) {
            const deltaX = x[i] - meanX;
            const deltaY = y[i] - meanY;
            
            numerator += deltaX * deltaY;
            sumSqX += deltaX * deltaX;
            sumSqY += deltaY * deltaY;
        }
        
        const denominator = Math.sqrt(sumSqX * sumSqY);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    static dev(values, length) {
        const sma = this.sma(values, length);
        return values.map((val, i) => sma[i] ? Math.abs(val - sma[i]) : 0);
    }

    static percentrank(values, period) {
        const result = [];
        for (let i = period - 1; i < values.length; i++) {
            const slice = values.slice(i - period + 1, i + 1);
            const sorted = [...slice].sort((a, b) => a - b);
            const rank = sorted.indexOf(values[i]);
            result[i] = (rank / (period - 1)) * 100;
        }
        return result;
    }

    // ===== LEGACY FUNCTIONS (for backward compatibility) =====

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

    static smooth(values, smoothingFactor = 3) {
        return this.ema(values, smoothingFactor);
    }

    static ohlc4(candles) {
        return candles.map(candle => 
            (candle.open + candle.high + candle.low + candle.close) / 4
        );
    }

    static hlc3(candles) {
        return candles.map(candle => 
            (candle.high + candle.low + candle.close) / 3
        );
    }

    static hl2(candles) {
        return candles.map(candle => 
            (candle.high + candle.low) / 2
        );
    }

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
