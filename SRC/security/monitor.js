/**
 * Security monitoring system
 * @module monitor
 */

const crypto = require('crypto');

class SecurityMonitor {
    constructor() {
        this.auditLog = [];
        this.securityIncidents = [];
        this.sessionId = null;
        this.startTime = Date.now();
        this.requestCount = 0;
        this.blockedCount = 0;
        this.retryCount = 0;
        
        this.thresholds = {
            maxRequestsPerMinute: 30,
            maxConsecutiveFailures: 5,
            maxSecurityIncidents: 10
        };
    }
    
    /**
     * Set session ID
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        this.logEvent('session_created', { sessionId });
    }
    
    /**
     * Log security event
     */
    logEvent(eventType, details = {}) {
        const event = {
            id: crypto.randomBytes(8).toString('hex'),
            type: eventType,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            details: this.sanitizeDetails(details),
            severity: this.getEventSeverity(eventType)
        };
        
        this.auditLog.push(event);
        
        // Track security incidents
        if (event.severity >= 3) {
            this.securityIncidents.push(event);
            console.warn(`⚠️  Security incident: ${eventType}`);
        }
        
        // Check thresholds
        this.checkThresholds();
        
        return event.id;
    }
    
    /**
     * Track request
     */
    trackRequest(url, method = 'GET') {
        this.requestCount++;
        
        const request = {
            id: crypto.randomBytes(4).toString('hex'),
            url: this.sanitizeUrl(url),
            method: method,
            timestamp: new Date().toISOString()
        };
        
        this.logEvent('request_made', request);
        return request.id;
    }
    
    /**
     * Track blocked request
     */
    trackBlockedRequest(url, reason) {
        this.blockedCount++;
        this.logEvent('request_blocked', { url: this.sanitizeUrl(url), reason });
    }
    
    /**
     * Track retry
     */
    trackRetry(url, attempt) {
        this.retryCount++;
        this.logEvent('retry_attempt', { url: this.sanitizeUrl(url), attempt });
    }
    
    /**
     * Sanitize URL for privacy
     */
    sanitizeUrl(url) {
        try {
            const parsed = new URL(url);
            return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
        } catch {
            return 'invalid_url';
        }
    }
    
    /**
     * Sanitize event details
     */
    sanitizeDetails(details) {
        const sanitized = { ...details };
        
        // Remove sensitive information
        delete sanitized.password;
        delete sanitized.apiKey;
        delete sanitized.token;
        
        // Sanitize URLs in details
        if (sanitized.url) {
            sanitized.url = this.sanitizeUrl(sanitized.url);
        }
        
        return sanitized;
    }
    
    /**
     * Get event severity
     */
    getEventSeverity(eventType) {
        const severityMap = {
            'session_created': 1,
            'request_made': 1,
            'retry_attempt': 2,
            'request_blocked': 3,
            'captcha_detected': 3,
            'ip_blocked': 4,
            'rate_limit_exceeded': 3,
            'security_violation': 5
        };
        
        return severityMap[eventType] || 2;
    }
    
    /**
     * Check security thresholds
     */
    checkThresholds() {
        // Check request rate
        const oneMinuteAgo = Date.now() - 60000;
        const recentRequests = this.auditLog.filter(event => 
            event.type === 'request_made' && 
            new Date(event.timestamp).getTime() > oneMinuteAgo
        );
        
        if (recentRequests.length > this.thresholds.maxRequestsPerMinute) {
            this.logEvent('rate_limit_exceeded', {
                current: recentRequests.length,
                limit: this.thresholds.maxRequestsPerMinute
            });
        }
        
        // Check security incidents
        if (this.securityIncidents.length > this.thresholds.maxSecurityIncidents) {
            this.logEvent('security_threshold_exceeded', {
                incidents: this.securityIncidents.length,
                limit: this.thresholds.maxSecurityIncidents
            });
        }
    }
    
    /**
     * Get audit summary
     */
    getAuditSummary() {
        const processingTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        
        return {
            session_id: this.sessionId,
            processing_time: `${processingTime}s`,
            total_requests: this.requestCount,
            blocked_requests: this.blockedCount,
            retry_count: this.retryCount,
            security_incidents: this.securityIncidents.length,
            success_rate: this.requestCount > 0 
                ? ((this.requestCount - this.blockedCount) / this.requestCount * 100).toFixed(2)
                : 0
        };
    }
    
    /**
     * Get audit trail
     */
    getAuditTrail() {
        return {
            session_id: this.sessionId,
            start_time: new Date(this.startTime).toISOString(),
            end_time: new Date().toISOString(),
            total_events: this.auditLog.length,
            events: this.auditLog.slice(-100), // Last 100 events
            incidents: this.securityIncidents
        };
    }
    
    /**
     * Final security audit
     */
    async finalAudit() {
        const audit = this.getAuditSummary();
        this.logEvent('final_audit', audit);
        return audit;
    }
    
    /**
     * Check for suspicious patterns
     */
    checkSuspiciousPatterns() {
        const patterns = this.securityIncidents.map(incident => incident.type);
        const suspicious = patterns.filter((type, index, arr) => 
            arr.indexOf(type) !== index
        );
        
        return suspicious.length > 0;
    }
}

module.exports = SecurityMonitor;