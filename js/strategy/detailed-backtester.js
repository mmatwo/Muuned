/**
 * Detailed Portfolio Backtester
 * Extended version that tracks full trade history for detailed analysis
 */
class DetailedPortfolioBacktester extends PortfolioBacktester {
    constructor(options = {}) {
        super(options);
        this.fullTradeHistory = [];
        this.lastSellPrice = null; // Track last sell price for relative changes
    }

    /**
     * Execute a trade and record full details
     */
    executeTradeWithHistory(candleIndex, candle, signal) {
        const price = candle.close;
        const previousTotal = this.calculateTotalValue(price);
        let trade = null;
    
        if (signal === -1 && this.coinBalance > 0) {
            // Sell signal
            const coinsToSell = this.coinBalance * this.positionSize;
            const usdtReceived = this.applyFeesAndSlippage(coinsToSell, price, 'sell') * price;
            
            // Calculate relative change from last sell
            let relativeChange = 0;
            let relativeChangePercent = 0;
            
            if (this.lastSellPrice !== null) {
                relativeChange = price - this.lastSellPrice;
                relativeChangePercent = (relativeChange / this.lastSellPrice) * 100;
            }
            
            this.coinBalance -= coinsToSell;
            this.usdtBalance += usdtReceived;
            
            const newTotal = this.calculateTotalValue(price);
            
            trade = {
                index: candleIndex,
                timestamp: candle.timestamp,
                type: 'sell',
                price: price,
                amount: coinsToSell,
                value: usdtReceived,
                coinBalance: this.coinBalance,
                usdtBalance: this.usdtBalance,
                totalValue: newTotal,
                previousTotal: previousTotal,
                fees: coinsToSell * price * this.feesAndSlippage,
                relativeChange: relativeChange,
                relativeChangePercent: relativeChangePercent
            };
            
            // Update last sell price
            this.lastSellPrice = price;
    
        } else if (signal === 1 && this.usdtBalance > 0) {
            // Buy signal
            const theoreticalCoins = this.usdtBalance / price;
            const coinsToBuy = this.applyFeesAndSlippage(theoreticalCoins, price, 'buy');
            const usdtSpent = this.usdtBalance;
            
            this.coinBalance += coinsToBuy;
            this.usdtBalance = 0;
            
            const newTotal = this.calculateTotalValue(price);
            
            trade = {
                index: candleIndex,
                timestamp: candle.timestamp,
                type: 'buy',
                price: price,
                amount: coinsToBuy,
                value: usdtSpent,
                coinBalance: this.coinBalance,
                usdtBalance: this.usdtBalance,
                totalValue: newTotal,
                previousTotal: previousTotal,
                fees: usdtSpent * this.feesAndSlippage,
                relativeChange: null, // No relative change for buy trades
                relativeChangePercent: null
            };
        }
    
        if (trade) {
            this.trades.push(trade);
            this.fullTradeHistory.push(trade);
        }
    
        return trade;
    }

    /**
     * Run complete backtest with full trade history tracking
     */
    runWithFullHistory(candleData, signals) {
        this.reset();
        this.fullTradeHistory = [];
        
        if (!candleData || !signals || candleData.length !== signals.length) {
            throw new Error('Invalid input data: candle data and signals must have same length');
        }

        // Calculate starting value based on denomination
        let startValue;
        if (this.startingDenomination === 'coin') {
            startValue = this.startingAmount * candleData[0].close;
        } else {
            startValue = this.startingAmount;
        }

        let tradeCount = 0;

        // Process each candle
        for (let i = 0; i < candleData.length; i++) {
            const candle = candleData[i];
            const signal = signals[i];
            
            // Execute trade if signal present
            if (signal !== 0) {
                const trade = this.executeTradeWithHistory(i, candle, signal);
                if (trade) {
                    tradeCount++;
                }
            }
            
            // Track portfolio value history
            this.portfolioValues.push(this.calculateTotalValue(candle.close));
        }

        // Calculate final metrics
        const finalPrice = candleData[candleData.length - 1].close;
        const finalValue = this.calculateTotalValue(finalPrice);
        const maxDrawdown = this.calculateMaxDrawdown(this.portfolioValues);

        const summary = {
            initialValue: startValue,
            finalValue: finalValue,
            totalReturn: startValue > 0 ? ((finalValue - startValue) / startValue) * 100 : 0,
            totalTrades: tradeCount,
            maxDrawdown: maxDrawdown,
            maxDrawdownPct: startValue > 0 ? (maxDrawdown / startValue) * 100 : 0,
            finalCoinBalance: this.coinBalance,
            finalUsdtBalance: this.usdtBalance,
            totalFees: this.totalFeesPaid,
            startDate: new Date(candleData[0].timestamp),
            endDate: new Date(candleData[candleData.length - 1].timestamp)
        };

        return {
            trades: this.fullTradeHistory.slice().reverse(), // Most recent first
            summary: summary,
            portfolioHistory: this.portfolioValues
        };
    }

    /**
     * Get trade statistics
     */
    getTradeStatistics() {
        if (this.fullTradeHistory.length === 0) {
            return {
                totalTrades: 0,
                buyTrades: 0,
                sellTrades: 0,
                avgTradeValue: 0,
                totalVolume: 0
            };
        }

        const buyTrades = this.fullTradeHistory.filter(t => t.type === 'buy');
        const sellTrades = this.fullTradeHistory.filter(t => t.type === 'sell');
        const totalVolume = this.fullTradeHistory.reduce((sum, t) => sum + t.value, 0);
        const avgTradeValue = totalVolume / this.fullTradeHistory.length;

        return {
            totalTrades: this.fullTradeHistory.length,
            buyTrades: buyTrades.length,
            sellTrades: sellTrades.length,
            avgTradeValue: avgTradeValue,
            totalVolume: totalVolume
        };
    }

    /**
     * Reset and clear history
     */
    reset() {
        super.reset();
        this.fullTradeHistory = [];
        this.lastSellPrice = null; // Reset last sell price
    }
}