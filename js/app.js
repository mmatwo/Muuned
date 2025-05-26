/**
 * Main Application Controller
 * Orchestrates the entire Muuned backtesting application
 */
class MuunedApp {
    constructor() {
        this.binanceAPI = new BinanceAPI();
        this.dataManager = new DataManager();
        this.scriptEditor = new ScriptEditor('script-editor'); // Back to original class name
        this.parameterForm = new ParameterForm();
        this.progressBar = null;
        this.resultsDisplay = null;
        this.backtester = null;
        
        this.currentData = null;
        this.isRunning = false;
        this.marketDataCache = new Map(); // Add market data cache

        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        console.log('🚀 Initializing Muuned Application...');
        
        try {
            // Initialize core components
            this.dataManager = new DataManager();
            this.progressBar = new ProgressBar('progress-container');
            this.resultsDisplay = new ResultsDisplay('results-display', 'results-container');
            this.backtester = new BacktestEngine();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Connect script editor to parameter form
            this.connectScriptEditorToParameterForm();
            
            // Check API connectivity
            await this.checkAPIConnectivity();
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    /**
     * Connect script editor changes to parameter form updates
     */
    connectScriptEditorToParameterForm() {
        // Set up the callback to update parameters when script changes
        this.scriptEditor.onScriptChange = (script) => {
            console.log('[Muuned] Script changed, updating parameters...');
            this.parameterForm.updateParametersFromScript(script);
        };
        
        // Listen for parameter form updates
        this.parameterForm.on('parametersUpdated', (discovery) => {
            console.log(`[Muuned] Parameters updated: ${discovery.totalCount} parameters found`);
        });
    }

    /**
     * Setup event listeners for the application
     */
    setupEventListeners() {
        // Run backtest button
        const runButton = document.getElementById('run-backtest');
        runButton.addEventListener('click', () => this.runBacktest());
        
        // Parameter form validation
        this.parameterForm.on('parametersChanged', () => this.onParametersChanged());
        
        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.isRunning) {
                e.preventDefault();
                e.returnValue = 'Backtest is still running. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Check API connectivity
     */
    async checkAPIConnectivity() {
        const statusElement = document.getElementById('data-status');
        
        try {
            statusElement.innerHTML = '<span class="status-processing">⏳ Checking API...</span>';
            
            const isConnected = await this.binanceAPI.checkConnectivity();
            
            if (isConnected) {
                statusElement.innerHTML = '<span class="status-ready">✅ API Connected</span>';
            } else {
                statusElement.innerHTML = '<span class="status-loading">❌ API Unavailable</span>';
                this.showWarning('Binance API is not accessible. Please check your internet connection.');
            }
            
        } catch (error) {
            console.error('API connectivity check failed:', error);
            statusElement.innerHTML = '<span class="status-loading">❌ Connection Error</span>';
            this.showWarning('Failed to connect to Binance API: ' + error.message);
        }
    }

    /**
     * Handle parameter changes
     */
    onParametersChanged() {
        // Clear previous results when parameters change
        this.resultsDisplay.clear();
        
        // Update UI state
        this.updateRunButtonState();
    }

    /**
     * Update run button state based on form validation
     */
    updateRunButtonState() {
        const runButton = document.getElementById('run-backtest');
        const isValid = this.parameterForm.validateAll();
        
        runButton.disabled = !isValid || this.isRunning;
        
        if (!isValid) {
            runButton.textContent = '⚠️ Fix Parameters';
        } else if (this.isRunning) {
            runButton.textContent = '⏳ Running...';
        } else {
            runButton.textContent = '🚀 Run Backtest';
        }
    }

    /**
     * Main backtest execution function (updated for optimized processing)
     */
    async runBacktest() {
        if (this.isRunning) return;
        
        try {
            this.isRunning = true;
            this.updateRunButtonState();
            
            // Reset trade cache and button states from previous backtests
            this.resultsDisplay.resetTradeCache();

            // Validate inputs
            if (!this.parameterForm.validateAll()) {
                throw new Error('Please fix parameter validation errors before running');
            }
            
            // Get configuration 
            const marketConfig = this.parameterForm.getMarketDataConfig();
            const strategyParams = this.parameterForm.getStrategyParameters();

            console.log('📊 Starting optimized backtest with config:', { marketConfig, strategyParams });
            
            // Step 1: Load and process market data (with pre-calculated arrays)
            await this.loadMarketData(marketConfig);
            
            // Step 2: Generate parameter combinations
            const parameterSets = this.generateParameterCombinations(strategyParams);
            console.log(`🔄 Testing ${parameterSets.length} parameter combinations`);
            
            // Step 3: Run optimized backtests
            const results = await this.runParallelBacktests(parameterSets, marketConfig);

            // Step 4: Display results
            this.resultsDisplay.displayResults(results);
            
            console.log('✅ Backtest completed successfully');
            this.showSuccess(`Completed ${parameterSets.length} backtests successfully!`);
            
        } catch (error) {
            console.error('❌ Backtest failed:', error);
            this.showError('Backtest failed: ' + error.message);
        } finally {
            this.isRunning = false;
            this.progressBar.hide();
            this.updateRunButtonState();
            
            // Optional: Clear cache after backtest to free memory
            // this.dataManager.clearCache();
        }
    }

    /**
     * Generate cache key for market data
     */
    generateMarketDataCacheKey(config) {
        return `${config.symbol}-${config.interval}-${config.startDate}-${config.endDate}`;
    }
    
    async loadMarketData(config) {
        console.log('📥 Loading market data...');
        
        // Generate cache key
        const cacheKey = this.generateMarketDataCacheKey(config);
        
        // Check if data is already cached
        if (this.marketDataCache.has(cacheKey)) {
            console.log('✅ Using cached market data');
            this.currentData = this.marketDataCache.get(cacheKey);
            
            // Update data status
            const statusElement = document.getElementById('data-status');
            const candleCount = this.currentData.metadata.length;
            statusElement.innerHTML = `<span class="status-ready">✅ ${candleCount} candles (cached)</span>`;
            
            return this.currentData;
        }
        
        // Data not cached, fetch from API
        this.progressBar.show();
        this.progressBar.updateProgress(0, 'Loading market data...');
        
        // Fetch raw data from Binance
        const rawData = await this.binanceAPI.fetchHistoricalData(
            config.symbol,
            config.interval,
            config.startDate,
            config.endDate,
            (progress) => {
                this.progressBar.updateProgress(progress * 0.3, `Loading data: ${Math.round(progress * 100)}%`);
            }
        );
        
        if (!rawData || rawData.length === 0) {
            throw new Error('No market data loaded');
        }
        
        // Process data with pre-calculated arrays
        this.dataManager.setSymbol(config.symbol);
        this.currentData = this.dataManager.processMarketData(rawData);
        
        // Cache the processed data
        this.marketDataCache.set(cacheKey, this.currentData);
        console.log(`✅ Loaded, processed, and cached ${rawData.length} candles`);
        
        // Update data status
        const statusElement = document.getElementById('data-status');
        statusElement.innerHTML = `<span class="status-ready">✅ ${rawData.length} candles processed</span>`;
        
        return this.currentData;
    }

    /**
     * Generate all parameter combinations
     */
    generateParameterCombinations(params) {
        const keys = Object.keys(params).filter(key => Array.isArray(params[key]));
        const values = keys.map(key => params[key]);
        
        const combinations = [];
        
        const generate = (index, current) => {
            if (index === keys.length) {
                // Add non-array parameters
                const combination = { ...current };
                Object.keys(params).forEach(key => {
                    if (!Array.isArray(params[key])) {
                        combination[key] = params[key];
                    }
                });
                combinations.push(combination);
                return;
            }
            
            for (const value of values[index]) {
                current[keys[index]] = value;
                generate(index + 1, current);
            }
        };
        
        generate(0, {});
        return combinations;
    }

    /**
     * Run backtests using the optimized batch engine
     */
    async runParallelBacktests(parameterSets, marketConfig) {
        console.log(`🔄 Starting optimized backtesting for ${parameterSets.length} combinations`);
        
        this.progressBar.updateProgress(0.3, 'Starting backtests...');
        
        // Use the optimized batch engine with market config
        const results = await this.backtester.runBatch(
            this.currentData,
            parameterSets,
            marketConfig, // Pass market config
            (progress, completed, total) => {
                const overallProgress = 0.3 + (0.7 * progress);
                this.progressBar.updateProgress(
                    overallProgress, 
                    `Processed ${completed}/${total} combinations`
                );
            }
        );
        
        console.log(`✅ Completed ${parameterSets.length} backtests`);
        return results;
    }

    /**
     * Utility functions
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Add click to dismiss
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasData: !!this.currentData,
            dataLength: this.currentData ? this.currentData.metadata.length : 0,
            apiConnected: true // Will be updated by connectivity check
        };
    }
    
    // Add method to clear cache if needed
    clearMarketDataCache() {
        this.marketDataCache.clear();
        console.log('[Muuned] Market data cache cleared');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 Starting Muuned Application...');
    window.muunedApp = new MuunedApp();
});