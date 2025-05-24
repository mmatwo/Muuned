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
     * Run complete backtest
     */
    run(candleData, signals) {
        this.reset();
        
        if (!candleData || !signals || candleData.length !== signals.length) {
            throw new Error('Invalid input data: candle data and signals must have same length');
        }

        // Process each candle
        for (let i = 0; i < candleData.length; i++) {
            const candle = candleData[i];
            const signal = signals[i];
            
            // Execute trade if signal present
            if (signal !== 0) {
                this.executeTrade(i, candle, signal);
            }
            
            // Track portfolio value
            const totalValue = this.calculateTotalValue(candle.close);
            this.portfolioValues.push({
                index: i,
                timestamp: candle.timestamp,
                price: candle.close,
                coinBalance: this.coinBalance,
                usdtBalance: this.usdtBalance,
                totalValue: totalValue
            });
        }

        // Calculate final metrics
        return this.calculateMetrics(candleData);
    }

    /**
     * Calculate performance metrics
     */
    calculateMetrics(candleData) {
        if (!candleData || candleData.length === 0) {
            throw new Error('No candle data available for metrics calculation');
        }

        const initialPrice = candleData[0].close;
        const finalPrice = candleData[candleData.length - 1].close;
        
        const initialValue = this.initialCoins * initialPrice;
        const finalValue = this.calculateTotalValue(finalPrice);
        
        // Calculate trade pairs for win/loss analysis
        const tradePairs = this.calculateTradePairs();
        const winningTrades = tradePairs.filter(pair => pair.profit > 0);
        const losingTrades = tradePairs.filter(pair => pair.profit <= 0);
        
        // Calculate drawdown
        const maxDrawdown = this.calculateMaxDrawdown();
        
        const metrics = {
            // Portfolio metrics
            initialValue: initialValue,
            finalValue: finalValue,
            totalReturn: ((finalValue / initialValue) - 1) * 100,
            
            // Trade metrics
            totalTrades: this.trades.length,
            tradePairs: tradePairs.length,
            winRate: tradePairs.length > 0 ? (winningTrades.length / tradePairs.length) * 100 : 0,
            
            // Profit/Loss metrics
            avgProfit: winningTrades.length > 0 ? 
                winningTrades.reduce((sum, trade) => sum + trade.profit, 0) / winningTrades.length : 0,
            avgLoss: losingTrades.length > 0 ? 
                losingTrades.reduce((sum, trade) => sum + Math.abs(trade.profit), 0) / losingTrades.length : 0,
            
            // Risk metrics
            maxDrawdown: maxDrawdown,
            maxDrawdownPct: initialValue > 0 ? (maxDrawdown / initialValue) * 100 : 0,
            
            // Fee analysis
            totalFees: this.totalFeesPaid,
            feesAsPctOfReturn: finalValue > 0 ? (this.totalFeesPaid / finalValue) * 100 : 0,
            
            // Position info
            finalCoinBalance: this.coinBalance,
            finalUsdtBalance: this.usdtBalance,
            
            // Trading period
            startDate: new Date(candleData[0].timestamp),
            endDate: new Date(candleData[candleData.length - 1].timestamp),
            
            // Status
            isActive: this.coinBalance > 0,
            lastTradeType: this.trades.length > 0 ? this.trades[this.trades.length - 1].type : null
        };

        return metrics;
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
     * Calculate maximum drawdown
     */
    calculateMaxDrawdown() {
        if (this.portfolioValues.length === 0) return 0;
        
        let peak = this.portfolioValues[0].totalValue;
        let maxDrawdown = 0;
        
        for (const value of this.portfolioValues) {
            if (value.totalValue > peak) {
                peak = value.totalValue;
            }
            
            const drawdown = peak - value.totalValue;
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
     * Run multiple backtests with different parameter sets
     */
    async runBatch(candleData, parameterSets, onProgress = null) {
        this.isRunning = true;
        this.results = [];
        
        try {
            for (let i = 0; i < parameterSets.length; i++) {
                const params = parameterSets[i];
                
                try {
                    const result = await this.runSingle(candleData, params);
                    this.results.push(result);
                } catch (error) {
                    console.error(`Error in backtest ${i + 1}:`, error);
                    this.results.push(this.createErrorResult(params, error));
                }
                
                if (onProgress) {
                    onProgress((i + 1) / parameterSets.length, i + 1, parameterSets.length);
                }
                
                // Yield control periodically
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
            
            return this.results.sort((a, b) => b.finalValue - a.finalValue);
            
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run single backtest
     */
    async runSingle(candleData, params) {
        // Create strategy and calculate signals
        const strategy = new EmaDifferentialStrategy(params);
        const signalData = strategy.calculateSignals(candleData);
        
        // Run backtest
        const backtester = new PortfolioBacktester({
            initialCoins: 1.0,
            positionSize: params.positionSize,
            feesAndSlippage: params.feesSlippage
        });
        
        const metrics = backtester.run(candleData, signalData.signals);
        
        return {
            parameters: params,
            ...metrics,
            trades: backtester.getTradeLog(),
            signals: signalData
        };
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