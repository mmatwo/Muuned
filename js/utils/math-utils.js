/**
 * Mathematical Utilities
 * Common mathematical functions for backtesting and analysis
 */
class MathUtils {
    
    /**
     * Calculate mean of an array
     * @param {Array<number>} values - Array of numbers
     * @returns {number} Mean value
     */
    static mean(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate standard deviation
     * @param {Array<number>} values - Array of numbers
     * @param {boolean} sample - Whether to use sample standard deviation
     * @returns {number} Standard deviation
     */
    static standardDeviation(values, sample = false) {
        if (!values || values.length === 0) return 0;
        
        const mean = this.mean(values);
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = this.mean(squaredDiffs);
        
        // Use sample standard deviation (n-1) if specified
        if (sample && values.length > 1) {
            return Math.sqrt(avgSquaredDiff * values.length / (values.length - 1));
        }
        
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Calculate Sharpe ratio
     * @param {Array<number>} returns - Array of return values
     * @param {number} riskFreeRate - Risk-free rate (default 0)
     * @returns {number} Sharpe ratio
     */
    static sharpeRatio(returns, riskFreeRate = 0) {
        if (!returns || returns.length === 0) return 0;
        
        const excessReturns = returns.map(ret => ret - riskFreeRate);
        const meanExcessReturn = this.mean(excessReturns);
        const stdDev = this.standardDeviation(excessReturns);
        
        return stdDev === 0 ? 0 : meanExcessReturn / stdDev;
    }

    /**
     * Calculate maximum value in array
     * @param {Array<number>} values - Array of numbers
     * @returns {number} Maximum value
     */
    static max(values) {
        if (!values || values.length === 0) return 0;
        return Math.max(...values);
    }

    /**
     * Calculate minimum value in array
     * @param {Array<number>} values - Array of numbers
     * @returns {number} Minimum value
     */
    static min(values) {
        if (!values || values.length === 0) return 0;
        return Math.min(...values);
    }

    /**
     * Calculate percentile of a value in an array
     * @param {Array<number>} values - Sorted array of numbers
     * @param {number} value - Value to find percentile for
     * @returns {number} Percentile (0-100)
     */
    static percentile(values, value) {
        if (!values || values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = sorted.findIndex(v => v >= value);
        
        if (index === -1) return 100;
        if (index === 0) return 0;
        
        return (index / sorted.length) * 100;
    }

    /**
     * Calculate correlation coefficient between two arrays
     * @param {Array<number>} x - First array
     * @param {Array<number>} y - Second array
     * @returns {number} Correlation coefficient (-1 to 1)
     */
    static correlation(x, y) {
        if (!x || !y || x.length !== y.length || x.length === 0) return 0;
        
        const meanX = this.mean(x);
        const meanY = this.mean(y);
        
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

    /**
     * Calculate linear regression
     * @param {Array<number>} x - Independent variable
     * @param {Array<number>} y - Dependent variable
     * @returns {Object} Regression results {slope, intercept, r2}
     */
    static linearRegression(x, y) {
        if (!x || !y || x.length !== y.length || x.length === 0) {
            return { slope: 0, intercept: 0, r2: 0 };
        }
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate R-squared
        const meanY = sumY / n;
        const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
        const residualSumSquares = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        
        const r2 = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);
        
        return { slope, intercept, r2 };
    }

    /**
     * Normalize values to 0-1 range
     * @param {Array<number>} values - Array of numbers
     * @returns {Array<number>} Normalized values
     */
    static normalize(values) {
        if (!values || values.length === 0) return [];
        
        const minVal = this.min(values);
        const maxVal = this.max(values);
        const range = maxVal - minVal;
        
        if (range === 0) return values.map(() => 0);
        
        return values.map(val => (val - minVal) / range);
    }

    /**
     * Calculate compound annual growth rate (CAGR)
     * @param {number} beginningValue - Starting value
     * @param {number} endingValue - Ending value
     * @param {number} periods - Number of periods (years)
     * @returns {number} CAGR as percentage
     */
    static cagr(beginningValue, endingValue, periods) {
        if (beginningValue <= 0 || periods <= 0) return 0;
        return (Math.pow(endingValue / beginningValue, 1 / periods) - 1) * 100;
    }

    /**
     * Calculate maximum drawdown from peak to trough
     * @param {Array<number>} values - Array of portfolio values
     * @returns {Object} {maxDrawdown, maxDrawdownPercent, peakIndex, troughIndex}
     */
    static calculateDrawdown(values) {
        if (!values || values.length === 0) {
            return { maxDrawdown: 0, maxDrawdownPercent: 0, peakIndex: -1, troughIndex: -1 };
        }

        let peak = values[0];
        let peakIndex = 0;
        let maxDrawdown = 0;
        let maxDrawdownPercent = 0;
        let troughIndex = 0;

        for (let i = 1; i < values.length; i++) {
            if (values[i] > peak) {
                peak = values[i];
                peakIndex = i;
            }

            const drawdown = peak - values[i];
            const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
                maxDrawdownPercent = drawdownPercent;
                troughIndex = i;
            }
        }

        return { maxDrawdown, maxDrawdownPercent, peakIndex, troughIndex };
    }

    /**
     * Calculate Value at Risk (VaR)
     * @param {Array<number>} returns - Array of return values
     * @param {number} confidenceLevel - Confidence level (e.g., 0.05 for 95% VaR)
     * @returns {number} VaR value
     */
    static valueAtRisk(returns, confidenceLevel = 0.05) {
        if (!returns || returns.length === 0) return 0;
        
        const sorted = [...returns].sort((a, b) => a - b);
        const index = Math.floor(returns.length * confidenceLevel);
        
        return sorted[Math.max(0, index)];
    }

    /**
     * Calculate rolling statistics
     * @param {Array<number>} values - Array of values
     * @param {number} window - Rolling window size
     * @param {Function} statFunction - Function to calculate (e.g., mean, standardDeviation)
     * @returns {Array<number>} Rolling statistics
     */
    static rollingStatistic(values, window, statFunction) {
        if (!values || values.length === 0 || window <= 0) return [];
        
        const result = [];
        
        for (let i = window - 1; i < values.length; i++) {
            const slice = values.slice(i - window + 1, i + 1);
            result[i] = statFunction(slice);
        }
        
        return result;
    }

    /**
     * Calculate Z-score
     * @param {number} value - Value to normalize
     * @param {number} mean - Mean of distribution
     * @param {number} stdDev - Standard deviation of distribution
     * @returns {number} Z-score
     */
    static zScore(value, mean, stdDev) {
        if (stdDev === 0) return 0;
        return (value - mean) / stdDev;
    }

    /**
     * Check if number is valid (not NaN, not infinite)
     * @param {*} value - Value to check
     * @returns {boolean} True if valid number
     */
    static isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Clamp value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Round to specified decimal places
     * @param {number} value - Value to round
     * @param {number} decimals - Number of decimal places
     * @returns {number} Rounded value
     */
    static round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    }

    /**
     * Calculate percentage change
     * @param {number} oldValue - Original value
     * @param {number} newValue - New value
     * @returns {number} Percentage change
     */
    static percentChange(oldValue, newValue) {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }

    /**
     * Calculate compound interest
     * @param {number} principal - Initial amount
     * @param {number} rate - Interest rate (as decimal)
     * @param {number} periods - Number of compounding periods
     * @returns {number} Final amount
     */
    static compoundInterest(principal, rate, periods) {
        return principal * Math.pow(1 + rate, periods);
    }
}