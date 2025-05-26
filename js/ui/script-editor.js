/**
 * Script Editor Component with CodeMirror Integration
 * Professional code editor with syntax highlighting, validation, and autocomplete
 */
class ScriptEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentScript = this.getDefaultScript();
        this.isExpanded = true;
        this.editor = null;
        this.codeValidator = new CodeValidator();
        this.validationEnabled = true;
        
        this.initializeEditor();
    }

    /**
     * Initialize the script editor UI with CodeMirror
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
                    <p><strong>Available:</strong> <code>TechnicalIndicators</code> class with 70+ Pine Script functions, <code>signalPrices</code>, <code>executionPrices</code>, <code>params</code> object</p>
                </div>
                
                <div class="editor-wrapper">
                    <div id="codemirror-container" class="codemirror-container"></div>
                </div>
                
                <div class="editor-status" id="script-status">
                    <span class="status-ready">✅ Script Ready</span>
                </div>
                
                <div id="validation-issues" class="validation-issues" style="display: none;"></div>
            </div>
        `;
        
        this.initializeCodeMirror();
        this.attachEventListeners();
    }

    /**
     * Initialize CodeMirror editor
     */
    initializeCodeMirror() {
        const container = document.getElementById('codemirror-container');
        
        // Check if CodeMirror is available
        if (typeof CodeMirror === 'undefined') {
            console.error('CodeMirror is not loaded. Falling back to textarea.');
            this.createFallbackEditor(container);
            return;
        }
        
        // CodeMirror configuration
        this.editor = CodeMirror(container, {
            value: this.currentScript,
            mode: 'javascript',
            theme: 'material',
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            extraKeys: {
                'Ctrl-Space': 'autocomplete',
                'Ctrl-/': 'toggleComment',
                'Ctrl-Alt-F': () => this.formatCode(),
                'F11': () => this.toggleFullscreen(),
                'Esc': () => this.exitFullscreen()
            },
            hintOptions: {
                hint: this.customHint.bind(this),
                completeSingle: false
            }
        });

        // Set up event listeners
        this.editor.on('change', () => {
            this.currentScript = this.editor.getValue();
            this.validateScript();
            
            // Notify parameter form of script changes
            if (this.onScriptChange) {
                this.onScriptChange(this.currentScript);
            }
        });

        // Auto-resize editor
        this.editor.on('changes', () => {
            this.autoResizeEditor();
        });

        // Initial validation
        this.validateScript();
    }

    /**
     * Create fallback textarea editor if CodeMirror fails to load
     */
    createFallbackEditor(container) {
        console.warn('Using fallback textarea editor');
        
        container.innerHTML = `
            <textarea 
                id="fallback-editor" 
                class="script-textarea"
                spellcheck="false"
                placeholder="Write your strategy script here..."
                style="width: 100%; min-height: 400px; font-family: monospace; font-size: 14px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"
            >${this.currentScript}</textarea>
        `;
        
        const textarea = document.getElementById('fallback-editor');
        
        // Set up event listeners for fallback
        textarea.addEventListener('input', () => {
            this.currentScript = textarea.value;
            this.validateScript();
            
            if (this.onScriptChange) {
                this.onScriptChange(this.currentScript);
            }
        });
        
        // Create a simple API to match CodeMirror
        this.editor = {
            getValue: () => textarea.value,
            setValue: (value) => {
                textarea.value = value;
                this.currentScript = value;
            },
            refresh: () => {}, // No-op for textarea
            getWrapperElement: () => textarea
        };
    }

    /**
     * Custom autocomplete hints for TechnicalIndicators
     */
    customHint(cm, options) {
        const cursor = cm.getCursor();
        const token = cm.getTokenAt(cursor);
        const word = token.string;
        
        // TechnicalIndicators autocomplete
        const technicalIndicators = [
            'sma', 'ema', 'wma', 'vwma', 'swma', 'alma', 'hma',
            'rsi', 'stoch', 'stochrsi', 'cci', 'mfi', 'williamsR',
            'macd', 'adx', 'psar', 'atr', 'tr', 'bb', 'kc',
            'obv', 'ad', 'mom', 'roc', 'crossover', 'crossunder',
            'highest', 'lowest', 'rising', 'falling', 'change',
            'nz', 'na', 'fixnan', 'abs', 'sign', 'round', 'floor',
            'ceil', 'max', 'min', 'pow', 'sqrt', 'log', 'avg', 'sum',
            'ohlc4', 'hlc3', 'hl2', 'rollingStd', 'smooth'
        ];
        
        // Parameter suggestions
        const commonParams = [
            'emaFloor', 'emaCeiling', 'volFloor', 'volCeiling',
            'smoothLength', 'forceBuyThreshold', 'voltScale',
            'positionSize', 'volatilityWindow', 'rsiPeriod',
            'fastMA', 'slowMA', 'rsiOverbought', 'rsiOversold'
        ];
        
        let suggestions = [];
        
        // Check context for appropriate suggestions
        const lineText = cm.getLine(cursor.line);
        
        if (lineText.includes('TechnicalIndicators.')) {
            suggestions = technicalIndicators
                .filter(indicator => indicator.toLowerCase().includes(word.toLowerCase()))
                .map(indicator => ({
                    text: indicator,
                    displayText: `${indicator}()`,
                    className: 'hint-indicator'
                }));
        } else if (lineText.includes('params.')) {
            suggestions = commonParams
                .filter(param => param.toLowerCase().includes(word.toLowerCase()))
                .map(param => ({
                    text: param,
                    displayText: param,
                    className: 'hint-param'
                }));
        } else {
            // General JavaScript suggestions
            const jsKeywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while'];
            suggestions = jsKeywords
                .filter(keyword => keyword.toLowerCase().includes(word.toLowerCase()))
                .map(keyword => ({
                    text: keyword,
                    displayText: keyword,
                    className: 'hint-keyword'
                }));
        }
        
        return {
            list: suggestions,
            from: CodeMirror.Pos(cursor.line, token.start),
            to: CodeMirror.Pos(cursor.line, token.end)
        };
    }

    /**
     * Auto-resize editor based on content
     */
    autoResizeEditor() {
        const minHeight = 400;
        const maxHeight = 600;
        const lineHeight = this.editor.defaultTextHeight();
        const lineCount = this.editor.lineCount();
        const desiredHeight = Math.max(minHeight, Math.min(maxHeight, lineCount * lineHeight + 40));
        
        this.editor.setSize(null, desiredHeight);
    }

    /**
     * Format code using basic JavaScript formatting
     */
    formatCode() {
        try {
            const code = this.editor.getValue();
            // Basic formatting - add proper indentation
            const formatted = this.basicJSFormat(code);
            this.editor.setValue(formatted);
            
            this.showTemporaryMessage('Code formatted!');
        } catch (error) {
            this.showTemporaryMessage('Format failed: ' + error.message, 'error');
        }
    }

    /**
     * Basic JavaScript code formatting
     */
    basicJSFormat(code) {
        let formatted = '';
        let indentLevel = 0;
        const indent = '    '; // 4 spaces
        
        const lines = code.split('\n');
        
        for (let line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '') {
                formatted += '\n';
                continue;
            }
            
            // Decrease indent for closing brackets
            if (trimmed.match(/^[\}\]\)]/)) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            // Add indentation
            formatted += indent.repeat(indentLevel) + trimmed + '\n';
            
            // Increase indent for opening brackets
            if (trimmed.match(/[\{\[\(]$/)) {
                indentLevel++;
            }
        }
        
        return formatted.trim();
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const wrapper = this.editor.getWrapperElement();
        if (wrapper.classList.contains('CodeMirror-fullscreen')) {
            this.exitFullscreen();
        } else {
            wrapper.classList.add('CodeMirror-fullscreen');
            this.editor.refresh();
        }
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        const wrapper = this.editor.getWrapperElement();
        wrapper.classList.remove('CodeMirror-fullscreen');
        this.editor.refresh();
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
    }

    /**
     * Toggle validation
     */
    toggleValidation(button) {
        this.validationEnabled = !this.validationEnabled;
        button.textContent = `Validation: ${this.validationEnabled ? 'ON' : 'OFF'}`;
        
        if (!this.validationEnabled) {
            this.clearValidationErrors();
        } else {
            this.validateAndShowErrors();
        }
    }

    /**
     * Validate code and show errors
     */
    validateAndShowErrors() {
        if (!this.validationEnabled) return;
        
        const code = this.getCurrentScript();
        const issues = this.codeValidator.validateCode(code);
        
        this.displayValidationIssues(issues);
    }

    /**
     * Display validation issues
     */
    displayValidationIssues(issues) {
        const statusElement = document.getElementById('validation-issues');
        
        if (issues.length === 0) {
            statusElement.innerHTML = '';
            statusElement.style.display = 'none';
            return;
        }
        
        statusElement.style.display = 'block';
        statusElement.innerHTML = issues.map(issue => `
            <div class="validation-issue ${issue.severity}">
                <span class="issue-severity">${issue.severity.toUpperCase()}</span>
                <span class="issue-message">${issue.message}</span>
                ${issue.line ? `<span class="issue-line">Line ${issue.line}</span>` : ''}
            </div>
        `).join('');
    }

    /**
     * Clear validation errors
     */
    clearValidationErrors() {
        const statusElement = document.getElementById('validation-issues');
        if (statusElement) {
            statusElement.innerHTML = '';
            statusElement.style.display = 'none';
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
        
        // Refresh CodeMirror after DOM changes
        setTimeout(() => {
            this.editor.refresh();
            this.autoResizeEditor();
        }, 100);
    }

    /**
     * Reset script to default
     */
    resetScript() {
        if (confirm('Reset script to default? This will lose your current changes.')) {
            this.currentScript = this.getDefaultScript();
            this.editor.setValue(this.currentScript);
            this.validateScript();
            
            // Notify of script change
            if (this.onScriptChange) {
                this.onScriptChange(this.currentScript);
            }
        }
    }

    /**
     * Basic script validation
     */
    validateScript() {
        const statusElement = document.getElementById('script-status');
        
        try {
            // Basic syntax check
            new Function('signalPrices', 'executionPrices', 'params', 'TechnicalIndicators', this.currentScript);
            statusElement.innerHTML = '<span class="status-ready">✅ Script Syntax OK</span>';
            
            if (this.validationEnabled) {
                this.validateAndShowErrors();
            }
            
            return true;
        } catch (error) {
            statusElement.innerHTML = `<span class="status-loading">❌ Syntax Error: ${error.message}</span>`;
            return false;
        }
    }

    /**
     * Show temporary message
     */
    showTemporaryMessage(message, type = 'success') {
        const statusElement = document.getElementById('script-status');
        const originalContent = statusElement.innerHTML;
        const className = type === 'error' ? 'status-loading' : 'status-ready';
        const icon = type === 'error' ? '❌' : '✅';
        
        statusElement.innerHTML = `<span class="${className}">${icon} ${message}</span>`;
        
        setTimeout(() => {
            statusElement.innerHTML = originalContent;
        }, 2000);
    }

    /**
     * Execute the user's script
     */
    executeScript(signalPrices, executionPrices, params) {
        try {
            // Validate inputs
            if (!Array.isArray(signalPrices)) {
                throw new Error(`signalPrices is not an array. Type: ${typeof signalPrices}`);
            }
            
            if (!Array.isArray(executionPrices)) {
                throw new Error(`executionPrices is not an array. Type: ${typeof executionPrices}`);
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
     */
    getCurrentScript() {
        return this.editor ? this.editor.getValue() : this.currentScript;
    }

    /**
     * Set script content
     */
    setScript(script) {
        this.currentScript = script;
        if (this.editor) {
            this.editor.setValue(script);
        }
        this.validateScript();
        
        // Notify of script change
        if (this.onScriptChange) {
            this.onScriptChange(this.currentScript);
        }
    }

    /**
     * Get default EMA Differential strategy script
     */
    getDefaultScript() {
        return `// EMA Differential Strategy with Pine Script Functions
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
    if (TechnicalIndicators.na(volPct)) {
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
    
    return TechnicalIndicators.round(emaLength);
});

// Calculate dynamic EMAs
const ema = [];
const maxPeriod = TechnicalIndicators.max(...emaLengths.filter(p => !TechnicalIndicators.na(p)));
let baseEma = TechnicalIndicators.ema(signalPrices, maxPeriod);

for (let i = 0; i < signalPrices.length; i++) {
    const period = emaLengths[i];
    
    if (period && i >= (params.volatilityWindow || 20) && i >= period - 1) {
        const startIdx = TechnicalIndicators.max(0, i - period + 1);
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

// Smooth the differential using Pine Script style
const validRawDiff = rawDiff.filter(val => !TechnicalIndicators.na(val));
const smoothedValid = TechnicalIndicators.ema(validRawDiff, params.smoothLength || 3);

// Map smoothed values back to original array positions
let smoothIndex = 0;
const smoothDiff = rawDiff.map(val => {
    if (!TechnicalIndicators.na(val)) {
        return smoothedValid[smoothIndex++];
    }
    return undefined;
});

// Generate trading signals
const signals = smoothDiff.map(smoothDiff => {
    if (TechnicalIndicators.na(smoothDiff)) return 0;
    
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
     * Set callback for script changes
     */
    onScriptChange(callback) {
        this.onScriptChange = callback;
    }
}

// // Initialize application when DOM and dependencies are ready
// function initializeMuunedApp() {
//     console.log('🌟 Starting Muuned Application...');
    
//     // Check if required dependencies are loaded
//     const missing = [];
//     if (typeof TechnicalIndicators === 'undefined') missing.push('TechnicalIndicators');
    
//     if (missing.length > 0) {
//         console.warn('Missing dependencies:', missing);
//         // Show error message to user
//         document.body.innerHTML = `
//             <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
//                 <h2>⚠️ Loading Error</h2>
//                 <p>Missing required dependencies: ${missing.join(', ')}</p>
//                 <p>Please refresh the page and ensure all scripts are loaded.</p>
//             </div>
//         `;
//         return;
//     }
    
//     // Initialize app
//     try {
//         window.muunedApp = new MuunedApp();
//     } catch (error) {
//         console.error('Failed to initialize Muuned app:', error);
//     }
// }

// // Wait for DOM and try to initialize
// document.addEventListener('DOMContentLoaded', initializeMuunedApp);