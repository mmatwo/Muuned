/**
 * Progress Bar Component
 * Handles progress tracking and display during backtesting
 */
class ProgressBar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isVisible = false;
        this.currentProgress = 0;
        
        this.createProgressBar();
    }

    /**
     * Create progress bar HTML structure
     */
    createProgressBar() {
        this.container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="progress-text" id="progress-text">Initializing...</div>
            <div class="progress-details" id="progress-details"></div>
        `;
        
        this.progressFill = this.container.querySelector('#progress-fill');
        this.progressText = this.container.querySelector('#progress-text');
        this.progressDetails = this.container.querySelector('#progress-details');
    }

    /**
     * Show progress bar
     */
    show() {
        this.container.style.display = 'block';
        this.isVisible = true;
        this.updateProgress(0, 'Starting...');
    }

    /**
     * Hide progress bar
     */
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Update progress
     * @param {number} progress - Progress value between 0 and 1
     * @param {string} message - Progress message
     * @param {Object} details - Additional progress details
     */
    updateProgress(progress, message = '', details = null) {
        if (!this.isVisible) return;
        
        this.currentProgress = Math.max(0, Math.min(1, progress));
        const percentage = Math.round(this.currentProgress * 100);
        
        // Update progress bar
        this.progressFill.style.width = `${percentage}%`;
        
        // Update text
        if (message) {
            this.progressText.textContent = message;
        }
        
        // Update details if provided
        if (details) {
            this.updateDetails(details);
        }
        
        // Add completion animation
        if (percentage === 100) {
            this.progressFill.classList.add('completed');
            setTimeout(() => {
                if (this.progressFill) {
                    this.progressFill.classList.remove('completed');
                }
            }, 1000);
        }
    }

    /**
     * Update progress details
     * @param {Object} details - Details object with various progress info
     */
    updateDetails(details) {
        let detailsHtml = '';
        
        if (details.completed && details.total) {
            detailsHtml += `<div class="progress-stat">
                <span class="stat-label">Progress:</span>
                <span class="stat-value">${details.completed}/${details.total}</span>
            </div>`;
        }
        
        if (details.timeElapsed) {
            detailsHtml += `<div class="progress-stat">
                <span class="stat-label">Elapsed:</span>
                <span class="stat-value">${this.formatTime(details.timeElapsed)}</span>
            </div>`;
        }
        
        if (details.timeRemaining) {
            detailsHtml += `<div class="progress-stat">
                <span class="stat-label">Remaining:</span>
                <span class="stat-value">${this.formatTime(details.timeRemaining)}</span>
            </div>`;
        }
        
        if (details.speed) {
            detailsHtml += `<div class="progress-stat">
                <span class="stat-label">Speed:</span>
                <span class="stat-value">${details.speed}/sec</span>
            </div>`;
        }
        
        this.progressDetails.innerHTML = detailsHtml;
    }

    /**
     * Set progress to indeterminate state
     * @param {string} message - Message to display
     */
    setIndeterminate(message = 'Processing...') {
        if (!this.isVisible) return;
        
        this.progressFill.style.width = '100%';
        this.progressFill.classList.add('indeterminate');
        this.progressText.textContent = message;
        this.progressDetails.innerHTML = '';
    }

    /**
     * Remove indeterminate state
     */
    clearIndeterminate() {
        this.progressFill.classList.remove('indeterminate');
    }

    /**
     * Set error state
     * @param {string} message - Error message
     */
    setError(message) {
        if (!this.isVisible) return;
        
        this.progressFill.style.width = '100%';
        this.progressFill.classList.add('error');
        this.progressText.textContent = message;
        this.progressDetails.innerHTML = '';
    }

    /**
     * Clear error state
     */
    clearError() {
        this.progressFill.classList.remove('error');
    }

    /**
     * Format time duration
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Get current progress value
     * @returns {number} Current progress (0-1)
     */
    getCurrentProgress() {
        return this.currentProgress;
    }

    /**
     * Reset progress bar to initial state
     */
    reset() {
        this.updateProgress(0, 'Ready...');
        this.clearIndeterminate();
        this.clearError();
    }

    /**
     * Check if progress bar is visible
     * @returns {boolean} Visibility state
     */
    isShown() {
        return this.isVisible;
    }
}

/**
 * Progress Tracker Utility
 * Helps track progress across multiple phases
 */
class ProgressTracker {
    constructor(progressBar) {
        this.progressBar = progressBar;
        this.phases = [];
        this.currentPhaseIndex = 0;
        this.startTime = null;
    }

    /**
     * Add a phase to track
     * @param {string} name - Phase name
     * @param {number} weight - Relative weight (0-1)
     */
    addPhase(name, weight = 1) {
        this.phases.push({
            name: name,
            weight: weight,
            completed: false,
            progress: 0
        });
    }

    /**
     * Start tracking
     */
    start() {
        this.startTime = Date.now();
        this.progressBar.show();
        this.updateDisplay();
    }

    /**
     * Update current phase progress
     * @param {number} progress - Phase progress (0-1)
     * @param {string} message - Optional message
     */
    updatePhase(progress, message = '') {
        if (this.currentPhaseIndex >= this.phases.length) return;
        
        const phase = this.phases[this.currentPhaseIndex];
        phase.progress = Math.max(0, Math.min(1, progress));
        
        if (!message) {
            message = `${phase.name}: ${Math.round(progress * 100)}%`;
        }
        
        this.updateDisplay(message);
    }

    /**
     * Complete current phase and move to next
     * @param {string} message - Optional completion message
     */
    completePhase(message = '') {
        if (this.currentPhaseIndex >= this.phases.length) return;
        
        const phase = this.phases[this.currentPhaseIndex];
        phase.completed = true;
        phase.progress = 1;
        
        this.currentPhaseIndex++;
        
        if (!message && this.currentPhaseIndex < this.phases.length) {
            message = `Starting ${this.phases[this.currentPhaseIndex].name}...`;
        }
        
        this.updateDisplay(message);
    }

    /**
     * Update progress bar display
     */
    updateDisplay(message = '') {
        const totalWeight = this.phases.reduce((sum, phase) => sum + phase.weight, 0);
        let completedWeight = 0;
        
        for (let i = 0; i < this.phases.length; i++) {
            const phase = this.phases[i];
            if (i < this.currentPhaseIndex) {
                completedWeight += phase.weight;
            } else if (i === this.currentPhaseIndex) {
                completedWeight += phase.weight * phase.progress;
            }
        }
        
        const overallProgress = totalWeight > 0 ? completedWeight / totalWeight : 0;
        
        // Calculate time estimates
        const details = this.calculateTimeEstimates(overallProgress);
        
        this.progressBar.updateProgress(overallProgress, message, details);
    }

    /**
     * Calculate time estimates
     */
    calculateTimeEstimates(progress) {
        if (!this.startTime || progress <= 0) return {};
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        const estimated = progress > 0 ? elapsed / progress : 0;
        const remaining = estimated - elapsed;
        
        return {
            timeElapsed: elapsed,
            timeRemaining: Math.max(0, remaining),
            completed: this.currentPhaseIndex + 1,
            total: this.phases.length
        };
    }

    /**
     * Complete all phases
     */
    complete(message = 'Completed!') {
        this.currentPhaseIndex = this.phases.length;
        this.phases.forEach(phase => {
            phase.completed = true;
            phase.progress = 1;
        });
        
        this.progressBar.updateProgress(1, message);
    }

    /**
     * Reset tracker
     */
    reset() {
        this.phases = [];
        this.currentPhaseIndex = 0;
        this.startTime = null;
        this.progressBar.reset();
    }
}