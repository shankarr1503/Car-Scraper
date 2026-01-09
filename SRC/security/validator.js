/**
 * Data validation system
 * @module validator
 */

class DataValidator {
    constructor() {
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[1-9][\d]{0,15}$/,
            url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            price: /^\$?[\d,]+(\.\d{2})?$/,
            year: /^(19|20)\d{2}$/,
            vin: /^[A-HJ-NPR-Z0-9]{17}$/
        };
        
        this.validationCache = new Map();
    }
    
    /**
     * Validate input configuration
     */
    validateInput(input) {
        const errors = [];
        
        // Validate vehicleType
        if (!input.vehicleType) {
            errors.push('vehicleType is required');
        } else if (!['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Sports car', 'Crossover', 'All'].includes(input.vehicleType)) {
            errors.push('Invalid vehicleType');
        }
        
        // Validate maxResults
        if (input.maxResults !== undefined) {
            const maxResults = parseInt(input.maxResults);
            if (isNaN(maxResults) || maxResults < 1 || maxResults > 1000) {
                errors.push('maxResults must be between 1 and 1000');
            }
        }
        
        // Validate country
        const validCountries = ['US', 'UK', 'CA', 'AU', 'DE', 'JP', 'IN', 'FR', 'IT', 'ES'];
        if (input.country && !validCountries.includes(input.country)) {
            errors.push('Invalid country code');
        }
        
        // Validate securityLevel
        const validSecurityLevels = ['minimal', 'standard', 'strict', 'stealth'];
        if (input.securityLevel && !validSecurityLevels.includes(input.securityLevel)) {
            errors.push('Invalid securityLevel');
        }
        
        // Validate rateLimitDelay
        if (input.rateLimitDelay !== undefined) {
            const delay = parseInt(input.rateLimitDelay);
            if (isNaN(delay) || delay < 500 || delay > 10000) {
                errors.push('rateLimitDelay must be between 500 and 10000');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Validate car data
     */
    validateCarData(carData) {
        // Check cache first
        const cacheKey = JSON.stringify(carData);
        if (this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey);
        }
        
        const errors = [];
        const warnings = [];
        
        // Required fields
        if (!carData.manufacturer || carData.manufacturer.trim() === '') {
            errors.push('Manufacturer is required');
        }
        
        if (!carData.model || carData.model.trim() === '') {
            errors.push('Model is required');
        }
        
        // Validate year
        if (carData.year) {
            const year = parseInt(carData.year);
            const currentYear = new Date().getFullYear();
            
            if (isNaN(year) || year < 1990 || year > currentYear + 2) {
                errors.push(`Year must be between 1990 and ${currentYear + 2}`);
            }
        } else {
            warnings.push('Year is missing');
        }
        
        // Validate price
        if (carData.price?.starting_msrp) {
            const price = carData.price.starting_msrp;
            if (isNaN(price) || price < 0 || price > 1000000) {
                errors.push('Price must be between 0 and 1,000,000');
            }
        } else {
            warnings.push('Price is missing or estimated');
        }
        
        // Validate performance data
        if (carData.performance?.horsepower) {
            const hp = carData.performance.horsepower;
            if (isNaN(hp) || hp < 0 || hp > 2000) {
                warnings.push('Horsepower value seems unrealistic');
            }
        }
        
        // Validate fuel economy
        if (carData.fuel_economy?.combined) {
            const mpg = carData.fuel_economy.combined;
            if (isNaN(mpg) || mpg < 0 || mpg > 100) {
                warnings.push('Fuel economy value seems unrealistic');
            }
        }
        
        // Sanitize strings
        if (carData.manufacturer) {
            carData.manufacturer = this.sanitizeString(carData.manufacturer);
        }
        
        if (carData.model) {
            carData.model = this.sanitizeString(carData.model);
        }
        
        // Remove malicious content
        const sanitizedData = this.removeMaliciousContent(carData);
        
        const result = {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            data: sanitizedData,
            score: this.calculateValidationScore(sanitizedData)
        };
        
        // Cache result
        this.validationCache.set(cacheKey, result);
        
        return result;
    }
    
    /**
     * Calculate validation score
     */
    calculateValidationScore(carData) {
        let score = 0;
        const weights = {
            manufacturer: 15,
            model: 15,
            year: 10,
            price: 20,
            performance: 15,
            specifications: 10,
            features: 10,
            dimensions: 5
        };
        
        Object.entries(weights).forEach(([field, weight]) => {
            if (field === 'price' || field === 'performance' || field === 'specifications') {
                if (carData[field] && Object.keys(carData[field]).length > 0) {
                    score += weight;
                }
            } else if (carData[field]) {
                score += weight;
            }
        });
        
        return Math.min(100, score);
    }
    
    /**
     * Sanitize string
     */
    sanitizeString(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>"']/g, '')
            .substring(0, 200);
    }
    
    /**
     * Remove malicious content
     */
    removeMaliciousContent(data) {
        const maliciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /data:/gi,
            /vbscript:/gi
        ];
        
        const cleanData = (obj) => {
            if (typeof obj === 'string') {
                let cleaned = obj;
                maliciousPatterns.forEach(pattern => {
                    cleaned = cleaned.replace(pattern, '');
                });
                return cleaned;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => cleanData(item));
            }
            
            if (typeof obj === 'object' && obj !== null) {
                const cleaned = {};
                Object.keys(obj).forEach(key => {
                    cleaned[key] = cleanData(obj[key]);
                });
                return cleaned;
            }
            
            return obj;
        };
        
        return cleanData(data);
    }
    
    /**
     * Validate URL
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required' };
        }
        
        try {
            const urlObj = new URL(url);
            const allowedProtocols = ['http:', 'https:'];
            const allowedDomains = [
                'google.com', 'edmunds.com', 'cars.com',
                'kbb.com', 'caranddriver.com', 'motortrend.com'
            ];
            
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return { valid: false, error: 'Invalid protocol' };
            }
            
            const isAllowedDomain = allowedDomains.some(domain => 
                urlObj.hostname.includes(domain)
            );
            
            if (!isAllowedDomain) {
                return { valid: false, error: 'Domain not allowed' };
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }
    
    /**
     * Check for PII
     */
    checkForPII(data) {
        const piiPatterns = [
            this.patterns.email,
            this.patterns.phone,
            this.patterns.vin
        ];
        
        const dataString = JSON.stringify(data);
        const foundPII = [];
        
        piiPatterns.forEach(pattern => {
            const matches = dataString.match(pattern);
            if (matches) {
                foundPII.push(...matches);
            }
        });
        
        return {
            hasPII: foundPII.length > 0,
            piiFound: foundPII,
            count: foundPII.length
        };
    }
    
    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache.clear();
    }
}

module.exports = DataValidator;