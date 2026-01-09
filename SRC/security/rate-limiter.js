/**
 * Rate limiting system
 * @module rate-limiter
 */

class RateLimiter {
    constructor(config = {}) {
        this.config = {
            baseDelay: config.baseDelay || 2000,
            maxDelay: config.maxDelay || 10000,
            jitter: config.jitter || 1000,
            requestsPerMinute: config.requestsPerMinute || 30,
            concurrentRequests: config.concurrentRequests || 5,
            ...config
        };
        
        this.requestTimestamps = [];
        this.activeRequests = 0;
        this.consecutiveFailures = 0;
        this.backoffMultiplier = 1;
    }
    
    /**
     * Check if request can be made
     */
    canMakeRequest() {
        // Check concurrent requests
        if (this.activeRequests >= this.config.concurrentRequests) {
            return false;
        }
        
        // Check requests per minute
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove old timestamps
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => timestamp > oneMinuteAgo
        );
        
        if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Add request timestamp
     */
    addRequestTimestamp() {
        this.requestTimestamps.push(Date.now());
        this.activeRequests++;
    }
    
    /**
     * Complete request
     */
    completeRequest() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
    }
    
    /**
     * Apply rate limiting delay
     */
    async delay(customDelay = null) {
        const delay = customDelay || this.calculateDelay();
        
        // Add jitter
        const jitteredDelay = delay + (Math.random() * this.config.jitter * 2) - this.config.jitter;
        const finalDelay = Math.max(500, jitteredDelay);
        
        await new Promise(resolve => setTimeout(resolve, finalDelay));
        
        return finalDelay;
    }
    
    /**
     * Calculate delay with exponential backoff
     */
    calculateDelay() {
        let delay = this.config.baseDelay;
        
        // Apply exponential backoff for consecutive failures
        if (this.consecutiveFailures > 0) {
            delay *= Math.pow(2, Math.min(this.consecutiveFailures, 5));
            this.backoffMultiplier = Math.min(10, this.backoffMultiplier * 1.5);
        }
        
        // Cap at max delay
        return Math.min(delay, this.config.maxDelay);
    }
    
    /**
     * Record successful request
     */
    recordSuccess() {
        this.consecutiveFailures = 0;
        this.backoffMultiplier = 1;
    }
    
    /**
     * Record failed request
     */
    recordFailure() {
        this.consecutiveFailures++;
    }
    
    /**
     * Execute request with rate limiting
     */
    async execute(requestFn) {
        // Wait for available slot
        while (!this.canMakeRequest()) {
            await this.delay(100);
        }
        
        this.addRequestTimestamp();
        
        try {
            const result = await requestFn();
            this.completeRequest();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.completeRequest();
            this.recordFailure();
            throw error;
        }
    }
    
    /**
     * Get current statistics
     */
    getStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentRequests = this.requestTimestamps.filter(
            timestamp => timestamp > oneMinuteAgo
        );
        
        return {
            active_requests: this.activeRequests,
            recent_requests: recentRequests.length,
            consecutive_failures: this.consecutiveFailures,
            backoff_multiplier: this.backoffMultiplier,
            current_delay: this.calculateDelay()
        };
    }
    
    /**
     * Reset rate limiter
     */
    reset() {
        this.requestTimestamps = [];
        this.activeRequests = 0;
        this.consecutiveFailures = 0;
        this.backoffMultiplier = 1;
    }
    
    /**
     * Adaptive rate limiting
     */
    adaptiveLimit(conditions) {
        if (conditions.captchaDetected) {
            this.config.baseDelay = Math.min(this.config.baseDelay * 2, 10000);
            this.config.requestsPerMinute = Math.max(5, this.config.requestsPerMinute / 2);
        }
        
        if (conditions.ipBlocked) {
            this.config.baseDelay = 10000;
            this.config.requestsPerMinute = 1;
        }
        
        if (conditions.successRate < 0.5) {
            this.config.baseDelay = Math.min(this.config.baseDelay * 1.5, 5000);
        }
    }
}

module.exports = RateLimiter;