/**
 * Data Manager
 * Handles data processing, caching, and pre-calculation of shared arrays
 */
class DataManager {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.performanceMonitor = new PerformanceMonitor();
    }

    /**
     * Process and cache market data with pre-calculated arrays
     * @param {Array} candleData - Raw candle data from API
     * @returns {Object} Processed data with shared arrays
     */
    processMarketData(candleData) {
        this.performanceMonitor.startTimer('dataProcessing');
        this.performanceMonitor.logMemory('Before data processing');

        console.log(`[Muuned] Processing ${candleData.length} candles...`);

        // Store raw data
        this.rawData = candleData;

        // Pre-calculate shared price arrays (create once, use everywhere)
        const ohlc4Prices = this.calculateOHLC4(candleData);
        const closePrices = candleData.map(candle => candle.close);
        const hlc3Prices = this.calculateHLC3(candleData);
        const hl2Prices = this.calculateHL2(candleData);

        // Debug logging for price arrays
        console.log('[Muuned] Price arrays created:');
        console.log('OHLC4 length:', ohlc4Prices.length, 'isArray:', Array.isArray(ohlc4Prices));
        console.log('Close length:', closePrices.length, 'isArray:', Array.isArray(closePrices));
        console.log('Sample OHLC4 values:', ohlc4Prices.slice(0, 3));
        console.log('Sample Close values:', closePrices.slice(0, 3));

        // Create processed data object
        this.processedData = {
            candles: candleData,
            prices: {
                ohlc4: ohlc4Prices,
                close: closePrices,
                hlc3: hlc3Prices,
                hl2: hl2Prices
            },
            metadata: {
                length: candleData.length,
                startDate: new Date(candleData[0].timestamp),
                endDate: new Date(candleData[candleData.length - 1].timestamp),
                symbol: this.extractSymbol(candleData),
                processed: new Date()
            }
        };

        const processingTime = this.performanceMonitor.endTimer('dataProcessing');
        this.performanceMonitor.logMemory('After data processing');
        
        console.log(`[Muuned] Data processing completed in ${processingTime}ms`);
        console.log(`[Muuned] Pre-calculated arrays: OHLC4(${ohlc4Prices.length}), Close(${closePrices.length})`);

        return this.processedData;
    }

    /**
     * Calculate OHLC4 prices (shared array, calculated once)
     * @param {Array} candles - Candle data
     * @returns {Array} OHLC4 prices
     */
    calculateOHLC4(candles) {
        return candles.map(candle => 
            (candle.open + candle.high + candle.low + candle.close) / 4
        );
    }

    /**
     * Calculate HLC3 prices
     * @param {Array} candles - Candle data
     * @returns {Array} HLC3 prices
     */
    calculateHLC3(candles) {
        return candles.map(candle => 
            (candle.high + candle.low + candle.close) / 3
        );
    }

    /**
     * Calculate HL2 prices
     * @param {Array} candles - Candle data
     * @returns {Array} HL2 prices
     */
    calculateHL2(candles) {
        return candles.map(candle => 
            (candle.high + candle.low) / 2
        );
    }

    /**
     * Extract symbol from candle data (if available)
     * @param {Array} candles - Candle data
     * @returns {string} Symbol or 'UNKNOWN'
     */
    extractSymbol(candles) {
        // This would be set by the API caller
        return this.symbol || 'UNKNOWN';
    }

    /**
     * Get processed data (lightweight reference)
     * @returns {Object} Processed data object
     */
    getProcessedData() {
        if (!this.processedData) {
            throw new Error('No data has been processed. Call processMarketData() first.');
        }
        return this.processedData;
    }

    /**
     * Get specific price array by type
     * @param {string} priceType - Type of price ('ohlc4', 'close', 'hlc3', 'hl2')
     * @returns {Array} Price array
     */
    getPriceArray(priceType = 'ohlc4') {
        if (!this.processedData) {
            throw new Error('No data has been processed.');
        }
        
        const prices = this.processedData.prices[priceType];
        if (!prices) {
            throw new Error(`Price type '${priceType}' not available. Available: ${Object.keys(this.processedData.prices).join(', ')}`);
        }
        
        return prices;
    }

    /**
     * Get candle data
     * @returns {Array} Raw candle data
     */
    getCandleData() {
        if (!this.processedData) {
            throw new Error('No data has been processed.');
        }
        return this.processedData.candles;
    }

    /**
     * Get data metadata
     * @returns {Object} Metadata object
     */
    getMetadata() {
        if (!this.processedData) {
            throw new Error('No data has been processed.');
        }
        return this.processedData.metadata;
    }

    /**
     * Set symbol for metadata
     * @param {string} symbol - Trading symbol
     */
    setSymbol(symbol) {
        this.symbol = symbol;
        if (this.processedData) {
            this.processedData.metadata.symbol = symbol;
        }
    }

    /**
     * Clear cached data to free memory
     */
    clearCache() {
        this.performanceMonitor.logMemory('Before cache clear');
        
        this.rawData = null;
        this.processedData = null;
        
        // Force garbage collection hint
        if (window.gc) {
            window.gc();
        }
        
        this.performanceMonitor.logMemory('After cache clear');
        console.log('[Muuned] Data cache cleared');
    }

    /**
     * Get memory usage statistics
     * @returns {Object} Memory statistics
     */
    getMemoryStats() {
        const stats = {
            hasRawData: !!this.rawData,
            hasProcessedData: !!this.processedData,
            candleCount: this.processedData ? this.processedData.metadata.length : 0,
            priceArrays: this.processedData ? Object.keys(this.processedData.prices).length : 0
        };

        if (performance.memory) {
            stats.heapUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            stats.heapTotal = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            stats.heapLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        }

        return stats;
    }

    /**
     * Validate data integrity
     * @returns {Object} Validation result
     */
    validateData() {
        if (!this.processedData) {
            return { isValid: false, error: 'No processed data available' };
        }

        const { candles, prices } = this.processedData;
        
        if (!candles || candles.length === 0) {
            return { isValid: false, error: 'No candle data' };
        }

        // Check that all price arrays have the same length
        const expectedLength = candles.length;
        for (const [type, priceArray] of Object.entries(prices)) {
            if (priceArray.length !== expectedLength) {
                return { 
                    isValid: false, 
                    error: `Price array '${type}' length mismatch: expected ${expectedLength}, got ${priceArray.length}` 
                };
            }
        }

        // Check for NaN values in price arrays
        for (const [type, priceArray] of Object.entries(prices)) {
            const nanCount = priceArray.filter(price => isNaN(price)).length;
            if (nanCount > 0) {
                return { 
                    isValid: false, 
                    error: `Price array '${type}' contains ${nanCount} NaN values` 
                };
            }
        }

        return { isValid: true };
    }
}

/**
 * Performance Monitor
 * Tracks system resource usage and performance metrics
 */
class PerformanceMonitor {
    constructor() {
        this.timers = new Map();
        this.memorySnapshots = [];
        this.startTime = performance.now();
        this.lastMemoryCheck = 0;
    }

    /**
     * Start a named timer
     * @param {string} name - Timer name
     */
    startTimer(name) {
        this.timers.set(name, performance.now());
    }

    /**
     * End a named timer and return duration
     * @param {string} name - Timer name
     * @returns {number} Duration in milliseconds
     */
    endTimer(name) {
        const startTime = this.timers.get(name);
        if (!startTime) {
            console.warn(`[Muuned] Timer '${name}' not found`);
            return 0;
        }
        
        const duration = performance.now() - startTime;
        this.timers.delete(name);
        return Math.round(duration * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Log current memory usage
     * @param {string} context - Context description
     */
    logMemory(context = '') {
        if (!performance.memory) {
            return; // Memory API not available
        }

        const now = performance.now();
        const memory = {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
            timestamp: now,
            context: context
        };

        this.memorySnapshots.push(memory);

        // Log to console if significant change or requested
        const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 2];
        if (!lastSnapshot || context || Math.abs(memory.used - lastSnapshot.used) > 5) {
            const contextStr = context ? ` (${context})` : '';
            console.log(`[Muuned] Memory${contextStr}: ${memory.used}MB used / ${memory.total}MB total`);
        }

        // Warn if memory usage is high
        if (memory.used > memory.limit * 0.8) {
            console.warn(`[Muuned] ⚠️ High memory usage: ${memory.used}MB (${Math.round(memory.used/memory.limit*100)}% of limit)`);
        }

        this.lastMemoryCheck = now;
        
        // Keep only recent snapshots to prevent memory leak in monitor itself
        if (this.memorySnapshots.length > 100) {
            this.memorySnapshots = this.memorySnapshots.slice(-50);
        }
    }

    /**
     * Log batch processing performance
     * @param {number} batchIndex - Current batch index
     * @param {number} totalBatches - Total number of batches
     * @param {number} combinationsInBatch - Combinations processed in this batch
     * @param {number} batchTime - Time taken for this batch
     */
    logBatchPerformance(batchIndex, totalBatches, combinationsInBatch, batchTime) {
        const totalCompleted = batchIndex * combinationsInBatch;
        const rate = Math.round(combinationsInBatch / (batchTime / 1000));
        
        // Check for performance degradation
        const isSlowing = this.detectPerformanceDegradation(rate);
        const slowingIndicator = isSlowing ? ' ⚠️ Slowing' : '';
        
        console.log(`[Muuned] Batch ${batchIndex + 1}/${totalBatches}: ${combinationsInBatch} combinations in ${batchTime}ms (${rate}/sec)${slowingIndicator}`);
        
        // Log memory every few batches
        if ((batchIndex + 1) % 3 === 0 || isSlowing) {
            this.logMemory(`Batch ${batchIndex + 1}`);
        }

        // Suggest GC if memory usage is growing rapidly
        if (this.shouldSuggestGC()) {
            console.log('[Muuned] 🔄 Consider triggering garbage collection');
        }
    }

    /**
     * Detect if processing is slowing down
     * @param {number} currentRate - Current processing rate
     * @returns {boolean} True if slowing detected
     */
    detectPerformanceDegradation(currentRate) {
        const recentRates = this.getRecentProcessingRates();
        if (recentRates.length < 3) return false;

        const avgRecentRate = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
        const baseline = recentRates[0]; // First rate as baseline

        return currentRate < baseline * 0.7; // 30% slower than baseline
    }

    /**
     * Get recent processing rates for trend analysis
     * @returns {Array} Recent processing rates
     */
    getRecentProcessingRates() {
        // This would store rates from recent batches
        // For now, return empty array - could be enhanced
        return [];
    }

    /**
     * Determine if garbage collection should be suggested
     * @returns {boolean} True if GC is recommended
     */
    shouldSuggestGC() {
        if (!performance.memory || this.memorySnapshots.length < 5) return false;

        const recent = this.memorySnapshots.slice(-5);
        const memoryGrowth = recent[recent.length - 1].used - recent[0].used;
        
        return memoryGrowth > 20; // Suggest GC if memory grew by >20MB recently
    }

    /**
     * Generate performance summary
     * @param {number} totalCombinations - Total combinations processed
     * @returns {Object} Performance summary
     */
    generateSummary(totalCombinations) {
        const totalTime = performance.now() - this.startTime;
        const avgRate = Math.round(totalCombinations / (totalTime / 1000));
        
        const summary = {
            totalTime: Math.round(totalTime),
            totalCombinations: totalCombinations,
            averageRate: avgRate,
            memoryPeak: this.getMemoryPeak(),
            memorySnapshots: this.memorySnapshots.length
        };

        console.log(`[Muuned] 🏁 Backtest Complete: ${totalCombinations} combinations in ${(totalTime/1000).toFixed(1)}s (Avg: ${avgRate}/sec)`);
        
        return summary;
    }

    /**
     * Get peak memory usage
     * @returns {number} Peak memory in MB
     */
    getMemoryPeak() {
        if (this.memorySnapshots.length === 0) return 0;
        return Math.max(...this.memorySnapshots.map(snap => snap.used));
    }

    /**
     * Clear performance data
     */
    reset() {
        this.timers.clear();
        this.memorySnapshots = [];
        this.startTime = performance.now();
        this.lastMemoryCheck = 0;
    }
}