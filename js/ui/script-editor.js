/**
 * Script Editor Component
 * Allows users to write custom strategy scripts
 */
class ScriptEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentScript = this.getDefaultScript();
        this.isExpanded = false;
        
        this.initializeEditor();
    }

    /**
     * Initialize the script editor UI
     */
    initializeEditor() {
        this.container.innerHTML = `
            <div class="script-editor-header">
                <h2>📝 Strategy Script</h2>
                <div class="editor-controls">
                    <button class="control-btn" id="reset-script">Reset to Default</button>
                    <button class="control-btn" id="toggle-editor">${this.isExpanded ? 'Collapse' : 'Expand'}</button>
                </div>
            </div>
            
            <div class="script-editor-content ${this.isExpanded ? 'expanded' : 'collapsed'}">
                <div class="editor-info">
                    <p>Write JavaScript code to generate trading signals. Your script should return an array of signals (-1=sell, 0=hold, 1=buy).</p>
                    <p><strong>Available:</strong> <code>TechnicalIndicators</code> class, <code>signalPrices</code>, <code>executionPrices</code>, <code>params</code> object</p>
                </div>
                
                <div class="editor-wrapper">
                    <textarea 
                        id="strategy-script" 
                        class="script-textarea"
                        spellcheck="false"
                        placeholder="Write your strategy script here..."
                    >${this.currentScript}</textarea>
                </div>
                
                <div class="editor-status" id="script-status">
                    <span class="status-ready">✅ Script Ready</span>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    /**
     * Attach event listeners to editor controls
     */
    attachEventListeners() {
        // Toggle editor expansion
        document.getElementById('toggle-editor').addEventListener('click', () => {
            this.toggleEditor();
        });
        
        // Reset script
        document.getElementById('reset-script').addEventListener('click', () => {
            this.resetScript();
        });
        
        // Script content changes
        const textarea = document.getElementById('strategy-script');
        textarea.addEventListener('input', () => {
            this.currentScript = textarea.value;
            this.validateScript();
            
            // Notify parameter form of script changes
            if (this.onScriptChange) {
                this.onScriptChange(this.currentScript);
            }
        });
        
        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            this.autoResizeTextarea(textarea);
        });
        
        // Initial resize and analysis
        this.autoResizeTextarea(textarea);
        
        // Trigger initial parameter analysis
        if (this.onScriptChange) {
            this.onScriptChange(this.currentScript);
        }
    }

    /**
     * Toggle editor expanded/collapsed state
     */
    toggleEditor() {
        this.isExpanded = !this.isExpanded;
        const content = this.container.querySelector('.script-editor-content');
        const toggleBtn = document.getElementById('toggle-editor');
        
        if (this.isExpanded) {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            toggleBtn.textContent = 'Collapse';
        } else {
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            toggleBtn.textContent = 'Expand';
        }
    }

    /**
     * Set callback for script changes
     * @param {Function} callback - Function to call when script changes
     */
    onScriptChange(callback) {
        this.onScriptChange = callback;
    }

    /**
     * Reset script to default
     */
    resetScript() {
        if (confirm('Reset script to default? This will lose your current changes.')) {
            this.currentScript = this.getDefaultScript();
            document.getElementById('strategy-script').value = this.currentScript;
            this.validateScript();
            this.autoResizeTextarea(document.getElementById('strategy-script'));
            
            // Notify of script change
            if (this.onScriptChange) {
                this.onScriptChange(this.currentScript);
            }
        }
    }

    /**
     * Auto-resize textarea to fit content
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
    }

    /**
     * Basic script validation
     */
    validateScript() {
        const statusElement = document.getElementById('script-status');
        
        try {
            // Basic syntax check - try to create function
            new Function('signalPrices', 'executionPrices', 'params', 'TechnicalIndicators', this.currentScript);
            statusElement.innerHTML = '<span class="status-ready">✅ Script Syntax OK</span>';
            return true;
        } catch (error) {
            statusElement.innerHTML = `<span class="status-loading">❌ Syntax Error: ${error.message}</span>`;
            return false;
        }
    }

    /**
     * Execute the user's script
     * @param {Array} signalPrices - OHLC4 price array
     * @param {Array} executionPrices - Close price array
     * @param {Object} params - Strategy parameters
     * @returns {Object} Result with signals array
     */
    executeScript(signalPrices, executionPrices, params) {
        try {
            // Debug logging to see what we're actually getting
            console.log('[Muuned] Script execution debug:');
            console.log('signalPrices type:', typeof signalPrices);
            console.log('signalPrices isArray:', Array.isArray(signalPrices));
            console.log('signalPrices length:', signalPrices ? signalPrices.length : 'undefined');
            console.log('executionPrices type:', typeof executionPrices);
            console.log('executionPrices isArray:', Array.isArray(executionPrices));
            console.log('executionPrices length:', executionPrices ? executionPrices.length : 'undefined');
            console.log('params:', params);
            
            // Validate inputs
            if (!Array.isArray(signalPrices)) {
                throw new Error(`signalPrices is not an array. Type: ${typeof signalPrices}, Value: ${signalPrices}`);
            }
            
            if (!Array.isArray(executionPrices)) {
                throw new Error(`executionPrices is not an array. Type: ${typeof executionPrices}, Value: ${executionPrices}`);
            }
            
            // Create a sandboxed function with the user's script
            const userFunction = new Function(
                'signalPrices', 
                'executionPrices', 
                'params', 
                'TechnicalIndicators',
                this.currentScript
            );
            
            // Execute the script
            const result = userFunction(signalPrices, executionPrices, params, TechnicalIndicators);
            
            // Validate result
            if (!Array.isArray(result)) {
                throw new Error('Script must return an array of signals');
            }
            
            if (result.length !== signalPrices.length) {
                throw new Error(`Signal array length (${result.length}) must match price array length (${signalPrices.length})`);
            }
            
            // Validate signal values
            for (let i = 0; i < result.length; i++) {
                const signal = result[i];
                if (signal !== -1 && signal !== 0 && signal !== 1) {
                    throw new Error(`Invalid signal at index ${i}: ${signal}. Signals must be -1, 0, or 1`);
                }
            }
            
            return {
                signals: result,
                signalCount: result.filter(s => s !== 0).length,
                length: result.length
            };
            
        } catch (error) {
            console.error('[Muuned] Script execution error:', error);
            throw new Error(`Script execution failed: ${error.message}`);
        }
    }

    /**
     * Get the current script content
     * @returns {string} Current script
     */
    getCurrentScript() {
        return this.currentScript;
    }

    /**
     * Set script content
     * @param {string} script - New script content
     */
    setScript(script) {
        this.currentScript = script;
        document.getElementById('strategy-script').value = script;
        this.validateScript();
        this.autoResizeTextarea(document.getElementById('strategy-script'));
        
        // Notify of script change
        if (this.onScriptChange) {
            this.onScriptChange(this.currentScript);
        }
    }

    /**
     * Get default EMA Differential strategy script
     * @returns {string} Default script
     */
    getDefaultScript() {
        return `// EMA Differential Strategy
// Generate trading signals based on volatility-adaptive EMA

// Calculate rolling volatility
const volatility = TechnicalIndicators.rollingStd(signalPrices, params.volatilityWindow || 20);

// Calculate volatility as percentage of price
const volatilityPct = volatility.map((vol, i) => {
    if (vol !== undefined && signalPrices[i] > 0) {
        return (vol / signalPrices[i]) * 100;
    }
    return undefined;
});

// Calculate dynamic EMA lengths based on volatility
const emaLengths = volatilityPct.map(volPct => {
    if (isNaN(volPct) || volPct === null || volPct === undefined) {
        return params.emaCeiling;
    }
    if (volPct <= params.volFloor) {
        return params.emaCeiling;
    } else if (volPct >= params.volCeiling) {
        return params.emaFloor;
    }
    
    // Linear interpolation
    const volRange = params.volCeiling - params.volFloor;
    const emaRange = params.emaCeiling - params.emaFloor;
    const volPosition = (volPct - params.volFloor) / volRange;
    const adjustedPosition = 1 - volPosition;
    const emaLength = params.emaFloor + (adjustedPosition * emaRange);
    
    return Math.round(emaLength);
});

// Calculate dynamic EMAs
const ema = [];
const maxPeriod = Math.max(...emaLengths.filter(p => !isNaN(p)));
let baseEma = TechnicalIndicators.ema(signalPrices, maxPeriod);

for (let i = 0; i < signalPrices.length; i++) {
    const period = emaLengths[i];
    
    if (period && i >= (params.volatilityWindow || 20) && i >= period - 1) {
        const startIdx = Math.max(0, i - period + 1);
        const priceSlice = signalPrices.slice(startIdx, i + 1);
        
        if (priceSlice.length >= period) {
            const localEma = TechnicalIndicators.ema(priceSlice, period);
            ema[i] = localEma[localEma.length - 1];
        } else if (baseEma[i] !== undefined) {
            ema[i] = baseEma[i];
        }
    } else if (baseEma[i] !== undefined) {
        ema[i] = baseEma[i];
    }
}

// Calculate differential as percentage
const rawDiff = signalPrices.map((price, i) => {
    if (ema[i] !== undefined && ema[i] > 0) {
        return ((price - ema[i]) / ema[i]) * 100 * (params.voltScale || 1.0);
    }
    return undefined;
});

// Smooth the differential
const validRawDiff = rawDiff.filter(val => val !== undefined);
const smoothedValid = TechnicalIndicators.smooth(validRawDiff, params.smoothLength || 3);

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
    
    if (smoothDiff > 0 || smoothDiff <= (params.forceBuyThreshold || -5.0)) {
        return 1; // Buy signal
    } else if (smoothDiff < 0) {
        return -1; // Sell signal
    }
    return 0; // No signal
});

// Return signals array
return signals;`;
    }

    /**
     * Get a simple example script for reference
     * @returns {string} Example script
     */
    getExampleScript() {
        return `// Simple Moving Average Crossover Strategy
// Buy when fast MA crosses above slow MA, sell when it crosses below

const fastPeriod = params.fastMA || 10;
const slowPeriod = params.slowMA || 30;

// Calculate moving averages
const fastMA = TechnicalIndicators.ema(signalPrices, fastPeriod);
const slowMA = TechnicalIndicators.ema(signalPrices, slowPeriod);

// Generate signals based on crossovers
const signals = [];
for (let i = 0; i < signalPrices.length; i++) {
    if (i === 0 || !fastMA[i] || !slowMA[i] || !fastMA[i-1] || !slowMA[i-1]) {
        signals[i] = 0; // No signal
    } else if (fastMA[i-1] <= slowMA[i-1] && fastMA[i] > slowMA[i]) {
        signals[i] = 1; // Buy signal (fast MA crosses above slow MA)
    } else if (fastMA[i-1] >= slowMA[i-1] && fastMA[i] < slowMA[i]) {
        signals[i] = -1; // Sell signal (fast MA crosses below slow MA)
    } else {
        signals[i] = 0; // Hold
    }
}

return signals;`;
    }

    /**
     * Show example scripts menu
     */
    showExamples() {
        const examples = [
            { name: 'EMA Differential (Default)', script: this.getDefaultScript() },
            { name: 'Simple MA Crossover', script: this.getExampleScript() }
        ];
        
        // This could be expanded with a dropdown or modal
        console.log('Available examples:', examples.map(e => e.name));
    }

    /**
     * Validate that script is safe to execute
     * @param {string} script - Script to validate
     * @returns {Object} Validation result
     */
    validateScriptSafety(script) {
        // Basic safety checks
        const dangerousPatterns = [
            /document\./,
            /window\./,
            /eval\(/,
            /Function\(/,
            /setTimeout/,
            /setInterval/,
            /XMLHttpRequest/,
            /fetch\(/,
            /import\s/,
            /require\(/
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(script)) {
                return {
                    isSafe: false,
                    error: `Potentially unsafe code detected: ${pattern.source}`
                };
            }
        }
        
        return { isSafe: true };
    }
}