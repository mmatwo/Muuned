/**
* Portfolio Backtester
* Handles portfolio management, trade execution, and performance metrics
*/
class PortfolioBacktester {
constructor(options = {}) {
    this.initialCoins = options.initialCoins || 1.0;
    this.positionSize = options.positionSize || 1.0;
    this.feesAndSlippage = options.feesAndSlippage || 0.001; // 0.1% default
    
    this.reset();
}

/**
 * Reset backtester to initial state
 */
reset() {
    this.coinBalance = this.initialCoins;
    this.usdtBalance = 0.0;
    this.trades = [];
    this.portfolioValues = [];
    this.totalFeesPaid = 0.0;
}

/**
 * Apply fees and slippage to trade amount
 */
applyFeesAndSlippage(amount, price, tradeType) {
    const impact = tradeType === 'buy' ? (1 - this.feesAndSlippage) : (1 + this.feesAndSlippage);
    const feeAmount = amount * price * this.feesAndSlippage;
    this.totalFeesPaid += feeAmount;
    
    return amount * impact;
}

/**
 * Calculate total portfolio value in USDT
 */
calculateTotalValue(currentPrice) {
    return this.coinBalance * currentPrice + this.usdtBalance;
}

/**
 * Execute a trade based on signal
 */
executeTrade(candleIndex, candle, signal) {
    const price = candle.close;
    let trade = null;

    if (signal === -1 && this.coinBalance > 0) {
        // Sell signal
        const coinsToSell = this.coinBalance * this.positionSize;
        const usdtReceived = this.applyFeesAndSlippage(coinsToSell, price, 'sell') * price;
        
        this.coinBalance -= coinsToSell;
        this.usdtBalance += usdtReceived;
        
        trade = {
            index: candleIndex,
            timestamp: candle.timestamp,
            type: 'sell',
            price: price,
            amount: coinsToSell,
            value: usdtReceived,
            coinBalance: this.coinBalance,
            usdtBalance: this.usdtBalance,
            totalValue: this.calculateTotalValue(price),
            fees: coinsToSell * price * this.feesAndSlippage
        };

    } else if (signal === 1 && this.usdtBalance > 0) {
        // Buy signal
        const theoreticalCoins = this.usdtBalance / price;
        const coinsToBuy = this.applyFeesAndSlippage(theoreticalCoins, price, 'buy');
        const usdtSpent = this.usdtBalance;
        
        this.coinBalance += coinsToBuy;
        this.usdtBalance = 0;
        
        trade = {
            index: candleIndex,
            timestamp: candle.timestamp,
            type: 'buy',
            price: price,
            amount: coinsToBuy,
            value: usdtSpent,
            coinBalance: this.coinBalance,
            usdtBalance: this.usdtBalance,
            totalValue: this.calculateTotalValue(price),
            fees: usdtSpent * this.feesAndSlippage
        };
    }

    if (trade) {
        this.trades.push(trade);
    }

    return trade;
}

/**
 * Run complete backtest and return lightweight metrics
 */
run(candleData, signals) {
    this.reset();
    
    if (!candleData || !signals || candleData.length !== signals.length) {
        throw new Error('Invalid input data: candle data and signals must have same length');
    }

    const startValue = this.initialCoins * candleData[0].close;
    let tradeCount = 0;
    const trades = []; // Keep minimal trade data for win/loss calculation

    // Process each candle
    for (let i = 0; i < candleData.length; i++) {
        const candle = candleData[i];
        const signal = signals[i];
        
        // Execute trade if signal present
        if (signal !== 0) {
            const trade = this.executeTrade(i, candle, signal);
            if (trade) {
                tradeCount++;
                // Store only essential trade data for metrics calculation
                trades.push({
                    type: trade.type,
                    price: trade.price,
                    amount: trade.amount,
                    index: i
                });
            }
        }
        
        // Track only final portfolio value (not full history)
        this.portfolioValues.push(this.calculateTotalValue(candle.close));
    }

    // Calculate lightweight metrics
    return this.calculateLightweightMetrics(candleData, trades, startValue);
}

/**
 * Calculate essential metrics without storing heavy data
 */
calculateLightweightMetrics(candleData, trades, startValue) {
    const finalPrice = candleData[candleData.length - 1].close;
    const finalValue = this.calculateTotalValue(finalPrice);
    
    // Calculate trade pairs for win/loss analysis
    const tradePairs = this.calculateTradePairsFromMinimalData(trades);
    const winningTrades = tradePairs.filter(pair => pair.profit > 0);
    
    // Calculate drawdown from portfolio values
    const maxDrawdown = this.calculateMaxDrawdown(this.portfolioValues);
    
    const metrics = {
        // Essential portfolio metrics
        initialValue: startValue,
        finalValue: finalValue,
        totalReturn: ((finalValue / startValue) - 1) * 100,
        
        // Trade metrics
        totalTrades: trades.length,
        winRate: tradePairs.length > 0 ? (winningTrades.length / tradePairs.length) * 100 : 0,
        
        // Profit/Loss metrics
        avgProfit: winningTrades.length > 0 ? 
            winningTrades.reduce((sum, trade) => sum + trade.profit, 0) / winningTrades.length : 0,
        
        // Risk metrics
        maxDrawdown: maxDrawdown,
        maxDrawdownPct: startValue > 0 ? (maxDrawdown / startValue) * 100 : 0,
        
        // Position info (only final state)
        finalCoinBalance: this.coinBalance,
        finalUsdtBalance: this.usdtBalance,
        
        // Status
        isActive: this.coinBalance > 0,
        
        // Minimal metadata
        startDate: new Date(candleData[0].timestamp),
        endDate: new Date(candleData[candleData.length - 1].timestamp),
        
        // Fee info
        totalFees: this.totalFeesPaid
    };

    // Clear heavy arrays immediately after calculation
    this.portfolioValues = [];
    
    return metrics;
}

/**
 * Calculate trade pairs from minimal trade data
 */
calculateTradePairsFromMinimalData(trades) {
    const pairs = [];
    let currentBuy = null;
    
    for (const trade of trades) {
        if (trade.type === 'buy') {
            currentBuy = trade;
        } else if (trade.type === 'sell' && currentBuy) {
            const profit = (trade.price - currentBuy.price) * currentBuy.amount;
            pairs.push({
                profit: profit,
                profitPct: ((trade.price - currentBuy.price) / currentBuy.price) * 100,
                holdingPeriod: trade.index - currentBuy.index
            });
            currentBuy = null;
        }
    }
    
    return pairs;
}

/**
 * Calculate trade pairs (buy-sell cycles) for win/loss analysis
 */
calculateTradePairs() {
    const pairs = [];
    let currentBuy = null;
    
    for (const trade of this.trades) {
        if (trade.type === 'buy') {
            currentBuy = trade;
        } else if (trade.type === 'sell' && currentBuy) {
            const profit = (trade.price - currentBuy.price) * currentBuy.amount;
            pairs.push({
                buyTrade: currentBuy,
                sellTrade: trade,
                profit: profit,
                profitPct: ((trade.price - currentBuy.price) / currentBuy.price) * 100,
                holdingPeriod: trade.index - currentBuy.index
            });
            currentBuy = null;
        }
    }
    
    return pairs;
}

/**
     * Calculate maximum drawdown from portfolio values array
     */
calculateMaxDrawdown(portfolioValues) {
    if (!portfolioValues || portfolioValues.length === 0) return 0;
    
    let peak = portfolioValues[0];
    let maxDrawdown = 0;
    
    for (const value of portfolioValues) {
        if (value > peak) {
            peak = value;
        }
        
        const drawdown = peak - value;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    
    return maxDrawdown;
}

/**
 * Get detailed trade log
 */
getTradeLog() {
    return this.trades.map(trade => ({
        ...trade,
        date: new Date(trade.timestamp).toISOString().split('T')[0],
        time: new Date(trade.timestamp).toTimeString().split(' ')[0]
    }));
}

/**
 * Get portfolio value history
 */
getPortfolioHistory() {
    return this.portfolioValues.map(value => ({
        ...value,
        date: new Date(value.timestamp).toISOString().split('T')[0]
    }));
}

/**
 * Export results to CSV format
 */
exportToCsv() {
    const headers = ['Date', 'Time', 'Type', 'Price', 'Amount', 'Value', 'Fees', 'Coin Balance', 'USDT Balance', 'Total Value'];
    const rows = this.trades.map(trade => [
        new Date(trade.timestamp).toISOString().split('T')[0],
        new Date(trade.timestamp).toTimeString().split(' ')[0],
        trade.type.toUpperCase(),
        trade.price.toFixed(8),
        trade.amount.toFixed(8),
        trade.value.toFixed(2),
        trade.fees.toFixed(2),
        trade.coinBalance.toFixed(8),
        trade.usdtBalance.toFixed(2),
        trade.totalValue.toFixed(2)
    ]);
    
    return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
}

/**
 * Validate backtest configuration
 */
static validateConfig(config) {
    const errors = [];
    
    if (!config.initialCoins || config.initialCoins <= 0) {
        errors.push('Initial coins must be positive');
    }
    
    if (config.positionSize <= 0 || config.positionSize > 1) {
        errors.push('Position size must be between 0 and 1');
    }
    
    if (config.feesAndSlippage < 0 || config.feesAndSlippage > 0.1) {
        errors.push('Fees and slippage must be between 0 and 10%');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
}

/**
* Batch Backtest Engine
* Manages running multiple backtests efficiently
*/
class BacktestEngine {
constructor() {
    this.isRunning = false;
    this.results = [];
}

/**
 * Run single backtest (updated interface for custom scripts)
 */
async runSingle(processedData, params) {
    try {
        console.log('[Muuned] BacktestEngine.runSingle called with:');
        console.log('processedData structure:', {
            hasCandles: !!processedData.candles,
            candlesLength: processedData.candles ? processedData.candles.length : 0,
            hasPrices: !!processedData.prices,
            pricesStructure: processedData.prices ? Object.keys(processedData.prices) : 'none',
            ohlc4Type: processedData.prices && processedData.prices.ohlc4 ? typeof processedData.prices.ohlc4 : 'undefined',
            ohlc4IsArray: processedData.prices && processedData.prices.ohlc4 ? Array.isArray(processedData.prices.ohlc4) : false,
            ohlc4Length: processedData.prices && processedData.prices.ohlc4 ? processedData.prices.ohlc4.length : 0,
            closeType: processedData.prices && processedData.prices.close ? typeof processedData.prices.close : 'undefined',
            closeIsArray: processedData.prices && processedData.prices.close ? Array.isArray(processedData.prices.close) : false,
            closeLength: processedData.prices && processedData.prices.close ? processedData.prices.close.length : 0
        });
        console.log('params:', params);
        
        // Create custom strategy that uses the script editor
        const strategy = new CustomScriptStrategy(window.muunedApp.scriptEditor, params);
        const signalData = strategy.calculateSignals(
            processedData.prices.ohlc4,  // Use pre-calculated OHLC4
            processedData.prices.close   // Use pre-calculated close prices
        );
        
        // Run backtest with lightweight result
        const backtester = new PortfolioBacktester({
            initialCoins: 1.0,
            positionSize: params.positionSize,
            feesAndSlippage: params.feesSlippage
        });
        
        const metrics = backtester.run(processedData.candles, signalData.signals);
        
        // Return lightweight result - no trade history or signal arrays
        return {
            parameters: params,
            ...metrics,
            signalCount: signalData.signalCount  // Just the count, not the full array
        };
        
    } catch (error) {
        console.error(`[Muuned] Error in runSingle:`, error);
        throw error;
    }
}

/**
 * Run batch with performance monitoring and memory management
 */
async runBatch(processedData, parameterSets, onProgress = null) {
    this.isRunning = true;
    this.results = [];
    
    const performanceMonitor = new PerformanceMonitor();
    const batchSize = 50; // Process in smaller batches for better memory management
    const totalBatches = Math.ceil(parameterSets.length / batchSize);
    
    performanceMonitor.logMemory('Batch processing start');
    
    try {
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            performanceMonitor.startTimer(`batch_${batchIndex}`);
            
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, parameterSets.length);
            const batch = parameterSets.slice(batchStart, batchEnd);
            
            // Process batch
            const batchResults = [];
            for (const params of batch) {
                try {
                    const result = await this.runSingle(processedData, params);
                    batchResults.push(result);
                } catch (error) {
                    console.error(`[Muuned] Error in backtest:`, error);
                    batchResults.push(this.createErrorResult(params, error));
                }
            }
            
            this.results.push(...batchResults);
            
            const batchTime = performanceMonitor.endTimer(`batch_${batchIndex}`);
            performanceMonitor.logBatchPerformance(batchIndex, totalBatches, batch.length, batchTime);
            
            if (onProgress) {
                onProgress(batchEnd / parameterSets.length, batchEnd, parameterSets.length);
            }
            
            // Memory management: Force cleanup between batches
            if ((batchIndex + 1) % 5 === 0) {
                // Clear intermediate variables and suggest GC every 5 batches
                batchResults.length = 0;
                if (window.gc) {
                    window.gc();
                }
                await new Promise(resolve => setTimeout(resolve, 10)); // Brief pause for GC
            }
            
            // Yield control to prevent blocking UI
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        // Sort results by performance
        this.results.sort((a, b) => b.finalValue - a.finalValue);
        
        // Generate performance summary
        performanceMonitor.generateSummary(parameterSets.length);
        performanceMonitor.logMemory('Batch processing complete');
        
        return this.results;
        
    } finally {
        this.isRunning = false;
    }
}

/**
 * Create error result for failed backtest
 */
createErrorResult(params, error) {
    return {
        parameters: params,
        initialValue: 0,
        finalValue: 0,
        totalReturn: -100,
        winRate: 0,
        totalTrades: 0,
        maxDrawdown: 0,
        error: error.message,
        isActive: false
    };
}

/**
 * Stop running backtests
 */
stop() {
    this.isRunning = false;
}

/**
 * Get current status
 */
getStatus() {
    return {
        isRunning: this.isRunning,
        resultsCount: this.results.length
    };
}
}