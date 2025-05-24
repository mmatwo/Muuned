/**
 * Main Application Controller
 * Orchestrates the entire Muuned backtesting application
 */
class MuunedApp {
    constructor() {
        this.binanceAPI = new BinanceAPI();
        this.parameterForm = new ParameterForm();
        this.progressBar = null;
        this.resultsDisplay = null;
        this.backtester = null;
        
        this.currentData = null;
        this.isRunning = false;
        
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        console.log('🚀 Initializing Muuned Application...');
        
        try {
            // Initialize UI components
            this.progressBar = new ProgressBar('progress-container');
            this.resultsDisplay = new ResultsDisplay('results-display', 'results-container');
            this.backtester = new BacktestEngine();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check API connectivity
            await this.checkAPIConnectivity();
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
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
            statusElement.innerHTML = '<span class="status-processing">⏳ Checking Binance...</span>';
            
            const isConnected = await this.binanceAPI.checkConnectivity();
            
            if (isConnected) {
                statusElement.innerHTML = '<span class="status-ready">✅ Binance connected</span>';
            } else {
                statusElement.innerHTML = '<span class="status-loading">❌ Binance is unavailable</span>';
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
     * Main backtest execution function
     */
    async runBacktest() {
        if (this.isRunning) return;
        
        try {
            this.isRunning = true;
            this.updateRunButtonState();
            
            // Validate inputs
            if (!this.parameterForm.validateAll()) {
                throw new Error('Please fix parameter validation errors before running');
            }
            
            // Get configuration
            const marketConfig = this.parameterForm.getMarketDataConfig();
            const strategyParams = this.parameterForm.getStrategyParameters();
            
            console.log('📊 Starting backtest with config:', { marketConfig, strategyParams });
            
            // Step 1: Load market data
            await this.loadMarketData(marketConfig);
            
            // Step 2: Generate parameter combinations
            const parameterSets = this.generateParameterCombinations(strategyParams);
            console.log(`🔄 Testing ${parameterSets.length} parameter combinations`);
            
            // Step 3: Run backtests
            const results = await this.runParallelBacktests(parameterSets);
            
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
        }
    }

    /**
     * Load market data from Binance
     */
    async loadMarketData(config) {
        console.log('📥 Loading market data...');
        
        this.progressBar.show();
        this.progressBar.updateProgress(0, 'Loading market data...');
        
        this.currentData = await this.binanceAPI.fetchHistoricalData(
            config.symbol,
            config.interval,
            config.startDate,
            config.endDate,
            (progress) => {
                this.progressBar.updateProgress(progress * 0.3, `Loading data: ${Math.round(progress * 100)}%`);
            }
        );
        
        if (!this.currentData || this.currentData.length === 0) {
            throw new Error('No market data loaded');
        }
        
        console.log(`✅ Loaded ${this.currentData.length} candles`);
        
        // Update data status
        const statusElement = document.getElementById('data-status');
        statusElement.innerHTML = `<span class="status-ready">✅ ${this.currentData.length} candles loaded</span>`;
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
     * Run backtests in parallel batches
     */
    async runParallelBacktests(parameterSets) {
        const results = [];
        const batchSize = 50; // Process in batches to avoid blocking UI
        const totalBatches = Math.ceil(parameterSets.length / batchSize);
        
        this.progressBar.updateProgress(0.3, 'Running backtests...');
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, parameterSets.length);
            const batch = parameterSets.slice(batchStart, batchEnd);
            
            // Process batch
            const batchResults = await this.processBatch(batch);
            results.push(...batchResults);
            
            // Update progress
            const progress = 0.3 + (0.7 * (batchIndex + 1) / totalBatches);
            const completed = batchEnd;
            this.progressBar.updateProgress(
                progress, 
                `Processed ${completed}/${parameterSets.length} combinations`
            );
            
            // Yield control to prevent blocking
            await this.sleep(1);
        }
        
        // Sort results by performance
        return results.sort((a, b) => b.finalValue - a.finalValue);
    }

    /**
     * Process a batch of parameter combinations
     */
    async processBatch(parameterBatch) {
        const batchResults = [];
        
        for (const params of parameterBatch) {
            try {
                const result = await this.runSingleBacktest(params);
                batchResults.push(result);
            } catch (error) {
                console.error('Error in single backtest:', error);
                // Add error result to maintain count
                batchResults.push(this.createErrorResult(params, error));
            }
        }
        
        return batchResults;
    }

    /**
     * Run a single backtest with given parameters
     */
    async runSingleBacktest(params) {
        // Create strategy instance
        const strategy = new EmaDifferentialStrategy(params);
        
        // Calculate signals
        const signalData = strategy.calculateSignals(this.currentData);
        
        // Run backtest
        const backtester = new PortfolioBacktester({
            initialCoins: 1.0,
            positionSize: params.positionSize,
            feesAndSlippage: params.feesSlippage
        });
        
        const backtestResult = backtester.run(this.currentData, signalData.signals);
        
        return {
            parameters: params,
            ...backtestResult,
            signalData: signalData
        };
    }

    /**
     * Create error result for failed backtest
     */
    createErrorResult(params, error) {
        return {
            parameters: params,
            finalValue: 0,
            totalReturn: -100,
            winRate: 0,
            totalTrades: 0,
            maxDrawdown: 0,
            error: error.message
        };
    }

    /**
     * Utility functions
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

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
            dataLength: this.currentData ? this.currentData.length : 0,
            apiConnected: true // Will be updated by connectivity check
        };
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 Starting Muuned Application...');
    window.muunedApp = new MuunedApp();
});