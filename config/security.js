/**
 * Security configuration
 * @module security-config
 */

module.exports = {
    // General security settings
    general: {
        logLevel: process.env.LOG_LEVEL || 'info',
        enableAuditLog: true,
        encryptAuditLog: true,
        maxAuditLogSize: 10000,
        sessionTimeout: 3600000, // 1 hour
        dataRetentionDays: 30
    },
    
    // Request security
    requests: {
        validateSSL: true,
        followRedirects: true,
        maxRedirects: 5,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 2000,
        blockSuspiciousUrls: true,
        allowedDomains: [
            'google.com',
            'edmunds.com',
            'cars.com',
            'kbb.com',
            'caranddriver.com',
            'motortrend.com'
        ]
    },
    
    // Rate limiting
    rateLimiting: {
        enabled: true,
        requestsPerMinute: 30,
        burstSize: 5,
        delay: 2000,
        jitter: 1000,
        adaptive: true,
        backoffFactor: 2,
        maxBackoff: 30000
    },
    
    // Data protection
    dataProtection: {
        encryptSensitiveData: true,
        encryptionAlgorithm: 'aes-256-gcm',
        anonymizePII: true,
        hashIdentifiers: true,
        dataMasking: {
            price: 'partial',
            contact: 'full',
            location: 'partial'
        },
        retentionPolicy: {
            rawData: '7d',
            processedData: '30d',
            logs: '90d'
        }
    },
    
    // Privacy compliance
    privacy: {
        gdprCompliant: true,
        ccpaCompliant: true,
        dataMinimization: true,
        purposeLimitation: true,
        userConsent: false,
        rightToBeForgotten: true,
        dataPortability: true
    },
    
    // Monitoring and alerts
    monitoring: {
        enableRealTimeMonitoring: true,
        alertThresholds: {
            errorRate: 0.1,
            blockageRate: 0.2,
            dataLossRate: 0.05,
            securityIncidents: 5
        },
        notificationChannels: ['logs'],
        healthCheckInterval: 30000
    },
    
    // Anti-detection
    antiDetection: {
        rotateUserAgents: true,
        randomizeDelays: true,
        useProxies: true,
        emulateHumanBehavior: true,
        fingerprintRandomization: true,
        headerRandomization: true,
        cookieManagement: true
    },
    
    // Validation rules
    validation: {
        strictSchemaValidation: true,
        dataSanitization: true,
        inputValidation: true,
        outputValidation: true,
        maxDataSize: 10485760, // 10MB
        maxArraySize: 1000,
        maxStringLength: 10000
    },
    
    // Error handling
    errorHandling: {
        maskErrorDetails: true,
        logErrors: true,
        retryOnFailure: true,
        fallbackStrategies: true,
        gracefulDegradation: true
    },
    
    // Environment-specific overrides
    environments: {
        development: {
            logLevel: 'debug',
            rateLimiting: { enabled: false },
            dataProtection: { encryptSensitiveData: false }
        },
        production: {
            logLevel: 'warn',
            rateLimiting: { enabled: true },
            dataProtection: { encryptSensitiveData: true }
        }
    }
};