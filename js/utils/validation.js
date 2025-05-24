/**
 * Validation Utilities
 * Input validation functions for the Muuned application
 */
class ValidationUtils {
    
    /**
     * Validate trading symbol format
     * @param {string} symbol - Trading symbol to validate
     * @returns {Object} Validation result
     */
    static validateSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') {
            return { isValid: false, error: 'Symbol is required' };
        }
        
        const validSymbol = symbol.toUpperCase().trim();
        const validQuotes = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD'];
        
        if (!validQuotes.some(quote => validSymbol.endsWith(quote))) {
            return { 
                isValid: false, 
                error: `Symbol must end with one of: ${validQuotes.join(', ')}` 
            };
        }
        
        if (validSymbol.length < 6 || validSymbol.length > 12) {
            return { 
                isValid: false, 
                error: 'Symbol length must be between 6 and 12 characters' 
            };
        }
        
        return { isValid: true, value: validSymbol };
    }

    /**
     * Validate date range
     * @param {string} startDate - Start date string
     * @param {string} endDate - End date string
     * @returns {Object} Validation result
     */
    static validateDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        const minDate = new Date('2017-01-01'); // Binance data availability
        
        if (isNaN(start.getTime())) {
            return { isValid: false, error: 'Invalid start date' };
        }
        
        if (isNaN(end.getTime())) {
            return { isValid: false, error: 'Invalid end date' };
        }
        
        if (start >= end) {
            return { isValid: false, error: 'Start date must be before end date' };
        }
        
        if (end > today) {
            return { isValid: false, error: 'End date cannot be in the future' };
        }
        
        if (start < minDate) {
            return { 
                isValid: false, 
                error: 'Start date too early (Binance data available from 2017)' 
            };
        }
        
        // Check if date range is reasonable (not too large)
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
        if (daysDiff > 1095) { // 3 years
            return { 
                isValid: false, 
                error: 'Date range too large (maximum 3 years)' 
            };
        }
        
        if (daysDiff < 1) {
            return { 
                isValid: false, 
                error: 'Date range too small (minimum 1 day)' 
            };
        }
        
        return { isValid: true, startDate: start, endDate: end, days: daysDiff };
    }

    /**
     * Validate parameter array string
     * @param {string} paramString - Comma-separated parameter values
     * @param {Object} constraints - Validation constraints
     * @returns {Object} Validation result
     */
    static validateParameterArray(paramString, constraints = {}) {
        if (!paramString || typeof paramString !== 'string') {
            return { isValid: false, error: 'Parameter string is required' };
        }
        
        const trimmed = paramString.trim();
        if (trimmed === '') {
            return { isValid: false, error: 'Parameter string cannot be empty' };
        }
        
        // Parse values
        let values;
        try {
            values = trimmed.split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0)
                .map(v => parseFloat(v));
        } catch (error) {
            return { isValid: false, error: 'Invalid parameter format' };
        }
        
        if (values.length === 0) {
            return { isValid: false, error: 'At least one parameter value required' };
        }
        
        // Check for NaN values
        if (values.some(v => isNaN(v))) {
            return { isValid: false, error: 'All parameter values must be numbers' };
        }
        
        // Apply constraints
        const { min, max, maxCount, allowNegative = true, allowZero = true } = constraints;
        
        if (maxCount && values.length > maxCount) {
            return { 
                isValid: false, 
                error: `Too many values (maximum ${maxCount})` 
            };
        }
        
        if (min !== undefined && values.some(v => v < min)) {
            return { 
                isValid: false, 
                error: `All values must be >= ${min}` 
            };
        }
        
        if (max !== undefined && values.some(v => v > max)) {
            return { 
                isValid: false, 
                error: `All values must be <= ${max}` 
            };
        }
        
        if (!allowNegative && values.some(v => v < 0)) {
            return { 
                isValid: false, 
                error: 'Negative values not allowed' 
            };
        }
        
        if (!allowZero && values.some(v => v === 0)) {
            return { 
                isValid: false, 
                error: 'Zero values not allowed' 
            };
        }
        
        return { isValid: true, values };
    }

    /**
     * Validate EMA parameters
     * @param {string} floorString - EMA floor values
     * @param {string} ceilingString - EMA ceiling values
     * @returns {Object} Validation result
     */
    static validateEMAParameters(floorString, ceilingString) {
        const floorResult = this.validateParameterArray(floorString, {
            min: 1,
            max: 200,
            maxCount: 10,
            allowNegative: false,
            allowZero: false
        });
        
        if (!floorResult.isValid) {
            return { isValid: false, error: `EMA Floor: ${floorResult.error}` };
        }
        
        const ceilingResult = this.validateParameterArray(ceilingString, {
            min: 1,
            max: 200,
            maxCount: 10,
            allowNegative: false,
            allowZero: false
        });
        
        if (!ceilingResult.isValid) {
            return { isValid: false, error: `EMA Ceiling: ${ceilingResult.error}` };
        }
        
        // Check that all floor values are less than ceiling values
        const minCeiling = Math.min(...ceilingResult.values);
        const maxFloor = Math.max(...floorResult.values);
        
        if (maxFloor >= minCeiling) {
            return { 
                isValid: false, 
                error: 'All EMA floor values must be less than all ceiling values' 
            };
        }
        
        return { 
            isValid: true, 
            floor: floorResult.values, 
            ceiling: ceilingResult.values 
        };
    }

    /**
     * Validate volatility parameters
     * @param {string} floorString - Volatility floor values
     * @param {string} ceilingString - Volatility ceiling values
     * @returns {Object} Validation result
     */
    static validateVolatilityParameters(floorString, ceilingString) {
        const floorResult = this.validateParameterArray(floorString, {
            min: 0,
            max: 20,
            maxCount: 10,
            allowNegative: false
        });
        
        if (!floorResult.isValid) {
            return { isValid: false, error: `Volatility Floor: ${floorResult.error}` };
        }
        
        const ceilingResult = this.validateParameterArray(ceilingString, {
            min: 0,
            max: 20,
            maxCount: 10,
            allowNegative: false
        });
        
        if (!ceilingResult.isValid) {
            return { isValid: false, error: `Volatility Ceiling: ${ceilingResult.error}` };
        }
        
        // Check that all floor values are less than ceiling values
        const minCeiling = Math.min(...ceilingResult.values);
        const maxFloor = Math.max(...floorResult.values);
        
        if (maxFloor >= minCeiling) {
            return { 
                isValid: false, 
                error: 'All volatility floor values must be less than all ceiling values' 
            };
        }
        
        return { 
            isValid: true, 
            floor: floorResult.values, 
            ceiling: ceilingResult.values 
        };
    }

    /**
     * Validate numeric input
     * @param {*} value - Value to validate
     * @param {Object} constraints - Validation constraints
     * @returns {Object} Validation result
     */
    static validateNumeric(value, constraints = {}) {
        const { min, max, allowNegative = true, allowZero = true, required = true } = constraints;
        
        if (value === '' || value === null || value === undefined) {
            if (required) {
                return { isValid: false, error: 'Value is required' };
            }
            return { isValid: true, value: null };
        }
        
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            return { isValid: false, error: 'Value must be a number' };
        }
        
        if (!allowNegative && numValue < 0) {
            return { isValid: false, error: 'Negative values not allowed' };
        }
        
        if (!allowZero && numValue === 0) {
            return { isValid: false, error: 'Zero values not allowed' };
        }
        
        if (min !== undefined && numValue < min) {
            return { isValid: false, error: `Value must be >= ${min}` };
        }
        
        if (max !== undefined && numValue > max) {
            return { isValid: false, error: `Value must be <= ${max}` };
        }
        
        return { isValid: true, value: numValue };
    }

    /**
     * Validate strategy parameters
     * @param {Object} params - Strategy parameters object
     * @returns {Object} Validation result
     */
    static validateStrategyParameters(params) {
        const errors = [];
        
        // Validate EMA parameters
        const emaResult = this.validateEMAParameters(params.emaFloor, params.emaCeiling);
        if (!emaResult.isValid) {
            errors.push(emaResult.error);
        }
        
        // Validate volatility parameters
        const volResult = this.validateVolatilityParameters(params.volFloor, params.volCeiling);
        if (!volResult.isValid) {
            errors.push(volResult.error);
        }
        
        // Validate smooth length
        const smoothResult = this.validateParameterArray(params.smoothLength, {
            min: 1,
            max: 20,
            maxCount: 5,
            allowNegative: false,
            allowZero: false
        });
        if (!smoothResult.isValid) {
            errors.push(`Smooth Length: ${smoothResult.error}`);
        }
        
        // Validate force buy threshold
        const thresholdResult = this.validateParameterArray(params.forceBuyThreshold, {
            min: -100,
            max: 0,
            maxCount: 10
        });
        if (!thresholdResult.isValid) {
            errors.push(`Force Buy Threshold: ${thresholdResult.error}`);
        }
        
        // Validate position size
        const positionResult = this.validateNumeric(params.positionSize, {
            min: 0.1,
            max: 1.0,
            allowNegative: false,
            allowZero: false
        });
        if (!positionResult.isValid) {
            errors.push(`Position Size: ${positionResult.error}`);
        }
        
        // Validate fees and slippage
        const feesResult = this.validateNumeric(params.feesSlippage, {
            min: 0,
            max: 10,
            allowNegative: false
        });
        if (!feesResult.isValid) {
            errors.push(`Fees & Slippage: ${feesResult.error}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Calculate estimated parameter combinations
     * @param {Object} params - Strategy parameters
     * @returns {number} Number of combinations
     */
    static calculateParameterCombinations(params) {
        let total = 1;
        
        Object.keys(params).forEach(key => {
            if (typeof params[key] === 'string' && params[key].includes(',')) {
                const values = params[key].split(',').filter(v => v.trim() !== '');
                total *= values.length;
            }
        });
        
        return total;
    }

    /**
     * Validate combination count is reasonable
     * @param {number} combinations - Number of combinations
     * @returns {Object} Validation result
     */
    static validateCombinationCount(combinations) {
        if (combinations === 0) {
            return { isValid: false, error: 'No parameter combinations to test' };
        }
        
        if (combinations > 50000) {
            return { 
                isValid: false, 
                error: `Too many combinations (${combinations.toLocaleString()}). Maximum 50,000 allowed.` 
            };
        }
        
        if (combinations > 10000) {
            return { 
                isValid: true, 
                warning: `Large number of combinations (${combinations.toLocaleString()}). Consider reducing parameters for faster execution.` 
            };
        }
        
        return { isValid: true };
    }

    /**
     * Sanitize string input
     * @param {string} input - Input string
     * @returns {string} Sanitized string
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>\"'&]/g, '');
    }

    /**
     * Validate file upload
     * @param {File} file - File object
     * @param {Object} constraints - File constraints
     * @returns {Object} Validation result
     */
    static validateFile(file, constraints = {}) {
        const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = constraints; // 10MB default
        
        if (!file) {
            return { isValid: false, error: 'No file selected' };
        }
        
        if (file.size > maxSize) {
            return { 
                isValid: false, 
                error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum ${(maxSize / 1024 / 1024).toFixed(1)}MB allowed.` 
            };
        }
        
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            return { 
                isValid: false, 
                error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
            };
        }
        
        return { isValid: true };
    }
}