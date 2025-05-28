/**
 * Results Display Component
 * Handles visualization and presentation of backtest results with trade analysis
 */
class ResultsDisplay {
    constructor(displayContainerId, resultsContainerId) {
        this.displayContainer = document.getElementById(displayContainerId);
        this.resultsContainer = document.getElementById(resultsContainerId);
        this.currentResults = null;
        this.sortColumn = 'finalValue';
        this.sortDirection = 'desc';
        this.currentPage = 1; // Add this line
        this.resultsPerPage = 100; // Add this line
        
        // Trade modal functionality
        this.tradeCache = new Map();
        this.currentTradeModal = null;
        
        this.initializeDisplay();
        this.setupKeyboardListeners();
    }

    /**
     * Initialize the results display structure
     */
    initializeDisplay() {
        this.displayContainer.innerHTML = `
            <div class="results-summary" id="results-summary"></div>
            <div class="results-controls" id="results-controls"></div>
            <div class="results-table-container" id="results-table-container">
                <div class="no-results">Run a backtest to see results</div>
            </div>
            <div class="table-pagination" id="results-pagination" style="display: none;"></div>
        `;
        
        this.summaryContainer = document.getElementById('results-summary');
        this.controlsContainer = document.getElementById('results-controls');
        this.tableContainer = document.getElementById('results-table-container');
    }

    /**
     * Display backtest results
     * @param {Array} results - Array of backtest results
     */
    displayResults(results) {
        if (!results || results.length === 0) {
            this.showNoResults();
            return;
        }

        this.currentResults = results;
        this.showResultsContainer();
        
        this.displaySummary(results);
        this.displayControls();
        this.displayTable(results);
    }

    /**
     * Show the results container
     */
    showResultsContainer() {
        this.resultsContainer.style.display = 'block';
        
        // Smooth scroll to results
        setTimeout(() => {
            this.resultsContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }

    /**
     * Display summary metrics
     */
    displaySummary(results) {
        const summary = this.calculateSummaryMetrics(results);
        
        this.summaryContainer.innerHTML = `
            <div class="results-grid compact">
                <div class="metric-card ${summary.bestReturn >= 0 ? 'positive' : 'negative'}">
                    <div class="metric-value">$${summary.bestFinalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="metric-label">Best Final Value</div>
                </div>
                
                <div class="metric-card ${summary.bestReturn >= 0 ? 'positive' : 'negative'}">
                    <div class="metric-value">${summary.bestReturn >= 0 ? '+' : ''}${summary.bestReturn.toFixed(1)}%</div>
                    <div class="metric-label">Best Return</div>
                </div>
                
                <div class="metric-card ${summary.avgReturn >= 0 ? 'positive' : 'negative'}">
                    <div class="metric-value">${summary.avgReturn >= 0 ? '+' : ''}${summary.avgReturn.toFixed(1)}%</div>
                    <div class="metric-label">Average Return</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-value">${summary.avgWinRate.toFixed(1)}%</div>
                    <div class="metric-label">Average Win Rate</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-value">${summary.profitableStrategies}</div>
                    <div class="metric-label">Profitable Strategies</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-value">${results.length.toLocaleString()}</div>
                    <div class="metric-label">Total Combinations</div>
                </div>
            </div>
        `;
        
        this.adjustSummaryFontSizes();
    }

    /**
     * Calculate summary metrics from results
     */
    calculateSummaryMetrics(results) {
        const validResults = results.filter(r => !r.error && r.totalReturn !== undefined);
        
        if (validResults.length === 0) {
            return {
                bestFinalValue: 0,
                bestReturn: 0,
                avgReturn: 0,
                avgWinRate: 0,
                profitableStrategies: 0
            };
        }

        const returns = validResults.map(r => r.totalReturn);
        const winRates = validResults.map(r => r.winRate || 0);
        const finalValues = validResults.map(r => r.finalValue);
        
        return {
            bestFinalValue: Math.max(...finalValues),
            bestReturn: Math.max(...returns),
            avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
            avgWinRate: winRates.reduce((a, b) => a + b, 0) / winRates.length,
            profitableStrategies: validResults.filter(r => r.totalReturn > 0).length
        };
    }

    /**
     * Display control buttons and filters
     */
    displayControls() {
        this.controlsContainer.innerHTML = `
            <div class="controls-row">
                <div class="pagination-section">
                    <div class="pagination-controls" id="pagination-controls">
                        <!-- Will be populated when results are displayed -->
                    </div>
                    <div class="pagination-info" id="pagination-info">
                        <!-- Will be populated when results are displayed -->
                    </div>
                </div>
                
                <div class="export-controls">
                    <button class="control-btn export-btn" data-export="csv">Export CSV</button>
                    <button class="control-btn export-btn" data-export="json">Export JSON</button>
                </div>
            </div>
        `;
        
        this.attachControlEvents();
    }

    /**
     * Attach event listeners to controls
     */
    attachControlEvents() {
        // View controls
        this.controlsContainer.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveView(e.target);
                this.filterResults(e.target.dataset.view);
            });
        });
        
        // Export controls
        this.controlsContainer.querySelectorAll('[data-export]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.exportResults(e.target.dataset.export);
            });
        });
        
        // sortSelect.addEventListener('change', (e) => {
        //     this.sortColumn = e.target.value;
        //     this.sortAndDisplayResults();
        // });
        
        // sortDirection.addEventListener('click', () => {
        //     this.toggleSortDirection();
        //     this.sortAndDisplayResults();
        // });
    }

    /**
     * Set active view button
     */
    setActiveView(activeBtn) {
        this.controlsContainer.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    /**
     * Display results table with sortable headers
     */
    displayTable(results, limit = null) {
        const page = this.currentPage || 1;
        const actualLimit = limit || this.resultsPerPage;
        
        const startIndex = (page - 1) * actualLimit;
        const endIndex = Math.min(startIndex + actualLimit, results.length);
        const displayResults = results.slice(startIndex, endIndex);
    
        if (displayResults.length === 0) {
            this.tableContainer.innerHTML = '<div class="no-results"><p>No results to display</p></div>';
            // Clear pagination when no results
            this.updatePaginationInControls('', '');
            return;
        }
        
        // Create sortable headers with sorting indicators
        const getSortIcon = (column) => {
            if (this.sortColumn === column) {
                return this.sortDirection === 'desc' ? ' ▼' : ' ▲';
            }
            return '';
        };
        
        const getHeaderClass = (column) => {
            return this.sortColumn === column ? 'sortable-header active' : 'sortable-header';
        };
        
        // Build table HTML WITHOUT pagination (pagination is now in controls)
        this.tableContainer.innerHTML = `
            <div class="results-table">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th class="${getHeaderClass('finalValue')}" data-column="finalValue">
                                Final Value${getSortIcon('finalValue')}
                            </th>
                            <th class="${getHeaderClass('totalReturn')}" data-column="totalReturn">
                                Return %${getSortIcon('totalReturn')}
                            </th>
                            <th class="${getHeaderClass('winRate')}" data-column="winRate">
                                Win Rate${getSortIcon('winRate')}
                            </th>
                            <th class="${getHeaderClass('totalTrades')}" data-column="totalTrades">
                                Trades${getSortIcon('totalTrades')}
                            </th>
                            <th class="${getHeaderClass('maxDrawdown')}" data-column="maxDrawdown">
                                Max DD${getSortIcon('maxDrawdown')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayResults.map((result, index) => this.createSimplifiedTableRow(result, startIndex + index + 1)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Update pagination in the controls section
        if (results.length > actualLimit) {
            const totalPages = Math.ceil(results.length / actualLimit);
            const paginationInfo = `Showing ${startIndex + 1}-${endIndex} of ${results.length} results`;
            const paginationControls = this.generateResultsPagination(page, totalPages);
            this.updatePaginationInControls(paginationInfo, paginationControls);
        } else {
            // Clear pagination if not needed
            this.updatePaginationInControls('', '');
        }
        
        this.attachTableEvents();
    }
    
    /**
     * Update pagination info and controls in the controls section
     */
    updatePaginationInControls(infoText, controlsHtml) {
        const paginationInfo = document.getElementById('pagination-info');
        const paginationControls = document.getElementById('pagination-controls');
        
        if (paginationInfo) {
            paginationInfo.innerHTML = infoText;
        }
        
        if (paginationControls) {
            paginationControls.innerHTML = controlsHtml;
        }
    }

    displayResultsPagination(currentPage, totalPages, totalResults, startIndex, endIndex) {
        // Create pagination container if it doesn't exist
        let paginationContainer = document.getElementById('results-pagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'results-pagination';
            paginationContainer.className = 'table-pagination';
            this.tableContainer.appendChild(paginationContainer);
        }
        
        let paginationHtml = `
            <div class="pagination-info">
                Showing results ${startIndex} - ${endIndex} of ${totalResults}
            </div>
            <div class="pagination-controls">
        `;
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += `
                <button class="pagination-btn" onclick="window.muunedApp.resultsDisplay.goToResultsPage(${currentPage - 1})">
                    ← Previous
                </button>
            `;
        }
        
        // Page numbers (show current and nearby pages)
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let page = startPage; page <= endPage; page++) {
            const activeClass = page === currentPage ? 'active' : '';
            paginationHtml += `
                <button class="pagination-btn ${activeClass}" onclick="window.muunedApp.resultsDisplay.goToResultsPage(${page})">
                    ${page}
                </button>
            `;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHtml += `
                <button class="pagination-btn" onclick="window.muunedApp.resultsDisplay.goToResultsPage(${currentPage + 1})">
                    Next →
                </button>
            `;
        }
        
        paginationHtml += '</div>';
        
        paginationContainer.innerHTML = paginationHtml;
    }

    /**
     * Create a simplified table row without parameter columns
     */
    createSimplifiedTableRow(result, rank) {
        const hasError = result.error;
        const rowClass = hasError ? 'error-row' : (result.totalReturn > 0 ? 'profitable-row' : 'loss-row');
        
        // Check if trades are cached for this result
        const hasCachedTrades = this.tradeCache.has(rank - 1);
        const detailButtonClass = hasCachedTrades ? 'detail-btn-loaded' : 'detail-btn';
        
        // Create parameter tooltip content
        const parameterTooltip = this.createParameterTooltip(result.parameters);
        
        return `
            <tr class="${rowClass}" data-rank="${rank}">
                <td>${rank}</td>
                <td>${hasError ? 'Error' : this.formatCurrency(result.finalValue)}</td>
                <td class="${result.totalReturn >= 0 ? 'positive' : 'negative'}">
                    ${hasError ? 'N/A' : this.formatPercent(result.totalReturn)}
                </td>
                <td>${hasError ? 'N/A' : this.formatPercent(result.winRate || 0)}</td>
                <td>${hasError ? 'N/A' : (result.totalTrades || 0)}</td>
                <td>${hasError ? 'N/A' : this.formatCurrency(result.maxDrawdown || 0)}</td>
                <td class="actions-cell">
                    <button class="action-btn ${detailButtonClass}" data-index="${rank - 1}" title="View Detailed Trades">
                        📊
                    </button>
                    <button class="action-btn param-btn" data-index="${rank - 1}" title="View Parameters">
                        ⚙️
                    </button>
                    <div class="parameter-tooltip" id="tooltip-${rank - 1}">
                        ${parameterTooltip}
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Create parameter tooltip content
     */
    createParameterTooltip(parameters) {
        const paramEntries = Object.entries(parameters)
            .filter(([key]) => key !== 'feesSlippage') // Hide internal parameter
            .map(([key, value]) => {
                const label = this.formatParameterLabel(key);
                return `<div class="tooltip-param"><span class="param-name">${label}:</span> <span class="param-value">${value}</span></div>`;
            })
            .join('');
        
        return `
            <div class="tooltip-header">Strategy Parameters</div>
            <div class="tooltip-content">
                ${paramEntries}
            </div>
        `;
    }

    /**
     * Attach table event listeners
     */
    attachTableEvents() {
        console.log('[Muuned] Attaching table events...');
        
        // Column sorting
        this.tableContainer.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                if (this.sortColumn === column) {
                    // Toggle direction if same column
                    this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    // New column, default to descending
                    this.sortColumn = column;
                    this.sortDirection = 'desc';
                }
                this.sortAndDisplayResults();
            });
        });

        // Detail buttons for trade analysis
        this.tableContainer.querySelectorAll('.detail-btn, .detail-btn-loaded').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const index = parseInt(e.target.dataset.index);
                console.log('[Muuned] Detail button clicked for result index:', index);
                
                await this.analyzeResultTrades(index, e.target);
            });
        });

        // Parameter buttons with hover functionality
        this.tableContainer.querySelectorAll('.param-btn').forEach(btn => {
            const index = parseInt(btn.dataset.index);
            const tooltip = document.getElementById(`tooltip-${index}`);
            
            // console.log(`[Muuned] Setting up tooltip for index ${index}:`, !!tooltip);
            
            if (tooltip) {
                // Show tooltip on hover
                btn.addEventListener('mouseenter', (e) => {
                    // console.log(`[Muuned] Mouse enter on param button ${index}`);
                    this.showParameterTooltip(e.target, tooltip);
                });
                
                // Hide tooltip when mouse leaves button
                btn.addEventListener('mouseleave', (e) => {
                    // console.log(`[Muuned] Mouse leave param button ${index}`);
                    // Add a small delay to allow moving to tooltip
                    setTimeout(() => {
                        if (!tooltip.matches(':hover')) {
                            this.hideParameterTooltip(tooltip);
                        }
                    }, 100);
                });
                
                // Keep tooltip visible when hovering over it
                tooltip.addEventListener('mouseenter', () => {
                    // console.log(`[Muuned] Mouse enter tooltip ${index}`);
                    tooltip.style.display = 'block';
                    tooltip.classList.add('tooltip-visible');
                });
                
                // Hide tooltip when mouse leaves the tooltip
                tooltip.addEventListener('mouseleave', () => {
                    // console.log(`[Muuned] Mouse leave tooltip ${index}`);
                    this.hideParameterTooltip(tooltip);
                });
            }
        });
    }

    /**
     * Show parameter tooltip with proper positioning
     */
    showParameterTooltip(button, tooltip) {
        console.log('[Muuned] Showing parameter tooltip');
        
        // Hide any other visible tooltips first
        this.hideAllTooltips();
        
        // Get button position relative to the viewport
        const buttonRect = button.getBoundingClientRect();
        const tooltipWidth = 280;
        const tooltipHeight = 200; // Approximate height
        
        // Calculate position relative to the viewport
        let left = buttonRect.right + 15; // Position to the right of button
        let top = buttonRect.top - 20;
        
        // Check if tooltip would go off screen to the right
        if (left + tooltipWidth > window.innerWidth) {
            // Position to the left of the button instead
            left = buttonRect.left - tooltipWidth - 15;
        }
        
        // Check if tooltip would go off screen at the top
        if (top < 10) {
            top = 10;
        }
        
        // Check if tooltip would go off screen at the bottom
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }
        
        // Position tooltip relative to viewport (fixed positioning)
        tooltip.style.position = 'fixed';
        tooltip.style.right = '20px';
        // tooltip.style.left = `${left}px`;
        // tooltip.style.top = `${top}px`;
        tooltip.style.zIndex = '10000';
        tooltip.style.display = 'block';
        
        // console.log(`[Muuned] Tooltip positioned at: left=${left}, top=${top}`);
        
        // Add visible class with a small delay for animation
        setTimeout(() => {
            tooltip.classList.add('tooltip-visible');
            // console.log('[Muuned] Tooltip should now be visible');
        }, 10);
    }

    /**
     * Hide parameter tooltip
     */
    hideParameterTooltip(tooltip) {
        // console.log('[Muuned] Hiding parameter tooltip');
        tooltip.classList.remove('tooltip-visible');
        setTimeout(() => {
            if (!tooltip.classList.contains('tooltip-visible')) {
                tooltip.style.display = 'none';
            }
        }, 300); // Match CSS transition time
    }

    /**
     * Hide all visible tooltips
     */
    hideAllTooltips() {
        this.tableContainer.querySelectorAll('.parameter-tooltip').forEach(tooltip => {
            this.hideParameterTooltip(tooltip);
        });
    }

    /**
     * Analyze result trades by re-running simulation
     */
    async analyzeResultTrades(resultIndex, buttonElement) {
        try {
            console.log('[Muuned] Starting trade analysis for result index:', resultIndex);
            
            // Check if already cached
            if (this.tradeCache && this.tradeCache.has(resultIndex)) {
                console.log('[Muuned] Using cached trade data');
                this.openTradeModal(resultIndex);
                return;
            }
            
            // Initialize cache if not exists
            if (!this.tradeCache) {
                this.tradeCache = new Map();
            }
            
            // Update button to loading state
            const originalContent = buttonElement.innerHTML;
            buttonElement.innerHTML = '⏳';
            buttonElement.disabled = true;
            buttonElement.style.opacity = '0.6';
            
            const result = this.currentResults[resultIndex];
            console.log('[Muuned] Re-running simulation for parameters:', result.parameters);
            
            // Get the processed data from the main app
            const processedData = window.muunedApp.currentData;
            if (!processedData) {
                throw new Error('No market data available. Please run a backtest first.');
            }
            
            // Get market config for proper backtester setup
            const marketConfig = window.muunedApp.parameterForm.getMarketDataConfig();
            
            // Create strategy with the specific parameters
            const strategy = new CustomScriptStrategy(window.muunedApp.scriptEditor, result.parameters);
            const signalData = strategy.calculateSignals(
                processedData.prices.ohlc4,
                processedData.prices.close
            );
            
            // Run detailed backtest with full trade history
            const detailedBacktester = new DetailedPortfolioBacktester({
                startingDenomination: marketConfig.startingDenomination,
                startingAmount: marketConfig.startingAmount,
                positionSize: result.parameters.positionSize || 1.0,
                feesAndSlippage: result.parameters.feesSlippage || 0.001
            });
            
            const tradeHistory = detailedBacktester.runWithFullHistory(processedData.candles, signalData.signals);
            
            console.log('[Muuned] Generated trade history:', tradeHistory.trades.length, 'trades');
            
            // Cache the trade history
            this.tradeCache.set(resultIndex, {
                trades: tradeHistory.trades,
                parameters: result.parameters,
                summary: tradeHistory.summary
            });
            
            // Update button to loaded state
            buttonElement.innerHTML = '📊';
            buttonElement.classList.remove('detail-btn');
            buttonElement.classList.add('detail-btn-loaded');
            buttonElement.disabled = false;
            buttonElement.style.opacity = '1';
            
            // Open modal
            this.openTradeModal(resultIndex);
            
        } catch (error) {
            console.error('[Muuned] Failed to analyze trades:', error);
            
            // Reset button
            buttonElement.innerHTML = '📊';
            buttonElement.disabled = false;
            buttonElement.style.opacity = '1';
            
            alert('Failed to analyze trades: ' + error.message);
        }
    }

    /**
     * Open trade modal with cached data
     */
    openTradeModal(resultIndex) {
        const tradeData = this.tradeCache.get(resultIndex);
        if (!tradeData) {
            console.error('No trade data found for result index:', resultIndex);
            return;
        }
        
        console.log('[Muuned] Opening trade modal for', tradeData.trades.length, 'trades');
        
        this.currentTradeModal = {
            resultIndex,
            ...tradeData,
            currentPage: 1,
            tradesPerPage: 500
        };
        
        // Ensure modal exists
        this.ensureModalExists();
        
        // Show modal
        const modal = document.getElementById('trade-modal');
        modal.style.display = 'block';
        
        // Populate modal content
        this.populateTradeModal();
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    /**
     * Ensure modal HTML exists in DOM
     */
    ensureModalExists() {
        if (document.getElementById('trade-modal')) {
            return; // Modal already exists
        }
        
        console.log('[Muuned] Creating trade modal HTML');
        
        const modalHtml = `
            <div id="trade-modal" class="trade-modal" style="display: none;">
                <div class="modal-overlay" onclick="window.muunedApp.resultsDisplay.closeTradeModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Trades</h2>
                        <button class="modal-close" onclick="window.muunedApp.resultsDisplay.closeTradeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="trade-modal-controls">
                            <div class="trade-parameters" id="trade-parameters"></div>
                            <div class="trade-export-controls">
                                <button class="control-btn export-btn" onclick="window.muunedApp.resultsDisplay.exportTrades('csv')">Export CSV</button>
                                <button class="control-btn export-btn" onclick="window.muunedApp.resultsDisplay.exportTrades('json')">Export JSON</button>
                            </div>
                        </div>
                        <div class="trade-table-container" id="trade-table-container">
                            <div class="loading-trades">⌛ Loading trade details...</div>
                        </div>
                        <div class="trade-pagination" id="trade-pagination"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Populate trade modal with data
     */
    populateTradeModal() {
        const { parameters, trades, currentPage, tradesPerPage } = this.currentTradeModal;
        
        console.log('[Muuned] Populating modal with', trades.length, 'trades, page', currentPage);
        
        // Display parameters
        const parametersContainer = document.getElementById('trade-parameters');
        const paramEntries = Object.entries(parameters)
            .filter(([key]) => key !== 'feesSlippage') // Hide internal parameter
            .map(([key, value]) => `<span class="param-item"><strong>${this.formatParameterLabel(key)}:</strong> ${value}</span>`)
            .join('');
        
        parametersContainer.innerHTML = `
            <div class="parameter-list">${paramEntries}</div>
        `;
        
        // Calculate pagination
        const totalTrades = trades.length;
        const totalPages = Math.ceil(totalTrades / tradesPerPage);
        const startIndex = (currentPage - 1) * tradesPerPage;
        const endIndex = Math.min(startIndex + tradesPerPage, totalTrades);
        const pageTrades = trades.slice(startIndex, endIndex);
        
        console.log('[Muuned] Showing trades', startIndex + 1, 'to', endIndex, 'of', totalTrades);
        
        // Display trades table
        this.displayTradesTable(pageTrades, startIndex);
        
        // Display pagination
        this.displayTradePagination(currentPage, totalPages, totalTrades);
    }

    /**
     * Display trades table with fees column
     */
    displayTradesTable(trades, startIndex) {
        const tableContainer = document.getElementById('trade-table-container');
        
        if (trades.length === 0) {
            tableContainer.innerHTML = '<div class="no-trades">No trades found for this strategy.</div>';
            return;
        }
        
        // Calculate total trades for proper numbering (FIXED: correct trade numbering)
        const totalTrades = this.currentTradeModal.trades.length;
        
        const tableHtml = `
            <div class="trade-table">
                <table>
                    <thead>
                        <tr>
                            <th>Trade #</th>
                            <th>Type</th>
                            <th>Time</th>
                            <th>Price</th>
                            <th>Amount</th>
                            <th>Change</th>
                            <th>%</th>
                            <th>Fees</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trades.map((trade, index) => this.createTradeRow(trade, totalTrades - startIndex - index)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        tableContainer.innerHTML = tableHtml;
    }

    /**
     * Create a single trade row with improved change calculation and fees
     */
    createTradeRow(trade, tradeNumber) {
        const date = new Date(trade.timestamp);
        const timeString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        let changeCell = '';
        let percentCell = '';
        
        if (trade.type === 'sell') {
            const change = trade.relativeChange || 0;
            const changePercent = trade.relativeChangePercent || 0;
            
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSign = change >= 0 ? '+' : '';
            
            changeCell = `<td class="${changeClass}">${changeSign}${change.toFixed(2)}</td>`;
            percentCell = `<td class="${changeClass}">${changeSign}${changePercent.toFixed(2)}%</td>`;
        } else {
            changeCell = '<td>—</td>';
            percentCell = '<td>—</td>';
        }
        
        return `
            <tr class="trade-row ${trade.type}">
                <td>${tradeNumber}</td>
                <td class="trade-type ${trade.type}">${trade.type.toUpperCase()}</td>
                <td>${timeString}</td>
                <td>${Math.round(trade.price).toLocaleString()} USDT</td>
                <td>${trade.amount.toFixed(6)}</td>
                ${changeCell}
                ${percentCell}
                <td>${(trade.fees || 0).toFixed(2)} USDT</td>
                <td>${Math.round(trade.totalValue).toLocaleString()} USDT</td>
            </tr>
        `;
    }

    /**
     * Display trade pagination
     */
    displayTradePagination(currentPage, totalPages, totalTrades) {
        const paginationContainer = document.getElementById('trade-pagination');
        
        let paginationHtml = `
            <div class="pagination-info">
                Showing trades ${(currentPage - 1) * 500 + 1} - ${Math.min(currentPage * 500, totalTrades)} of ${totalTrades}
            </div>
            <div class="pagination-controls">
        `;
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += `
                <button class="pagination-btn" onclick="window.muunedApp.resultsDisplay.goToTradePage(${currentPage - 1})">
                    ← Previous
                </button>
            `;
        }
        
        // Page numbers (show current and nearby pages)
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let page = startPage; page <= endPage; page++) {
            const activeClass = page === currentPage ? 'active' : '';
            paginationHtml += `
                <button class="pagination-btn ${activeClass}" onclick="window.muunedApp.resultsDisplay.goToTradePage(${page})">
                    ${page}
                </button>
            `;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHtml += `
                <button class="pagination-btn" onclick="window.muunedApp.resultsDisplay.goToTradePage(${currentPage + 1})">
                    Next →
                </button>
            `;
        }
        
        paginationHtml += '</div>';
        
        paginationContainer.innerHTML = paginationHtml;
    }

    /**
     * Navigate to specific trade page
     */
    goToTradePage(page) {
        if (this.currentTradeModal) {
            this.currentTradeModal.currentPage = page;
            this.populateTradeModal();
        }
    }

    /**
     * Close trade modal
     */
    closeTradeModal() {
        const modal = document.getElementById('trade-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.body.style.overflow = '';
        this.currentTradeModal = null;
    }

    /**
     * Export trades
     */
    exportTrades(format) {
        if (!this.currentTradeModal) return;
        
        const { trades, parameters } = this.currentTradeModal;
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `trades-${timestamp}`;
        
        if (format === 'csv') {
            this.exportTradesCSV(trades, filename);
        } else if (format === 'json') {
            this.exportTradesJSON(trades, parameters, filename);
        }
    }

    /**
     * Export trades as CSV with fees column
     */
    exportTradesCSV(trades, filename) {
        const headers = ['Trade #', 'Type', 'Date', 'Time', 'Price', 'Amount', 'Change', 'Change %', 'Fees', 'Total Value'];
        
        const rows = trades.map((trade, index) => {
            const date = new Date(trade.timestamp);
            const change = trade.type === 'sell' ? (trade.relativeChange || 0) : 0;
            const changePercent = trade.type === 'sell' ? (trade.relativeChangePercent || 0) : 0;
            
            return [
                trades.length - index, // Correct trade numbering
                trade.type.toUpperCase(),
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                trade.price.toFixed(2),
                trade.amount.toFixed(6),
                change.toFixed(2),
                changePercent.toFixed(2),
                (trade.fees || 0).toFixed(2),
                trade.totalValue.toFixed(2)
            ];
        });
        
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
        
        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
    }

    /**
     * Export trades as JSON
     */
    exportTradesJSON(trades, parameters, filename) {
        const exportData = {
            parameters,
            trades: trades.map((trade, index) => ({
                tradeNumber: trades.length - index, // Correct trade numbering
                type: trade.type,
                timestamp: trade.timestamp,
                date: new Date(trade.timestamp).toISOString(),
                price: trade.price,
                amount: trade.amount,
                value: trade.value,
                totalValue: trade.totalValue,
                fees: trade.fees,
                relativeChange: trade.relativeChange,
                relativeChangePercent: trade.relativeChangePercent
            })),
            summary: {
                totalTrades: trades.length,
                exportDate: new Date().toISOString()
            }
        };
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
    }

    /**
     * Download file utility
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Filter results based on view type
     */
    filterResults(viewType) {
        if (!this.currentResults) return;
        
        let filteredResults = [...this.currentResults];
        let limit = null;
        
        switch (viewType) {
            case 'top20':
                limit = 20;
                break;
            case 'top100':
                limit = 100;
                break;
            case 'all':
                limit = null;
                break;
            case 'profitable':
                filteredResults = filteredResults.filter(r => !r.error && r.totalReturn > 0);
                limit = null;
                break;
        }
        this.currentPage = 1; // Reset to page 1 when filtering
        this.displayTable(filteredResults, limit);
    }

    /**
     * Search results
     */
    searchResults(searchTerm) {
        if (!this.currentResults || !searchTerm.trim()) {
            this.displayTable(this.currentResults);
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filteredResults = this.currentResults.filter(result => {
            const params = result.parameters;
            return Object.values(params).some(value => 
                value.toString().toLowerCase().includes(term)
            );
        });
        
        this.displayTable(filteredResults, filteredResults.length);
    }

    /**
     * Sort and display results
     */
    sortAndDisplayResults() {
        if (!this.currentResults) return;
        
        const sorted = [...this.currentResults].sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Handle undefined values
            if (aVal === undefined) aVal = 0;
            if (bVal === undefined) bVal = 0;
            
            if (this.sortDirection === 'desc') {
                return bVal - aVal;
            } else {
                return aVal - bVal;
            }
        });
        
        this.currentResults = sorted;
        this.currentPage = 1; // Reset to page 1 when sorting
        
        // Get current view limit
        const activeView = this.controlsContainer.querySelector('[data-view].active');
        if (activeView) {
            this.filterResults(activeView.dataset.view);
        } else {
            this.displayTable(sorted);
        }
        
        // Update sort direction button
        const sortBtn = document.getElementById('sort-direction');
        if (sortBtn) {
            sortBtn.textContent = this.sortDirection === 'desc' ? '↓ Desc' : '↑ Asc';
        }
    }

    /**
     * Toggle sort direction
     */
    toggleSortDirection() {
        const btn = document.getElementById('sort-direction');
        this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
        btn.textContent = this.sortDirection === 'desc' ? '↓ Desc' : '↑ Asc';
    }

    /**
     * Export results
     */
    exportResults(format) {
        if (!this.currentResults) return;
        
        const data = this.prepareExportData();
        
        if (format === 'csv') {
            this.downloadCSV(data);
        } else if (format === 'json') {
            this.downloadJSON(data);
        }
    }

    /**
     * Prepare data for export with dynamic parameters
     */
    prepareExportData() {
        if (!this.currentResults || this.currentResults.length === 0) return [];
        
        return this.currentResults.map((result, index) => {
            const exportRow = {
                rank: index + 1,
                ...result.parameters, // Still export all parameters
                finalValue: result.finalValue,
                totalReturn: result.totalReturn,
                winRate: result.winRate,
                totalTrades: result.totalTrades,
                maxDrawdown: result.maxDrawdown,
                hasError: !!result.error,
                errorMessage: result.error || ''
            };
            
            return exportRow;
        });
    }

    /**
     * Download CSV file
     */
    downloadCSV(data) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => 
                typeof row[header] === 'string' && row[header].includes(',') 
                    ? `"${row[header]}"` 
                    : row[header]
            ).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, 'backtest-results.csv', 'text/csv');
    }

    /**
     * Download JSON file
     */
    downloadJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'backtest-results.json', 'application/json');
    }

    /**
     * Show no results message
     */
    showNoResults() {
        this.displayContainer.innerHTML = `
            <div class="no-results">
                <h3>No Results</h3>
                <p>No backtest results to display. Run a backtest to see results here.</p>
            </div>
        `;
    }

    /**
     * Clear results display
     */
    clear() {
        this.currentResults = null;
        this.tradeCache.clear();
        this.resultsContainer.style.display = 'none';
        this.showNoResults();
    }

    /**
     * Format parameter name for display
     */
    formatParameterLabel(paramName) {
        return paramName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Formatting utilities
     */
    formatCurrency(value) {
        return `${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    formatPercent(value) {
        const formatted = value.toFixed(1);
        return value >= 0 ? `+${formatted}%` : `${formatted}%`;
    }

    /**
     * Reset all cached trade data (call this when starting a new backtest)
     */
    resetTradeCache() {
        console.log('[Muuned] Resetting trade cache and button states');
        
        // Clear the cache
        this.tradeCache.clear();
        
        // Close any open modal
        if (this.currentTradeModal) {
            this.closeTradeModal();
        }
        
        // Reset all button states back to default
        document.querySelectorAll('.detail-btn-loaded').forEach(btn => {
            btn.classList.remove('detail-btn-loaded');
            btn.classList.add('detail-btn');
        });
    }

    /**
     * Adjust font sizes dynamically to fit content
     */
    adjustSummaryFontSizes() {
        setTimeout(() => {
            const metricCards = document.querySelectorAll('.metric-value');
            
            metricCards.forEach(card => {
                const text = card.textContent;
                let fontSize = 1.2; // Start with default 2em
                
                // Reduce font size based on text length
                if (text.length > 12) {
                    fontSize = 0.8; // Very long numbers
                } else if (text.length > 8) {
                    fontSize = 1.0; // Long numbers
                } else if (text.length > 8) {
                    fontSize = 1.2; // Medium numbers
                }
                
                card.style.fontSize = `${fontSize}em`;
            });
        }, 50); // Small delay to ensure DOM is updated
    }

    /**
     * Setup keyboard event listeners for closing the modal
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Close modal with ESC key
            if (e.key === 'Escape' && this.currentTradeModal) {
                console.log('[Muuned] ESC key pressed, closing trade modal');
                this.closeTradeModal();
            }
        });
    }
    generateResultsPagination(currentPage, totalPages) {
        let html = '';
        
        // Previous button
        if (currentPage > 1) {
            html += `<button class="pagination-btn" onclick="window.muunedApp.resultsDisplay.goToResultsPage(${currentPage - 1})">← Previous</button>`;
        }
        
        // Page numbers (show current ± 2)
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let page = startPage; page <= endPage; page++) {
            const activeClass = page === currentPage ? 'active' : '';
            html += `<button class="pagination-btn ${activeClass}" onclick="window.muunedApp.resultsDisplay.goToResultsPage(${page})">${page}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            html += `<button class="pagination-btn" onclick="window.muunedApp.resultsDisplay.goToResultsPage(${currentPage + 1})">Next →</button>`;
        }
        
        return html;
    }

    goToResultsPage(page) {
        this.currentPage = page;
        
        // Get current filtered results
        const activeView = this.controlsContainer.querySelector('[data-view].active');
        if (activeView) {
            this.filterResults(activeView.dataset.view);
        } else {
            this.displayTable(this.currentResults);
        }
    }
}