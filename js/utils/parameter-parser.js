/**
 * Parameter Parser
 * Discovers parameters used in strategy scripts and generates form fields
 */
class ParameterParser {
    constructor() {
        this.knownParameters = new Map();
        this.initializeKnownParameters();
    }

    /**
     * Initialize known parameter definitions with their metadata
     */
    initializeKnownParameters() {
        // Define known parameters with their validation rules and descriptions
        this.knownParameters.set('emaFloor', {
            type: 'array',
            label: 'EMA Floor',
            description: 'Shortest EMA periods to test',
            defaultValue: '5,10,15,20',
            validation: { min: 1, max: 200, maxCount: 10 },
            category: 'EMA'
        });
        
        this.knownParameters.set('emaCeiling', {
            type: 'array',
            label: 'EMA Ceiling',
            description: 'Longest EMA periods to test',
            defaultValue: '30,40,50,60',
            validation: { min: 1, max: 200, maxCount: 10 },
            category: 'EMA'
        });
        
        this.knownParameters.set('volFloor', {
            type: 'array',
            label: 'Volatility Floor',
            description: 'Low volatility threshold values',
            defaultValue: '0.5,1.0',
            validation: { min: 0, max: 20, maxCount: 10 },
            category: 'Volatility'
        });
        
        this.knownParameters.set('volCeiling', {
            type: 'array',
            label: 'Volatility Ceiling',
            description: 'High volatility threshold values',
            defaultValue: '1.5,2.0',
            validation: { min: 0, max: 20, maxCount: 10 },
            category: 'Volatility'
        });
        
        this.knownParameters.set('smoothLength', {
            type: 'array',
            label: 'Smooth Length',
            description: 'Signal smoothing periods',
            defaultValue: '2,3',
            validation: { min: 1, max: 20, maxCount: 5 },
            category: 'Signal'
        });
        
        this.knownParameters.set('forceBuyThreshold', {
            type: 'array',
            label: 'Force Buy Threshold',
            description: 'Extreme negative signal levels to force buy',
            defaultValue: '-5,-6,-7',
            validation: { min: -100, max: 0, maxCount: 10 },
            category: 'Signal'
        });
        
        this.knownParameters.set('voltScale', {
            type: 'array',
            label: 'Volatility Scale',
            description: 'Volatility scaling factor',
            defaultValue: '1.0',
            validation: { min: 0.1, max: 5.0, maxCount: 5 },
            category: 'Signal'
        });
        
        this.knownParameters.set('positionSize', {
            type: 'array',
            label: 'Position Size',
            description: 'Fraction of position to trade',
            defaultValue: '1.0',
            validation: { min: 0.1, max: 1.0, maxCount: 5 },
            category: 'Risk'
        });
        
        this.knownParameters.set('volatilityWindow', {
            type: 'single',
            label: 'Volatility Window',
            description: 'Rolling window for volatility calculation',
            defaultValue: 20,
            validation: { min: 5, max: 100 },
            category: 'Technical'
        });
        
        this.knownParameters.set('feesSlippage', {
            type: 'single',
            label: 'Fees + Slippage (%)',
            description: 'Combined fees and slippage percentage',
            defaultValue: 0.1,
            validation: { min: 0, max: 5 },
            category: 'Risk'
        });

        // Common technical analysis parameters
        this.knownParameters.set('fastMA', {
            type: 'array',
            label: 'Fast MA Period',
            description: 'Fast moving average periods',
            defaultValue: '5,10,15',
            validation: { min: 1, max: 50, maxCount: 10 },
            category: 'MA'
        });
        
        this.knownParameters.set('slowMA', {
            type: 'array',
            label: 'Slow MA Period',
            description: 'Slow moving average periods',
            defaultValue: '20,30,40',
            validation: { min: 1, max: 200, maxCount: 10 },
            category: 'MA'
        });
        
        this.knownParameters.set('rsiPeriod', {
            type: 'array',
            label: 'RSI Period',
            description: 'RSI calculation periods',
            defaultValue: '14,21',
            validation: { min: 2, max: 100, maxCount: 10 },
            category: 'Oscillators'
        });
        
        this.knownParameters.set('rsiOverbought', {
            type: 'array',
            label: 'RSI Overbought',
            description: 'RSI overbought threshold levels',
            defaultValue: '70,75,80',
            validation: { min: 50, max: 95, maxCount: 10 },
            category: 'Oscillators'
        });
        
        this.knownParameters.set('rsiOversold', {
            type: 'array',
            label: 'RSI Oversold',
            description: 'RSI oversold threshold levels',
            defaultValue: '20,25,30',
            validation: { min: 5, max: 50, maxCount: 10 },
            category: 'Oscillators'
        });
    }

    /**
     * Parse script to discover used parameters
     * @param {string} script - Strategy script content
     * @returns {Array} Array of discovered parameters
     */
    discoverParameters(script) {
        const discoveredParams = new Set();
        const unknownParams = new Set();
        
        // Look for params.parameterName patterns
        const paramRegex = /params\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;
        
        while ((match = paramRegex.exec(script)) !== null) {
            const paramName = match[1];
            discoveredParams.add(paramName);
            
            if (!this.knownParameters.has(paramName)) {
                unknownParams.add(paramName);
            }
        }
        
        // Create parameter definitions
        const parameters = [];
        
        for (const paramName of discoveredParams) {
            if (this.knownParameters.has(paramName)) {
                const definition = this.knownParameters.get(paramName);
                parameters.push({
                    name: paramName,
                    ...definition,
                    isKnown: true
                });
            } else {
                // Create default definition for unknown parameters
                parameters.push({
                    name: paramName,
                    type: 'array',
                    label: this.generateLabel(paramName),
                    description: `Custom parameter: ${paramName}`,
                    defaultValue: '1.0',
                    validation: { min: -1000, max: 1000, maxCount: 10 },
                    category: 'Custom',
                    isKnown: false
                });
            }
        }
        
        // Sort parameters by category and name
        parameters.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.label.localeCompare(b.label);
        });
        
        return {
            parameters,
            unknownCount: unknownParams.size,
            totalCount: discoveredParams.size
        };
    }

    /**
     * Generate human-readable label from parameter name
     * @param {string} paramName - Parameter name in camelCase
     * @returns {string} Human-readable label
     */
    generateLabel(paramName) {
        return paramName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Validate parameter combinations make sense
     * @param {Array} parameters - Discovered parameters
     * @returns {Array} Array of validation warnings
     */
    validateParameterCombinations(parameters) {
        const warnings = [];
        const paramNames = parameters.map(p => p.name);
        
        // Check for EMA floor/ceiling without both
        if (paramNames.includes('emaFloor') && !paramNames.includes('emaCeiling')) {
            warnings.push('EMA Floor found without EMA Ceiling - consider adding emaCeiling parameter');
        }
        if (paramNames.includes('emaCeiling') && !paramNames.includes('emaFloor')) {
            warnings.push('EMA Ceiling found without EMA Floor - consider adding emaFloor parameter');
        }
        
        // Check for volatility floor/ceiling without both
        if (paramNames.includes('volFloor') && !paramNames.includes('volCeiling')) {
            warnings.push('Volatility Floor found without Volatility Ceiling - consider adding volCeiling parameter');
        }
        if (paramNames.includes('volCeiling') && !paramNames.includes('volFloor')) {
            warnings.push('Volatility Ceiling found without Volatility Floor - consider adding volFloor parameter');
        }
        
        // Check for RSI parameters
        if (paramNames.includes('rsiPeriod') && !paramNames.includes('rsiOverbought') && !paramNames.includes('rsiOversold')) {
            warnings.push('RSI Period found without overbought/oversold levels - consider adding rsiOverbought and rsiOversold parameters');
        }
        
        // Check for fast/slow MA
        if (paramNames.includes('fastMA') && !paramNames.includes('slowMA')) {
            warnings.push('Fast MA found without Slow MA - consider adding slowMA parameter');
        }
        if (paramNames.includes('slowMA') && !paramNames.includes('fastMA')) {
            warnings.push('Slow MA found without Fast MA - consider adding fastMA parameter');
        }
        
        return warnings;
    }

    /**
     * Generate form configuration for discovered parameters
     * @param {Array} parameters - Discovered parameters
     * @returns {Object} Form configuration
     */
    generateFormConfig(parameters) {
        const categories = {};
        
        // Group parameters by category
        for (const param of parameters) {
            if (!categories[param.category]) {
                categories[param.category] = [];
            }
            categories[param.category].push(param);
        }
        
        return {
            categories,
            totalParameters: parameters.length,
            hasUnknownParameters: parameters.some(p => !p.isKnown)
        };
    }

    /**
     * Add a new parameter definition
     * @param {string} name - Parameter name
     * @param {Object} definition - Parameter definition
     */
    addParameterDefinition(name, definition) {
        this.knownParameters.set(name, definition);
    }

    /**
     * Get parameter definition by name
     * @param {string} name - Parameter name
     * @returns {Object|null} Parameter definition or null
     */
    getParameterDefinition(name) {
        return this.knownParameters.get(name) || null;
    }

    /**
     * Estimate parameter combinations count
     * @param {Array} parameters - Parameter list with current values
     * @returns {number} Estimated combinations
     */
    estimateParameterCombinations(parameters) {
        let total = 1;
        
        for (const param of parameters) {
            if (param.type === 'array' && param.currentValue) {
                const values = param.currentValue.split(',').filter(v => v.trim() !== '');
                total *= Math.max(1, values.length);
            }
        }
        
        return total;
    }

    /**
     * Generate example script using common parameters
     * @param {Array} parameterNames - List of parameter names to include
     * @returns {string} Example script
     */
    generateExampleScript(parameterNames = []) {
        if (parameterNames.includes('fastMA') && parameterNames.includes('slowMA')) {
            return this.getMACrossoverExample();
        } else if (parameterNames.includes('rsiPeriod')) {
            return this.getRSIExample();
        } else {
            return this.getBasicExample();
        }
    }

    /**
     * Get MA crossover example script
     */
    getMACrossoverExample() {
        return `// Moving Average Crossover Strategy
const fastPeriod = params.fastMA || 10;
const slowPeriod = params.slowMA || 30;

const fastMA = TechnicalIndicators.ema(signalPrices, fastPeriod);
const slowMA = TechnicalIndicators.ema(signalPrices, slowPeriod);

const signals = [];
for (let i = 0; i < signalPrices.length; i++) {
    if (i === 0 || !fastMA[i] || !slowMA[i] || !fastMA[i-1] || !slowMA[i-1]) {
        signals[i] = 0;
    } else if (fastMA[i-1] <= slowMA[i-1] && fastMA[i] > slowMA[i]) {
        signals[i] = 1; // Buy signal
    } else if (fastMA[i-1] >= slowMA[i-1] && fastMA[i] < slowMA[i]) {
        signals[i] = -1; // Sell signal
    } else {
        signals[i] = 0;
    }
}

return signals;`;
    }

    /**
     * Get RSI example script
     */
    getRSIExample() {
        return `// RSI Strategy
const rsiPeriod = params.rsiPeriod || 14;
const overbought = params.rsiOverbought || 70;
const oversold = params.rsiOversold || 30;

// Calculate RSI (you'll need to implement this in TechnicalIndicators)
const rsi = TechnicalIndicators.rsi(signalPrices, rsiPeriod);

const signals = rsi.map(r => {
    if (r < oversold) return 1;  // Buy signal
    if (r > overbought) return -1; // Sell signal
    return 0; // Hold
});

return signals;`;
    }

    /**
     * Get basic example script
     */
    getBasicExample() {
        return `// Basic Price-based Strategy
const signals = [];

for (let i = 1; i < signalPrices.length; i++) {
    const currentPrice = signalPrices[i];
    const previousPrice = signalPrices[i-1];
    
    if (currentPrice > previousPrice * 1.02) {
        signals[i] = 1; // Buy if price up 2%
    } else if (currentPrice < previousPrice * 0.98) {
        signals[i] = -1; // Sell if price down 2%
    } else {
        signals[i] = 0; // Hold
    }
}

return signals;`;
    }
}