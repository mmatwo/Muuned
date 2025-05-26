/**
 * Custom Script Strategy
 * Executes user-defined JavaScript code to generate trading signals
 */
class CustomScriptStrategy {
    constructor(scriptEditor, params = {}) {
        this.scriptEditor = scriptEditor;
        this.params = params;
    }

    /**
     * Calculate trading signals using user's custom script
     * @param {Array} signalPrices - Pre-calculated OHLC4 prices
     * @param {Array} executionPrices - Pre-calculated close prices
     * @returns {Object} Signal data with indicators and signals (lightweight)
     */
    calculateSignals(signalPrices, executionPrices) {
        try {
            // console.log(`[Muuned] CustomScriptStrategy.calculateSignals called with:`);
            // console.log('signalPrices type:', typeof signalPrices, 'isArray:', Array.isArray(signalPrices));
            // console.log('executionPrices type:', typeof executionPrices, 'isArray:', Array.isArray(executionPrices));
            // console.log('this.params:', this.params);
            
            // Validate inputs
            if (!Array.isArray(signalPrices) || !Array.isArray(executionPrices)) {
                throw new Error('signalPrices and executionPrices must be arrays');
            }
            
            if (signalPrices.length !== executionPrices.length) {
                throw new Error('signalPrices and executionPrices must have the same length');
            }
            
            // Execute the user's script with the correct parameter order
            const result = this.scriptEditor.executeScript(signalPrices, executionPrices, this.params);
            
            // console.log(`[Muuned] Custom script generated ${result.signalCount} signals from ${result.length} candles`);
            
            return result;
            
        } catch (error) {
            console.error('[Muuned] Custom script execution failed:', error);
            console.error('Received signalPrices:', signalPrices);
            console.error('Received executionPrices:', executionPrices);
            console.error('Params:', this.params);
            throw new Error(`Strategy script failed: ${error.message}`);
        }
    }

    /**
     * Get strategy parameters
     * @returns {Object} Current strategy parameters
     */
    getParameters() {
        return this.params;
    }

    /**
     * Update strategy parameters
     * @param {Object} newParams - New parameter values
     */
    updateParameters(newParams) {
        this.params = { ...this.params, ...newParams };
    }

    /**
     * Get strategy description
     * @returns {string} Description of the custom strategy
     */
    getDescription() {
        return 'Custom JavaScript strategy with user-defined signal generation logic.';
    }

    /**
     * Validate strategy parameters (basic validation)
     * @returns {Object} Validation result
     */
    validateParameters() {
        // Basic validation - custom scripts can define their own parameter requirements
        return {
            isValid: true,
            errors: []
        };
    }

    /**
     * Get the current script content
     * @returns {string} Current script
     */
    getScript() {
        return this.scriptEditor.getCurrentScript();
    }

    /**
     * Create a copy of the strategy with new parameters
     * @param {Object} newParams - Parameters for the new strategy instance
     * @returns {CustomScriptStrategy} New strategy instance
     */
    clone(newParams = {}) {
        const params = { ...this.params, ...newParams };
        return new CustomScriptStrategy(this.scriptEditor, params);
    }
}