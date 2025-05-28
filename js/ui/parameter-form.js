/**
 * Parameter Form Component
 * Dynamically generates form fields based on script parameters
 */
class ParameterForm {
    constructor() {
        this.marketDataContainer = document.getElementById('market-data-form');
        this.strategyParametersContainer = document.getElementById('strategy-parameters-form');
        this.parameterParser = new ParameterParser();
        this.currentParameters = [];
        this.callbacks = {};
        
        this.initializeForm();
    }

    /**
     * Initialize the parameter form UI
     */
    initializeForm() {
        this.createMarketDataForm();
        this.createDefaultParametersForm();
        this.attachEventListeners();
    }

    /**
     * Update strategy parameters based on script content
     * @param {string} script - Strategy script content
     */
    updateParametersFromScript(script) {
        console.log('[Muuned] Analyzing script for parameters...');
        
        const discovery = this.parameterParser.discoverParameters(script);
        this.currentParameters = discovery.parameters;
        
        console.log(`[Muuned] Found ${discovery.totalCount} parameters (${discovery.unknownCount} unknown)`);
        
        // Generate new form
        this.createDynamicParametersForm(discovery);
        
        // Show warnings if any
        const warnings = this.parameterParser.validateParameterCombinations(discovery.parameters);
        if (warnings.length > 0) {
            console.warn('[Muuned] Parameter warnings:', warnings);
        }
        
        // Update parameter count
        this.updateParameterCount();
        
        // Trigger callback
        this.trigger('parametersUpdated', discovery);
    }

    /**
     * Create dynamic parameter form based on discovered parameters (simplified)
     */
    createDynamicParametersForm(discovery) {
        if (discovery.parameters.length === 0) {
            this.strategyParametersContainer.innerHTML = `
                <div class="no-parameters">
                    <p>ℹ️ No parameters detected in script.</p>
                    <p>Use <code>params.parameterName</code> in your script to create parameters.</p>
                </div>
            `;
            return;
        }
    
        let html = `
            <div class="parameters-info">
                <p>Found ${discovery.totalCount} parameters in your script</p>
                </ul>
            </div>
            
            <div class="param-grid">
        `;
        
        // Generate form fields for all parameters
        for (const param of discovery.parameters) {
            html += `
                <div class="form-group">
                    <label for="${param.name}">${param.label}</label>
                    <input 
                        type="text" 
                        id="${param.name}" 
                        value="${param.defaultValue}" 
                        placeholder="e.g., ${param.defaultValue} or 10_50:10"
                        data-param-name="${param.name}"
                        data-param-type="array"
                    >
                </div>
            `;
        }
        
        html += `
            </div>
            
            <div class="advanced-params" style="display: none;">
                <h3>Advanced Parameters</h3>
                <div class="param-grid">
                    <div class="form-group">
                        <label for="feesSlippage">Fees + Slippage (%)</label>
                        <input type="number" id="feesSlippage" value="0.1" step="0.01" placeholder="0.1">
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" id="toggleAdvanced" class="toggle-btn">
                    Show Advanced Parameters
                </button>
                <button type="button" id="resetParams" class="reset-btn">
                    Reset to Defaults
                </button>
            </div>
        `;
    
        this.strategyParametersContainer.innerHTML = html;
        this.attachParameterEventListeners();
    }

    generateExampleRange(defaultValue) {
        // Ensure defaultValue is a string
        const defaultStr = String(defaultValue || '10');
        
        // Handle case where defaultValue might be empty or just whitespace
        if (!defaultStr.trim()) {
            return '10_50:10';
        }
        
        try {
            const values = defaultStr.split(',')
                .map(v => parseFloat(v.trim()))
                .filter(v => !isNaN(v));
            
            if (values.length >= 2) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const step = values.length > 2 ? Math.abs(values[1] - values[0]) : Math.ceil((max - min) / 5);
                
                if (step > 0 && min !== max) {
                    return `${min}_${max}:${step}`;
                }
            }
            
            // If we have at least one valid number, use it as a base
            if (values.length > 0) {
                const baseValue = values[0];
                const start = Math.max(1, Math.floor(baseValue * 0.5));
                const end = Math.ceil(baseValue * 1.5);
                const step = Math.max(1, Math.ceil((end - start) / 5));
                return `${start}_${end}:${step}`;
            }
            
        } catch (error) {
            console.warn('[Muuned] Error generating example range for:', defaultValue, error);
        }
        
        // Final fallback
        return '10_50:10';
    }

    /**
     * Create HTML for a single parameter field
     */
    createParameterField(param) {
        const isUnknown = !param.isKnown;
        const helpIcon = param.description ? 
            `<span class="param-help" title="${param.description}">ⓘ</span>` : '';
        
        return `
            <div class="form-group ${isUnknown ? 'unknown-param' : ''}">
                <label for="${param.name}">
                    ${param.label}
                    ${helpIcon}
                    ${isUnknown ? '<span class="unknown-badge">Custom</span>' : ''}
                </label>
                <input 
                    type="text" 
                    id="${param.name}" 
                    value="${param.defaultValue}" 
                    placeholder="${param.defaultValue}"
                    data-param-name="${param.name}"
                    data-param-type="${param.type}"
                >
            </div>
        `;
    }

    /**
     * Create default parameters form (when no script is analyzed)
     */
    createDefaultParametersForm() {
        this.strategyParametersContainer.innerHTML = `
            <div class="parameters-placeholder">
                <p>⏳ Analyzing script for parameters...</p>
                <p>Parameters will appear here based on your strategy script.</p>
            </div>
        `;
    }

    /**
     * Create market data configuration form - UPDATED with starting capital controls
     */
    createMarketDataForm() {
        this.marketDataContainer.innerHTML = `
            <div class="form-group">
                <label for="symbol-container">Symbol</label>
                <div id="symbol-container">
                    <!-- Symbol selector will be created here -->
                </div>
            </div>
            
            <div class="form-group">
                <label for="interval">Candle Size</label>
                <select id="interval">
                    <option value="1h">1 Hour</option>
                    <option value="2h" selected>2 Hours</option>
                    <option value="4h">4 Hours</option>
                    <option value="6h">6 Hours</option>
                    <option value="12h">12 Hours</option>
                    <option value="1d">1 Day</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="startDate">Start Date</label>
                <input type="date" id="startDate" value="${this.getDefaultStartDate()}">
            </div>
            
            <div class="form-group">
                <label for="endDate">End Date</label>
                <input type="date" id="endDate" value="${this.getDefaultEndDate()}">
            </div>
            
            <div class="param-grid">
                <div class="form-group">
                    <label for="startingDenomination">Denomination</label>
                    <select id="startingDenomination">
                        <option value="coin">Start with Coin</option>
                        <option value="usdt" selected>Start with USDT</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="startingAmount">Starting Amount</label>
                    <input type="number" id="startingAmount" value="10000" min="1" step="1" placeholder="10000">
                </div>
            </div>
        `;
        
        // Initialize the symbol selector
        this.symbolSelector = new SymbolSelector('symbol-container', 'BTCUSDT');
    }

    /**
     * Attach event listeners to parameter inputs
     */
    attachParameterEventListeners() {
        // Parameter validation
        const paramInputs = this.strategyParametersContainer.querySelectorAll('input[data-param-name]');
        paramInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateParameter(input.dataset.paramName));
            input.addEventListener('input', () => this.updateParameterCount());
        });
        
        // Advanced parameters toggle
        const toggleBtn = document.getElementById('toggleAdvanced');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleAdvancedParams());
        }
        
        // Reset parameters
        const resetBtn = document.getElementById('resetParams');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
    }

    /**
     * Attach event listeners to form elements
     */
    attachEventListeners() {
        // Market data validation
        document.getElementById('startDate').addEventListener('change', () => {
            this.validateDateRange();
            this.updateParameterCount(); // Update time estimate when date changes
        });
        
        document.getElementById('endDate').addEventListener('change', () => {
            this.validateDateRange();
            this.updateParameterCount(); // Update time estimate when date changes
        });
        
        // Interval change affects time estimation
        document.getElementById('interval').addEventListener('change', () => {
            this.updateParameterCount();
        });
        
        // Starting amount validation
        document.getElementById('startingAmount').addEventListener('input', () => {
            this.validateStartingAmount();
        });
        
        // Symbol selector validation
        if (this.symbolSelector) {
            const symbolInput = document.getElementById('symbol-search');
            if (symbolInput) {
                symbolInput.addEventListener('change', () => {
                    this.validateSymbol();
                });
            }
        }
    }
    validateSymbol() {
        if (!this.symbolSelector) return true;
        
        const selectedSymbol = this.symbolSelector.getSelectedSymbol();
        const isValid = selectedSymbol && selectedSymbol.length > 0;
        
        const symbolInput = document.getElementById('symbol-search');
        if (symbolInput) {
            this.updateValidationStatus('symbol-search', isValid, 
                isValid ? '' : 'Please select a valid symbol');
        }
        
        return isValid;
    }

    /**
     * Validate starting amount
     */
    validateStartingAmount() {
        const amountInput = document.getElementById('startingAmount');
        const amount = parseFloat(amountInput.value);
        
        let isValid = true;
        let message = '';
        
        if (isNaN(amount) || amount <= 0) {
            isValid = false;
            message = 'Starting amount must be a positive number';
        } else if (amount < 1) {
            isValid = false;
            message = 'Starting amount must be at least 1';
        } else if (amount > 1000000) {
            isValid = false; 
            message = 'Starting amount cannot exceed 1,000,000';
        }
        
        this.updateValidationStatus('startingAmount', isValid, message);
        return isValid;
    }

    /**
     * Get strategy parameters from current form
     */
    getStrategyParameters() {
        const params = {};
        
        // Get parameters from current form
        const paramInputs = this.strategyParametersContainer.querySelectorAll('input[data-param-name]');
        
        paramInputs.forEach(input => {
            const paramName = input.dataset.paramName;
            const paramType = input.dataset.paramType;
            const value = input.value.trim();
            
            if (paramType === 'array') {
                params[paramName] = this.parseParameterValues(value);
            } else {
                params[paramName] = parseFloat(value) || 0;
            }
        });
        
        // Add fixed parameters
        const feesSlippageInput = document.getElementById('feesSlippage');
        if (feesSlippageInput) {
            params.feesSlippage = parseFloat(feesSlippageInput.value) / 100; // Convert to decimal
        } else {
            params.feesSlippage = 0.001; // Default
        }
        
        return params;
    }

    /**
     * Update parameter combination count
     */
    updateParameterCount() {
        try {
            const params = this.getStrategyParameters();
            const combinations = this.calculateCombinations(params);
            
            let countElement = document.getElementById('param-count');
            if (!countElement) {
                countElement = document.createElement('div');
                countElement.id = 'param-count';
                countElement.className = 'param-count';
                this.strategyParametersContainer.appendChild(countElement);
            }
            
            const timeEstimate = this.estimateRunTime(combinations);
            const warning = this.getPerformanceWarning(combinations);
            
            countElement.innerHTML = `
                <strong>${combinations.toLocaleString()}</strong> parameter combinations
                <br><small>Estimated runtime: ${timeEstimate}</small>
                ${warning ? `<br><small class="warning-text">${warning}</small>` : ''}
            `;
            
            // Update styling based on combination count
            countElement.classList.remove('warning', 'error');
            if (combinations > 500000) {
                countElement.classList.add('error');
            } else if (combinations > 100000) {
                countElement.classList.add('warning');
            }
            
        } catch (error) {
            console.warn('[Muuned] Could not update parameter count:', error);
        }
    }

    getPerformanceWarning(combinations) {
        if (combinations > 1000000) {
            return '🚨 Extremely high computation load - this may take hours';
        } else if (combinations > 500000) {
            return '🚨 Very high computation load - this may take 30+ minutes';
        } else if (combinations > 100000) {
            return '⚠️ High computation load - this may take 10+ minutes';
        } else if (combinations > 50000) {
            return '⚠️ Large number of combinations - may take several minutes';
        }
        return null;
    }

    /**
     * Reset parameters to their default values
     */
    resetToDefaults() {
        const paramInputs = this.strategyParametersContainer.querySelectorAll('input[data-param-name]');
        
        paramInputs.forEach(input => {
            const paramName = input.dataset.paramName;
            const paramDef = this.parameterParser.getParameterDefinition(paramName);
            
            if (paramDef) {
                input.value = paramDef.defaultValue;
            }
        });
        
        // Reset fees/slippage
        const feesSlippageInput = document.getElementById('feesSlippage');
        if (feesSlippageInput) {
            feesSlippageInput.value = '0.1';
        }
        
        this.updateParameterCount();
    }

    /**
     * Get default start date (6 months ago)
     */
    getDefaultStartDate() {
        const date = new Date();
        date.setMonth(date.getMonth() - 6);
        return date.toISOString().split('T')[0];
    }

    /**
     * Get default end date (today)
     */
    getDefaultEndDate() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Validate date range
     */
    validateDateRange() {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        const today = new Date();
        
        let isValid = true;
        let message = '';
        
        if (startDate >= endDate) {
            isValid = false;
            message = 'Start date must be before end date';
        } else if (endDate > today) {
            isValid = false;
            message = 'End date cannot be in the future';
        } else if (startDate < new Date('2017-01-01')) {
            isValid = false;
            message = 'Start date too early (Binance data starts from 2017)';
        }
        
        this.updateValidationStatus('dateRange', isValid, message);
        return isValid;
    }

    /**
     * Validate parameter input
     */
    validateParameter(paramId) {
        const input = document.getElementById(paramId);
        if (!input) return true;
        
        const value = input.value.trim();
        const paramType = input.dataset.paramType;
        
        let isValid = true;
        let message = '';
        
        try {
            if (paramType === 'array') {
                const parsed = this.parseParameterValues(value);
                
                if (parsed.length === 0) {
                    isValid = false;
                    message = 'At least one value required';
                } else if (parsed.some(v => isNaN(v))) {
                    isValid = false;
                    message = 'All values must be numbers';
                }
                
                // REMOVED: Parameter count limits and min/max validation
                // Users can now specify as many parameters as they want
                
            } else {
                // Single value validation
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    isValid = false;
                    message = 'Value must be a number';
                }
            }
        } catch (error) {
            isValid = false;
            message = 'Invalid format. Use comma-separated numbers (e.g., 1,2,3) or ranges (e.g., 10_50:10)';
        }
        
        this.updateValidationStatus(paramId, isValid, message);
        this.updateParameterCount();
        
        return isValid;
    }

    /**
     * Parse parameter values from string
     */
    parseParameterValues(valueString) {
        if (!valueString || valueString.trim() === '') {
            return [];
        }
        
        const parts = valueString.split(',').map(part => part.trim()).filter(part => part.length > 0);
        const allValues = [];
        
        for (const part of parts) {
            if (part.includes('_') && part.includes(':')) {
                // Range format: "start_end:step"
                const rangeValues = this.parseRangeFormat(part);
                allValues.push(...rangeValues);
            } else {
                // Single value
                const value = parseFloat(part);
                if (!isNaN(value)) {
                    allValues.push(value);
                }
            }
        }
        
        // Remove duplicates and sort
        return [...new Set(allValues)].sort((a, b) => a - b);
    }
    parseRangeFormat(rangeString) {
        try {
            const [range, stepStr] = rangeString.split(':');
            const [startStr, endStr] = range.split('_');
            
            const start = parseFloat(startStr);
            const end = parseFloat(endStr);
            const step = parseFloat(stepStr);
            
            if (isNaN(start) || isNaN(end) || isNaN(step) || step <= 0) {
                throw new Error('Invalid range format');
            }
            
            if (start > end) {
                throw new Error('Start value must be less than or equal to end value');
            }
            
            const values = [];
            for (let i = start; i <= end; i += step) {
                // Round to avoid floating point precision issues
                values.push(Math.round(i * 1000000) / 1000000);
            }
            
            return values;
        } catch (error) {
            console.warn('[Muuned] Error parsing range format:', rangeString, error);
            return [];
        }
    }

    /**
     * Update validation status display
     */
    updateValidationStatus(fieldId, isValid, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove existing validation classes
        field.classList.remove('valid', 'invalid');
        
        // Add appropriate class
        field.classList.add(isValid ? 'valid' : 'invalid');
        
        // Update or create error message
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!isValid && message) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                field.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = message;
        } else if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Calculate total parameter combinations
     */
    calculateCombinations(params) {
        let total = 1;
        Object.values(params).forEach(values => {
            if (Array.isArray(values)) {
                total *= values.length;
            }
        });
        return total;
    }

    /**
     * Estimate runtime based on combinations
     */
    estimateRunTime(combinations) {
        try {
            // Get market data configuration
            const startDate = new Date(document.getElementById('startDate').value);
            const endDate = new Date(document.getElementById('endDate').value);
            const interval = document.getElementById('interval').value;
            
            // Calculate number of candles based on date range and interval
            const timeDiff = endDate.getTime() - startDate.getTime();
            const daysDiff = timeDiff / (1000 * 3600 * 24);
            
            // Convert interval to hours
            const intervalHours = this.parseIntervalToHours(interval);
            const totalCandles = Math.floor((daysDiff * 24) / intervalHours);
            
            // Base processing time factors
            const msPerCombination = 1; // Base time per parameter combination
            const msPerCandle = 0.01; // Additional time per candle per combination
            const setupOverhead = 100; // Fixed setup time per combination

            
            // Calculate total processing time
            const totalProcessingTime = ((totalCandles * msPerCandle) * combinations) + setupOverhead;

            // Add UI update overhead for large result sets
            const uiOverhead = combinations > 1000 ? Math.log(combinations) * 50 : 0;
            // const totalTime = totalProcessingTime + uiOverhead;
            const totalTime = totalProcessingTime;
            
            
            return this.formatEstimatedTime(totalTime);
            
        } catch (error) {
            console.warn('[Muuned] Could not calculate detailed time estimate:', error);
            // Fallback to simple estimation
            const simpleEstimate = combinations * 5;
            return this.formatEstimatedTime(simpleEstimate);
        }
    }
    parseIntervalToHours(interval) {
        const timeMap = {
            '1h': 1,
            '2h': 2,
            '4h': 4,
            '6h': 6,
            '12h': 12,
            '1d': 24
        };
        
        return timeMap[interval] || 2; // Default to 2 hours if unknown
    }
    formatEstimatedTime(totalMs) {
        if (totalMs < 1000) {
            return `${Math.round(totalMs)}ms`;
        } else if (totalMs < 10000) {
            return `${(totalMs / 1000).toFixed(1)}s`;
        } else if (totalMs < 60000) {
            return `${Math.round(totalMs / 1000)}s`;
        } else if (totalMs < 3600000) { // Less than 1 hour
            const totalSeconds = Math.round(totalMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
        } else {
            // 1 hour or more - show hours and minutes
            const totalMinutes = Math.round(totalMs / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
    }

    /**
     * Toggle advanced parameters visibility
     */
    toggleAdvancedParams() {
        const advancedParams = document.querySelector('.advanced-params');
        const toggleBtn = document.getElementById('toggleAdvanced');
        
        if (!advancedParams || !toggleBtn) return;
        
        if (advancedParams.style.display === 'none') {
            advancedParams.style.display = 'block';
            toggleBtn.textContent = 'Hide Advanced Parameters';
        } else {
            advancedParams.style.display = 'none';
            toggleBtn.textContent = 'Show Advanced Parameters';
        }
    }

    /**
     * Get market data configuration - UPDATED to include starting capital
     */
    getMarketDataConfig() {
        return {
            symbol: this.symbolSelector ? this.symbolSelector.getSelectedSymbol() : 'BTCUSDT',
            interval: document.getElementById('interval').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            startingDenomination: document.getElementById('startingDenomination').value,
            startingAmount: parseFloat(document.getElementById('startingAmount').value) || 10000
        };
    }

    /**
     * Validate all form inputs
     */
    validateAll() {
        const dateValid = this.validateDateRange();
        const amountValid = this.validateStartingAmount();
        const symbolValid = this.validateSymbol();
        
        const paramInputs = this.strategyParametersContainer.querySelectorAll('input[data-param-name]');
        const paramValidations = Array.from(paramInputs).map(input => 
            this.validateParameter(input.dataset.paramName)
        );
        
        return dateValid && amountValid && symbolValid && paramValidations.every(v => v);
    }

    /**
     * Register callback for form events
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * Trigger callback
     */
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }
}