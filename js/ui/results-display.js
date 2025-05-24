/**
 * Results Display Component
 * Handles visualization and presentation of backtest results
 */
class ResultsDisplay {
    constructor(displayContainerId, resultsContainerId) {
        this.displayContainer = document.getElementById(displayContainerId);
        this.resultsContainer = document.getElementById(resultsContainerId);
        this.currentResults = null;
        this.sortColumn = 'finalValue';
        this.sortDirection = 'desc';
        
        this.initializeDisplay();
    }

    /**
     * Initialize the results display structure
     */
    initializeDisplay() {
        this.displayContainer.innerHTML = `
            <div class="results-summary" id="results-summary"></div>
            <div class="results-controls" id="results-controls"></div>
            <div class="results-table-container" id="results-table-container"></div>
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
            <div class="results-grid">
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
                <div class="view-controls">
                    <button class="control-btn active" data-view="top20">Top 20</button>
                    <button class="control-btn" data-view="top100">Top 100</button>
                    <button class="control-btn" data-view="all">All Results</button>
                    <button class="control-btn" data-view="profitable">Profitable Only</button>
                </div>
                
                <div class="export-controls">
                    <button class="control-btn export-btn" data-export="csv">Export CSV</button>
                    <button class="control-btn export-btn" data-export="json">Export JSON</button>
                </div>
            </div>
            
            <div class="filter-controls">
                <input type="text" id="search-filter" placeholder="Search parameters..." class="search-input">
                <select id="sort-column" class="sort-select">
                    <option value="finalValue">Final Value</option>
                    <option value="totalReturn">Total Return</option>
                    <option value="winRate">Win Rate</option>
                    <option value="totalTrades">Total Trades</option>
                    <option value="maxDrawdown">Max Drawdown</option>
                </select>
                <button class="control-btn" id="sort-direction">↓ Desc</button>
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
        
        // Search filter
        const searchInput = document.getElementById('search-filter');
        searchInput.addEventListener('input', (e) => {
            this.searchResults(e.target.value);
        });
        
        // Sort controls
        const sortSelect = document.getElementById('sort-column');
        const sortDirection = document.getElementById('sort-direction');
        
        sortSelect.addEventListener('change', (e) => {
            this.sortColumn = e.target.value;
            this.sortAndDisplayResults();
        });
        
        sortDirection.addEventListener('click', () => {
            this.toggleSortDirection();
            this.sortAndDisplayResults();
        });
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
     * Display results table
     */
    displayTable(results, limit = 20) {
        const displayResults = results.slice(0, limit);
        
        this.tableContainer.innerHTML = `
            <div class="results-table">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>EMA Floor</th>
                            <th>EMA Ceiling</th>
                            <th>Vol Floor</th>
                            <th>Vol Ceiling</th>
                            <th>Final Value</th>
                            <th>Return %</th>
                            <th>Win Rate</th>
                            <th>Trades</th>
                            <th>Max DD</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayResults.map((result, index) => this.createTableRow(result, index + 1)).join('')}
                    </tbody>
                </table>
            </div>
            
            ${results.length > limit ? `
                <div class="table-pagination">
                    <span>Showing ${limit} of ${results.length} results</span>
                </div>
            ` : ''}
        `;
        
        this.attachTableEvents();
    }

    /**
     * Create a table row for a result
     */
    createTableRow(result, rank) {
        const hasError = result.error;
        const rowClass = hasError ? 'error-row' : (result.totalReturn > 0 ? 'profitable-row' : 'loss-row');
        
        return `
            <tr class="${rowClass}" data-rank="${rank}">
                <td>${rank}</td>
                <td>${result.parameters.emaFloor}</td>
                <td>${result.parameters.emaCeiling}</td>
                <td>${result.parameters.volFloor}</td>
                <td>${result.parameters.volCeiling}</td>
                <td>${hasError ? 'Error' : this.formatCurrency(result.finalValue)}</td>
                <td class="${result.totalReturn >= 0 ? 'positive' : 'negative'}">
                    ${hasError ? 'N/A' : this.formatPercent(result.totalReturn)}
                </td>
                <td>${hasError ? 'N/A' : this.formatPercent(result.winRate || 0)}</td>
                <td>${hasError ? 'N/A' : (result.totalTrades || 0)}</td>
                <td>${hasError ? 'N/A' : this.formatCurrency(result.maxDrawdown || 0)}</td>
                <td>
                    <button class="action-btn detail-btn" data-index="${rank - 1}" title="View Details">
                        📊
                    </button>
                    ${!hasError ? `
                        <button class="action-btn trades-btn" data-index="${rank - 1}" title="View Trades">
                            📋
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    /**
     * Attach table event listeners
     */
    attachTableEvents() {
        // Detail buttons
        this.tableContainer.querySelectorAll('.detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.showResultDetails(this.currentResults[index]);
            });
        });
        
        // Trades buttons
        this.tableContainer.querySelectorAll('.trades-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.showTradeDetails(this.currentResults[index]);
            });
        });
    }

    /**
     * Filter results based on view type
     */
    filterResults(viewType) {
        if (!this.currentResults) return;
        
        let filteredResults = [...this.currentResults];
        let limit = 20;
        
        switch (viewType) {
            case 'top20':
                limit = 20;
                break;
            case 'top100':
                limit = 100;
                break;
            case 'all':
                limit = filteredResults.length;
                break;
            case 'profitable':
                filteredResults = filteredResults.filter(r => !r.error && r.totalReturn > 0);
                limit = filteredResults.length;
                break;
        }
        
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
        
        // Get current view limit
        const activeView = this.controlsContainer.querySelector('[data-view].active');
        if (activeView) {
            this.filterResults(activeView.dataset.view);
        } else {
            this.displayTable(sorted);
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
     * Prepare data for export
     */
    prepareExportData() {
        return this.currentResults.map((result, index) => ({
            rank: index + 1,
            emaFloor: result.parameters.emaFloor,
            emaCeiling: result.parameters.emaCeiling,
            volFloor: result.parameters.volFloor,
            volCeiling: result.parameters.volCeiling,
            smoothLength: result.parameters.smoothLength,
            forceBuyThreshold: result.parameters.forceBuyThreshold,
            finalValue: result.finalValue,
            totalReturn: result.totalReturn,
            winRate: result.winRate,
            totalTrades: result.totalTrades,
            maxDrawdown: result.maxDrawdown,
            hasError: !!result.error,
            errorMessage: result.error || ''
        }));
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
     * Show detailed view of a result
     */
    showResultDetails(result) {
        // Create modal or detailed view
        // This would expand to show charts, detailed metrics, etc.
        console.log('Showing details for result:', result);
        alert('Detailed view would be implemented here');
    }

    /**
     * Show trade details
     */
    showTradeDetails(result) {
        // Show trade log in a modal or separate view
        console.log('Showing trades for result:', result);
        alert('Trade details view would be implemented here');
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
        this.resultsContainer.style.display = 'none';
        this.showNoResults();
    }

    /**
     * Formatting utilities
     */
    formatCurrency(value) {
        return `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    formatPercent(value) {
        const formatted = value.toFixed(1);
        return value >= 0 ? `+${formatted}%` : `${formatted}%`;
    }
}