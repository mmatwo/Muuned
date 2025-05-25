/**
 * EMA Differential Strategy Implementation
 * Volatility-adaptive EMA strategy with dynamic period adjustment
 */
class EmaDifferentialStrategy {
    constructor(params = {}) {
        // Strategy parameters with defaults
        this.emaFloor = params.emaFloor || 10;
        this.emaCeiling = params.emaCeiling || 50;
        this.volFloor = params.volFloor || 0.5;
        this.volCeiling = params.volCeiling || 2.0;
        this.smoothLength = params.smoothLength || 3;
        this.voltScale = params.voltScale || 1.0;
        this.forceBuyThreshold = params.forceBuyThreshold || -5.0;
        this.positionSize = params.positionSize || 1.0;
        this.volatilityWindow = params.volatilityWindow || 20;
    }

    /**
     * Calculate dynamic EMA length based on current volatility
     * @param {number} volatilityPct - Volatility as percentage
     * @returns {number} EMA length to use
     */
    calculateDynamicEmaLength(volatilityPct) {
        // Handle NaN values by returning the most conservative (longest) EMA length
        if (isNaN(volatilityPct) || volatilityPct === null || volatilityPct === undefined) {
            return this.emaCeiling;
        }

        if (volatilityPct <= this.volFloor) {
            return this.emaCeiling;
        } else if (volatilityPct >= this.volCeiling) {
            return this.emaFloor;
        }

        // Linear interpolation between floor and ceiling
        const volRange = this.volCeiling - this.volFloor;
        const emaRange = this.emaCeiling - this.emaFloor;

        // Calculate where in the range the current volatility falls
        const volPosition = (volatilityPct - this.volFloor) / volRange;

        // Inverse the position (higher volatility = lower EMA)
        const adjustedPosition = 1 - volPosition;

        // Calculate EMA length
        const emaLength = this.emaFloor + (adjustedPosition * emaRange);

        return Math.round(emaLength);
    }

    /**
     * Calculate trading signals using pre-calculated price arrays
     * @param {Array} signalPrices - Pre-calculated OHLC4 prices
     * @param {Array} executionPrices - Pre-calculated close prices
     * @returns {Object} Signal data with indicators and signals (lightweight)
     */
    calculateSignals(signalPrices, executionPrices) {
        // Use pre-calculated arrays instead of recalculating
        const prices = signalPrices;
        const execPrices = executionPrices;

        // Calculate rolling volatility
        const volatility = TechnicalIndicators.rollingStd(prices, this.volatilityWindow);
        
        // Calculate volatility as percentage of price
        const volatilityPct = volatility.map((vol, i) => {
            if (vol !== undefined && prices[i] > 0) {
                return (vol / prices[i]) * 100;
            }
            return undefined;
        });

        // Calculate dynamic EMA lengths
        const emaLengths = volatilityPct.map(volPct => 
            this.calculateDynamicEmaLength(volPct)
        );

        // Calculate dynamic EMAs
        const ema = this.calculateDynamicEMA(prices, emaLengths);

        // Calculate differential as percentage
        const rawDiff = prices.map((price, i) => {
            if (ema[i] !== undefined && ema[i] > 0) {
                return ((price - ema[i]) / ema[i]) * 100 * this.voltScale;
            }
            return undefined;
        });

        // Smooth the differential
        const validRawDiff = rawDiff.filter(val => val !== undefined);
        const smoothedValid = TechnicalIndicators.smooth(validRawDiff, this.smoothLength);
        
        // Map smoothed values back to original array positions
        let smoothIndex = 0;
        const smoothDiff = rawDiff.map(val => {
            if (val !== undefined) {
                return smoothedValid[smoothIndex++];
            }
            return undefined;
        });

        // Generate trading signals
        const signals = smoothDiff.map(smoothDiff => {
            if (smoothDiff === undefined) return 0;
            
            if (smoothDiff > 0 || smoothDiff <= this.forceBuyThreshold) {
                return 1; // Buy signal
            } else if (smoothDiff < 0) {
                return -1; // Sell signal
            }
            return 0; // No signal
        });

        // Return lightweight result - only signals array for backtesting
        // Don't store heavy arrays to prevent memory accumulation
        return {
            signals: signals,
            signalCount: signals.filter(s => s !== 0).length,
            length: signals.length
        };
    }

    /**
     * Calculate dynamic EMA with varying periods
     * @param {Array} prices - Price array
     * @param {Array} periods - Array of EMA periods for each price point
     * @returns {Array} Dynamic EMA values
     */
    calculateDynamicEMA(prices, periods) {
        const result = [];
        
        // Start with longest period for initial calculation
        const maxPeriod = Math.max(...periods.filter(p => !isNaN(p)));
        let ema = TechnicalIndicators.ema(prices, maxPeriod);
        
        for (let i = 0; i < prices.length; i++) {
            const period = periods[i];
            
            if (period && i >= this.volatilityWindow && i >= period - 1) {
                // Calculate EMA for current window with dynamic period
                const startIdx = Math.max(0, i - period + 1);
                const priceSlice = prices.slice(startIdx, i + 1);
                
                if (priceSlice.length >= period) {
                    const localEma = TechnicalIndicators.ema(priceSlice, period);
                    result[i] = localEma[localEma.length - 1];
                } else if (ema[i] !== undefined) {
                    result[i] = ema[i];
                }
            } else if (ema[i] !== undefined) {
                result[i] = ema[i];
            }
        }
        
        return result;
    }

    /**
     * Get strategy parameters as object
     * @returns {Object} Current strategy parameters
     */
    getParameters() {
        return {
            emaFloor: this.emaFloor,
            emaCeiling: this.emaCeiling,
            volFloor: this.volFloor,
            volCeiling: this.volCeiling,
            smoothLength: this.smoothLength,
            voltScale: this.voltScale,
            forceBuyThreshold: this.forceBuyThreshold,
            positionSize: this.positionSize,
            volatilityWindow: this.volatilityWindow
        };
    }

    /**
     * Update strategy parameters
     * @param {Object} newParams - New parameter values
     */
    updateParameters(newParams) {
        Object.keys(newParams).forEach(key => {
            if (this.hasOwnProperty(key)) {
                this[key] = newParams[key];
            }
        });
    }

    /**
     * Validate strategy parameters
     * @returns {Object} Validation result with isValid flag and errors
     */
    validateParameters() {
        const errors = [];
        
        if (this.emaFloor >= this.emaCeiling) {
            errors.push('EMA floor must be less than EMA ceiling');
        }
        
        if (this.volFloor >= this.volCeiling) {
            errors.push('Volatility floor must be less than volatility ceiling');
        }
        
        if (this.emaFloor < 1) {
            errors.push('EMA floor must be at least 1');
        }
        
        if (this.smoothLength < 1) {
            errors.push('Smooth length must be at least 1');
        }
        
        if (this.positionSize <= 0 || this.positionSize > 1) {
            errors.push('Position size must be between 0 and 1');
        }
        
        if (this.forceBuyThreshold > 0) {
            errors.push('Force buy threshold should be negative');
        }
        
        if (this.volatilityWindow < 1) {
            errors.push('Volatility window must be at least 1');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get strategy description
     * @returns {string} Human-readable strategy description
     */
    getDescription() {
        return `EMA Differential Strategy with dynamic period adjustment based on volatility. 
                EMA periods range from ${this.emaFloor} to ${this.emaCeiling} based on volatility 
                thresholds of ${this.volFloor}% to ${this.volCeiling}%. Signals are smoothed 
                over ${this.smoothLength} periods with a force buy threshold at ${this.forceBuyThreshold}%.`;
    }

    /**
     * Create a copy of the strategy with new parameters
     * @param {Object} newParams - Parameters for the new strategy instance
     * @returns {EmaDifferentialStrategy} New strategy instance
     */
    clone(newParams = {}) {
        const params = { ...this.getParameters(), ...newParams };
        return new EmaDifferentialStrategy(params);
    }
}