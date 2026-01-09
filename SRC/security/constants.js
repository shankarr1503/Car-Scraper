/**
 * Security constants and configurations
 * @module constants
 */

module.exports = {
    // Security levels
    SECURITY_LEVELS: {
        MINIMAL: 'minimal',
        STANDARD: 'standard',
        STRICT: 'strict',
        STEALTH: 'stealth'
    },
    
    // Rate limiting constants
    RATE_LIMITS: {
        MINIMAL: { requestsPerMinute: 60, baseDelay: 1000 },
        STANDARD: { requestsPerMinute: 30, baseDelay: 2000 },
        STRICT: { requestsPerMinute: 15, baseDelay: 4000 },
        STEALTH: { requestsPerMinute: 10, baseDelay: 6000 }
    },
    
    // Security thresholds
    THRESHOLDS: {
        MAX_RETRIES: 5,
        MAX_REQUEST_SIZE: 10485760, // 10MB
        MAX_RESPONSE_TIME: 30000, // 30 seconds
        MAX_CONCURRENT_REQUESTS: 5,
        MAX_SECURITY_INCIDENTS: 10
    },
    
    // Error codes
    ERROR_CODES: {
        SECURITY_BLOCKED: 'SECURITY_BLOCKED',
        RATE_LIMITED: 'RATE_LIMITED',
        CAPTCHA_DETECTED: 'CAPTCHA_DETECTED',
        IP_BLOCKED: 'IP_BLOCKED',
        VALIDATION_FAILED: 'VALIDATION_FAILED',
        DATA_CORRUPTED: 'DATA_CORRUPTED'
    },
    
    // Compliance requirements
    COMPLIANCE: {
        GDPR: {
            requires: ['data_minimization', 'right_to_be_forgotten', 'lawful_basis'],
            pii_fields: ['email', 'phone', 'address', 'ip_address', 'location']
        },
        CCPA: {
            requires: ['opt_out', 'data_deletion', 'disclosure'],
            sensitive_fields: ['financial_info', 'geolocation', 'personal_identifier']
        }
    },
    
    // Encryption standards
    ENCRYPTION: {
        ALGORITHM: 'aes-256-gcm',
        KEY_LENGTH: 32, // bytes
        IV_LENGTH: 16, // bytes
        SALT_LENGTH: 16 // bytes
    },
    
    // Manufacturer mappings
    MANUFACTURERS: {
        ALL: [
            'Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Tesla',
            'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Nissan', 'Volkswagen',
            'Mazda', 'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Genesis',
            'Volvo', 'Porsche', 'Jaguar', 'Land Rover', 'Fiat', 'Alfa Romeo',
            'Buick', 'Cadillac', 'Chrysler', 'Dodge', 'Mitsubishi', 'Mini'
        ],
        LUXURY: [
            'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini', 'Maserati',
            'Aston Martin', 'McLaren', 'Bugatti', 'Lucid', 'Rivian', 'Polestar'
        ]
    },
    
    // Vehicle types
    VEHICLE_TYPES: {
        SEDAN: 'Sedan',
        SUV: 'SUV',
        HATCHBACK: 'Hatchback',
        COUPE: 'Coupe',
        SPORTS_CAR: 'Sports car',
        CROSSOVER: 'Crossover',
        MINI: 'Mini',
        COUPE_SUV: 'Coupe SUV',
        OFF_ROAD: 'Off-road',
        PICKUP: 'Pick-up',
        MPV: 'MPV',
        ESTATE: 'Estate',
        VAN: 'Van',
        CABRIOLET: 'Cabriolet',
        ROADSTER: 'Roadster',
        SHOOTING_BRAKE: 'Shooting Brake',
        HYPER: 'Hyper'
    }
};