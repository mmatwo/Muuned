/**
 * Simplified Syntax Highlighting
 * Uses a cleaner approach with better browser compatibility
 */
class SyntaxHighlighter {
    constructor() {
        this.keywords = [
            'if', 'else', 'for', 'while', 'return', 'const', 'let', 'var',
            'function', 'true', 'false', 'null', 'undefined', 'params'
        ];
        
        this.technicalIndicators = [
            'sma', 'ema', 'wma', 'vwma', 'swma', 'alma', 'hma',
            'rsi', 'stoch', 'stochrsi', 'cci', 'mfi', 'williamsR',
            'macd', 'adx', 'psar', 'atr', 'tr', 'bb', 'kc',
            'obv', 'ad', 'mom', 'roc', 'crossover', 'crossunder', 
            'highest', 'lowest', 'rising', 'falling', 'change',
            'nz', 'na', 'fixnan', 'abs', 'sign', 'round', 'floor', 
            'ceil', 'max', 'min', 'pow', 'sqrt', 'log', 'avg', 'sum',
            'ohlc4', 'hlc3', 'hl2', 'rollingStd', 'smooth'
        ];
        
        this.constants = ['signalPrices', 'executionPrices', 'TechnicalIndicators'];
    }

    /**
     * Apply syntax highlighting using CSS classes on the textarea
     */
    applySyntaxHighlighting(textarea) {
        // Instead of overlay, we'll use a different approach
        // Add syntax highlighting classes to the textarea
        textarea.classList.add('syntax-enabled');
        
        // Return a simple container object
        return {
            enabled: true
        };
    }

    /**
     * Simple syntax highlighting without overlay (for future enhancement)
     */
    highlightCode(code) {
        // For now, return the code as-is
        // This can be enhanced later with a proper code editor library
        return code;
    }
}

/**
 * Real-time Code Validator  
 * Simplified validator focusing on essential checks
 */
/**
 * Simplified Code Validator  
 * Essential validation checks for strategy scripts
 */
class CodeValidator {
    constructor() {
        // Essential validation rules
        this.validationRules = [
            {
                name: 'missingReturn',
                test: (code) => !code.includes('return'),
                message: 'Script should return an array of signals',
                severity: 'error'
            },
            {
                name: 'invalidArrayAccess', 
                test: (code) => /\[\s*\]/.test(code) && !code.includes('signals'),
                message: 'Empty array access detected',
                severity: 'warning'
            },
            {
                name: 'dangerousCode',
                test: (code) => /\b(eval|Function|setTimeout|setInterval|document\.|window\.)\b/.test(code),
                message: 'Potentially unsafe code detected',
                severity: 'error'
            }
        ];
    }

    /**
     * Validate code and return issues
     */
    validateCode(code) {
        const issues = [];
        
        // Basic syntax check
        try {
            new Function('signalPrices', 'executionPrices', 'params', 'TechnicalIndicators', code);
        } catch (error) {
            issues.push({
                type: 'syntax',
                message: `Syntax Error: ${error.message}`,
                severity: 'error',
                line: this.extractLineNumber(error.message)
            });
        }
        
        // Apply simple validation rules
        this.validationRules.forEach(rule => {
            if (rule.test(code)) {
                issues.push({
                    type: rule.name,
                    message: rule.message,
                    severity: rule.severity
                });
            }
        });
        
        // Check for common patterns
        this.checkCommonPatterns(code, issues);
        
        return issues;
    }

    /**
     * Check for common coding patterns
     */
    checkCommonPatterns(code, issues) {
        // Check if TechnicalIndicators is being used
        if (!code.includes('TechnicalIndicators.')) {
            issues.push({
                type: 'noIndicators',
                message: 'Consider using TechnicalIndicators functions for better analysis',
                severity: 'info'
            });
        }
        
        // Check for parameter defaults
        if (code.includes('params.') && !code.includes('||')) {
            issues.push({
                type: 'parameterDefault',
                message: 'Consider providing default values for parameters (e.g., params.period || 14)',
                severity: 'info'
            });
        }
    }

    /**
     * Extract line number from error message
     */
    extractLineNumber(errorMessage) {
        const match = errorMessage.match(/line (\d+)/);
        return match ? parseInt(match[1]) : null;
    }
}