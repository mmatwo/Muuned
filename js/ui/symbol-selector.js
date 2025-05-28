/**
 * Searchable Symbol Selector Component
 * Creates a search input with dropdown for coin selection
 */
class SymbolSelector {
    constructor(containerId, initialSymbol = 'BTCUSDT') {
        this.container = document.getElementById(containerId);
        this.selectedSymbol = initialSymbol;
        this.isOpen = false;
        this.focusedIndex = -1;
        
        this.createSelector();
        this.attachEventListeners();
    }
    
    /**
     * Create the symbol selector HTML
     */
    createSelector() {
        const selectedCoin = getCoinBySymbol(this.selectedSymbol);
        const displayValue = selectedCoin ? formatCoinDisplay(selectedCoin) : this.selectedSymbol;
        
        this.container.innerHTML = `
            <div class="symbol-selector">
                <input 
                    type="text" 
                    id="symbol-search" 
                    class="symbol-search-input"
                    value="${displayValue}"
                    placeholder="Search for a cryptocurrency..."
                    autocomplete="off"
                >
                <div class="symbol-dropdown" id="symbol-dropdown" style="display: none;">
                    <!-- Dropdown content will be populated here -->
                </div>
            </div>
        `;
        
        this.searchInput = document.getElementById('symbol-search');
        this.dropdown = document.getElementById('symbol-dropdown');
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Focus - show dropdown with default results
        this.searchInput.addEventListener('focus', () => {
            this.showDropdown();
            this.updateDropdown('');
        });
        
        // Input - filter results
        this.searchInput.addEventListener('input', (e) => {
            this.updateDropdown(e.target.value);
        });
        
        // Blur - hide dropdown (with delay to allow clicks)
        this.searchInput.addEventListener('blur', () => {
            setTimeout(() => this.hideDropdown(), 150);
        });
        
        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    /**
     * Update dropdown with search results
     */
    updateDropdown(query) {
        const results = searchCoins(query, 5);
        
        if (results.length === 0) {
            this.dropdown.innerHTML = '<div class="dropdown-item no-results">No coins found</div>';
            return;
        }
        
        const html = results.map((coin, index) => `
            <div class="dropdown-item${index === this.focusedIndex ? ' focused' : ''}" 
                 data-symbol="${coin.symbol}" 
                 data-index="${index}">
                <div class="coin-symbol">${coin.symbol.replace('USDT', ' / USDT')}</div>
                <div class="coin-name">${coin.name}</div>
            </div>
        `).join('');
        
        this.dropdown.innerHTML = html;
        
        // Attach click listeners to dropdown items
        this.dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                if (symbol) {
                    this.selectSymbol(symbol);
                }
            });
        });
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyDown(e) {
        const items = this.dropdown.querySelectorAll('.dropdown-item:not(.no-results)');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.focusedIndex = Math.min(this.focusedIndex + 1, items.length - 1);
                this.updateFocus();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.focusedIndex = Math.max(this.focusedIndex - 1, -1);
                this.updateFocus();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.focusedIndex >= 0 && items[this.focusedIndex]) {
                    const symbol = items[this.focusedIndex].dataset.symbol;
                    this.selectSymbol(symbol);
                }
                break;
                
            case 'Escape':
                this.hideDropdown();
                this.searchInput.blur();
                break;
        }
    }
    
    /**
     * Update visual focus on dropdown items
     */
    updateFocus() {
        const items = this.dropdown.querySelectorAll('.dropdown-item');
        items.forEach((item, index) => {
            item.classList.toggle('focused', index === this.focusedIndex);
        });
    }
    
    /**
     * Select a symbol
     */
    selectSymbol(symbol) {
        this.selectedSymbol = symbol;
        const coin = getCoinBySymbol(symbol);
        
        if (coin) {
            this.searchInput.value = formatCoinDisplay(coin);
        } else {
            this.searchInput.value = symbol;
        }
        
        this.hideDropdown();
        this.searchInput.blur();
        
        // Trigger change event for form validation
        this.searchInput.dispatchEvent(new Event('change'));
    }
    
    /**
     * Show dropdown
     */
    showDropdown() {
        this.isOpen = true;
        this.dropdown.style.display = 'block';
        this.focusedIndex = -1;
    }
    
    /**
     * Hide dropdown
     */
    hideDropdown() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
        this.focusedIndex = -1;
    }
    
    /**
     * Get currently selected symbol
     */
    getSelectedSymbol() {
        return this.selectedSymbol;
    }
    
    /**
     * Set symbol programmatically
     */
    setSymbol(symbol) {
        this.selectSymbol(symbol);
    }
}