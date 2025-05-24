/**
 * Parameter Form Component
 * Handles user input for market data and strategy parameters
 */
class ParameterForm {
    constructor() {
        this.marketDataContainer = document.getElementById('market-data-form');
        this.strategyParametersContainer = document.getElementById('strategy-parameters-form');
        this.callbacks = {};
        
        this.initializeForm();
    }

    /**
     * Initialize the parameter form UI
     */
    initializeForm() {
        this.createMarketDataForm();
        this.createStrategyParametersForm();
        this.attachEventListeners();
    }

    /**
     * Create market data configuration form
     */
    createMarketDataForm() {
        this.marketDataContainer.innerHTML = `
            <div class="form-group">
                <label for="symbol">Symbol</label>
                <select id="symbol">
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="ADAUSDT">ADA/USDT</option>
                    <option value="DOTUSDT">DOT/USDT</option>
                    <option value="LINKUSDT">LINK/USDT</option>
                </select>
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
        `;
    }

    /**
     * Create strategy parameters form
     */
    createStrategyParametersForm() {
        this.strategyParametersContainer.innerHTML = `
            <div class="param-grid">
                <div class="form-group">
                    <label for="emaFloor">
                        EMA Floor
                        <span class="param-help" title="Shortest EMA periods to test">ⓘ</span>
                    </label>
                    <input type="text" id="emaFloor" value="5,10,15,20" placeholder="5,10,15,20">
                </div>
                
                <div class="form-group">
                    <label for="emaCeiling">
                        EMA Ceiling
                        <span class="param-help" title="Longest EMA periods to test">ⓘ</span>
                    </label>
                    <input type="text" id="emaCeiling" value="30,40,50,60" placeholder="30,40,50,60">
                </div>
                
                <div class="form-group">
                    <label for="volFloor">
                        Vol Floor
                        <span class="param-help" title="Low volatility threshold">ⓘ</span>
                    </label>
                    <input type="text" id="volFloor" value="0.5,1.0" placeholder="0.5,1.0">
                </div>
                
                <div class="form-group">
                    <label for="volCeiling">
                        Vol Ceiling
                        <span class="param-help" title="High volatility threshold">ⓘ</span>
                    </label>
                    <input type="text" id="volCeiling" value="1.5,2.0" placeholder="1.5,2.0">
                </div>
                
                <div class="form-group">
                    <label for="smoothLength">
                        Smooth Length
                        <span class="param-help" title="Signal smoothing period">ⓘ</span>
                    </label>
                    <input type="text" id="smoothLength" value="2,3" placeholder="2,3">
                </div>
                
                <div class="form-group">
                    <label for="forceBuyThreshold">
                        Force Buy Threshold
                        <span class="param-help" title="Extreme negative signal to force buy">ⓘ</span>
                    </label>
                    <input type="text" id="forceBuyThreshold" value="-5,-6,-7" placeholder="-5,-6,-7">
                </div>
            </div>
            
            <div class="advanced-params" style="display: none;">
                <h3>Advanced Parameters</h3>
                <div class="param-grid">
                    <div class="form-group">
                        <label for="voltScale">Volatility Scale</label>
                        <input type="text" id="voltScale" value="1.0" placeholder="1.0">
                    </div>
                    
                    <div class="form-group">
                        <label for="positionSize">Position Size</label>
                        <input type="text" id="positionSize" value="1.0" placeholder="1.0">
                    </div>
                    
                    <div class="form-group">
                        <label for="feesSlippage">Fees + Slippage (%)</label>
                        <input type="number" id="feesSlippage" value="0.1" step="0.01" placeholder="0.1">
                    </div>
                    
                    <div class="form-group">
                        <label for="volatilityWindow">Volatility Window</label>
                        <input type="number" id="volatilityWindow" value="20" placeholder="20">
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
    }

    /**
     * Attach event listeners to form elements
     */
    attachEventListeners() {
        // Market data validation
        document.getElementById('startDate').addEventListener('change', () => this.validateDateRange());
        document.getElementById('endDate').addEventListener('change', () => this.validateDateRange());
        
        // Parameter validation
        const paramInputs = ['emaFloor', 'emaCeiling', 'volFloor', 'volCeiling', 'smoothLength', 'forceBuyThreshold'];
        paramInputs.forEach(id => {
            document.getElementById(id).addEventListener('blur', () => this.validateParameter(id));
        });
        
        // Advanced parameters toggle
        document.getElementById('toggleAdvanced').addEventListener('click', () => this.toggleAdvancedParams());
        
        // Reset parameters
        document.getElementById('resetParams').addEventListener('click', () => this.resetToDefaults());
        
        // Real-time parameter count update
        paramInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateParameterCount());
        });
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
        const value = input.value.trim();
        
        let isValid = true;
        let message = '';
        
        try {
            const parsed = this.parseParameterValues(value);
            
            if (parsed.length === 0) {
                isValid = false;
                message = 'At least one value required';
            } else if (parsed.some(v => isNaN(v))) {
                isValid = false;
                message = 'All values must be numbers';
            } else {
                // Parameter-specific validation
                switch (paramId) {
                    case 'emaFloor':
                    case 'emaCeiling':
                        if (parsed.some(v => v < 1 || v > 200)) {
                            isValid = false;
                            message = 'EMA periods should be between 1 and 200';
                        }
                        break;
                    case 'volFloor':
                    case 'volCeiling':
                        if (parsed.some(v => v < 0 || v > 10)) {
                            isValid = false;
                            message = 'Volatility values should be between 0 and 10';
                        }
                        break;
                    case 'smoothLength':
                        if (parsed.some(v => v < 1 || v > 20)) {
                            isValid = false;
                            message = 'Smooth length should be between 1 and 20';
                        }
                        break;
                    case 'forceBuyThreshold':
                        if (parsed.some(v => v > 0 || v < -50)) {
                            isValid = false;
                            message = 'Force buy threshold should be between -50 and 0';
                        }
                        break;
                }
            }
        } catch (error) {
            isValid = false;
            message = 'Invalid format. Use comma-separated numbers (e.g., 1,2,3)';
        }
        
        this.updateValidationStatus(paramId, isValid, message);
        this.updateParameterCount();
        
        return isValid;
    }

    /**
     * Parse parameter values from string
     */
    parseParameterValues(valueString) {
        return valueString.split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0)
            .map(v => parseFloat(v));
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
            countElement.innerHTML = `
                <strong>${combinations.toLocaleString()}</strong> parameter combinations
                <br><small>Estimated runtime: ${timeEstimate}</small>
            `;
            
            // Warn if too many combinations
            if (combinations > 10000) {
                countElement.classList.add('warning');
                countElement.innerHTML += '<br><small style="color: #c53030;">⚠️ Large number of combinations - consider reducing parameters</small>';
            } else {
                countElement.classList.remove('warning');
            }
            
        } catch (error) {
            // Don't update count if parameters are invalid
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
        const msPerCombination = 5; // Rough estimate
        const totalMs = combinations * msPerCombination;
        
        if (totalMs < 1000) return `${totalMs}ms`;
        if (totalMs < 60000) return `${(totalMs / 1000).toFixed(1)}s`;
        return `${(totalMs / 60000).toFixed(1)}m`;
    }

    /**
     * Toggle advanced parameters visibility
     */
    toggleAdvancedParams() {
        const advancedParams = document.querySelector('.advanced-params');
        const toggleBtn = document.getElementById('toggleAdvanced');
        
        if (advancedParams.style.display === 'none') {
            advancedParams.style.display = 'block';
            toggleBtn.textContent = 'Hide Advanced Parameters';
        } else {
            advancedParams.style.display = 'none';
            toggleBtn.textContent = 'Show Advanced Parameters';
        }
    }

    /**
     * Reset all parameters to defaults
     */
    resetToDefaults() {
        document.getElementById('emaFloor').value = '5,10,15,20';
        document.getElementById('emaCeiling').value = '30,40,50,60';
        document.getElementById('volFloor').value = '0.5,1.0';
        document.getElementById('volCeiling').value = '1.5,2.0';
        document.getElementById('smoothLength').value = '2,3';
        document.getElementById('forceBuyThreshold').value = '-5,-6,-7';
        document.getElementById('voltScale').value = '1.0';
        document.getElementById('positionSize').value = '1.0';
        document.getElementById('feesSlippage').value = '0.1';
        document.getElementById('volatilityWindow').value = '20';
        
        this.updateParameterCount();
    }

    /**
     * Get market data configuration
     */
    getMarketDataConfig() {
        return {
            symbol: document.getElementById('symbol').value,
            interval: document.getElementById('interval').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        };
    }

    /**
     * Get strategy parameters
     */
    getStrategyParameters() {
        const params = {};
        
        // Basic parameters
        params.emaFloor = this.parseParameterValues(document.getElementById('emaFloor').value);
        params.emaCeiling = this.parseParameterValues(document.getElementById('emaCeiling').value);
        params.volFloor = this.parseParameterValues(document.getElementById('volFloor').value);
        params.volCeiling = this.parseParameterValues(document.getElementById('volCeiling').value);
        params.smoothLength = this.parseParameterValues(document.getElementById('smoothLength').value);
        params.forceBuyThreshold = this.parseParameterValues(document.getElementById('forceBuyThreshold').value);
        
        // Advanced parameters
        params.voltScale = this.parseParameterValues(document.getElementById('voltScale').value);
        params.positionSize = this.parseParameterValues(document.getElementById('positionSize').value);
        
        // Single values
        params.feesSlippage = parseFloat(document.getElementById('feesSlippage').value) / 100; // Convert to decimal
        params.volatilityWindow = parseInt(document.getElementById('volatilityWindow').value);
        
        return params;
    }

    /**
     * Validate all form inputs
     */
    validateAll() {
        const dateValid = this.validateDateRange();
        
        const paramIds = ['emaFloor', 'emaCeiling', 'volFloor', 'volCeiling', 'smoothLength', 'forceBuyThreshold'];
        const paramValidations = paramIds.map(id => this.validateParameter(id));
        
        return dateValid && paramValidations.every(v => v);
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