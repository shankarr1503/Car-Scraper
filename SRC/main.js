#!/usr/bin/env node

/**
 * Main entry point for Secure Car Scraper Actor
 * @module main
 */

const { Actor } = require('apify');
const crypto = require('crypto');

// Import modules
const SecurityMonitor = require('./security/monitor');
const RateLimiter = require('./security/rate-limiter');
const DataValidator = require('./security/validator');
const { SECURITY_CONSTANTS } = require('./security/constants');
const { 
    encryptData, 
    generateDataHash, 
    sanitizeString, 
    parsePrice,
    calculateCompleteness 
} = require('./utils');

// Import routes
const { scrapeManufacturer, getCompetitorAnalysis } = require('./routes');

/**
 * Main actor execution function
 */
async function main() {
    console.log('🚗 Starting Secure Car Scraper Actor v4.0.0\n');
    
    try {
        // Initialize security systems
        const securityMonitor = new SecurityMonitor();
        const rateLimiter = new RateLimiter();
        const dataValidator = new DataValidator();
        
        // Get and validate input
        const input = await Actor.getInput();
        const validationResult = dataValidator.validateInput(input);
        
        if (!validationResult.valid) {
            throw new Error(`Invalid input: ${validationResult.errors.join(', ')}`);
        }
        
        // Generate session ID
        const sessionId = crypto.randomBytes(16).toString('hex');
        securityMonitor.setSessionId(sessionId);
        
        // Apply security configuration
        const securityConfig = {
            level: input.securityLevel || 'standard',
            rateLimitDelay: input.rateLimitDelay || 2000,
            encryptData: input.encryptSensitiveData !== false,
            anonymizeData: input.anonymizeData !== false
        };
        
        console.log('📊 Configuration:');
        console.log(`   Vehicle Type: ${input.vehicleType}`);
        console.log(`   Max Results: ${input.maxResults}`);
        console.log(`   Country: ${input.country}`);
        console.log(`   Security Level: ${securityConfig.level}`);
        console.log(`   Session ID: ${sessionId.substring(0, 8)}...\n`);
        
        // Define manufacturers to scrape
        const manufacturers = input.manufacturers && input.manufacturers.length > 0 
            ? input.manufacturers 
            : [
                'Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Tesla',
                'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Nissan', 'Volkswagen',
                'Mazda', 'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Genesis',
                'Volvo', 'Porsche', 'Jaguar', 'Land Rover'
            ];
        
        const allCars = [];
        const startTime = Date.now();
        let processedCount = 0;
        
        // Process each manufacturer
        for (const manufacturer of manufacturers) {
            if (processedCount >= input.maxResults) {
                console.log(`\n⚠️  Reached maximum results limit (${input.maxResults})`);
                break;
            }
            
            console.log(`📊 Processing ${manufacturer}...`);
            
            try {
                const manufacturerCars = await scrapeManufacturer({
                    manufacturer,
                    vehicleType: input.vehicleType,
                    country: input.country,
                    securityMonitor,
                    rateLimiter,
                    dataValidator,
                    securityConfig,
                    maxPerManufacturer: Math.ceil(input.maxResults / manufacturers.length)
                });
                
                // Apply security transformations
                const secureCars = manufacturerCars.map(car => 
                    applySecurityTransformations(car, securityConfig, sessionId)
                );
                
                // Validate and filter
                const validCars = secureCars.filter(car => {
                    const validation = dataValidator.validateCarData(car);
                    return validation.valid;
                });
                
                allCars.push(...validCars);
                processedCount += validCars.length;
                
                console.log(`   ✓ Found ${validCars.length} valid models`);
                
                // Save progress
                await Actor.setValue('progress', {
                    manufacturer,
                    processed: processedCount,
                    total: allCars.length,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`   ✗ Error with ${manufacturer}: ${error.message}`);
                securityMonitor.logEvent('manufacturer_error', {
                    manufacturer,
                    error: error.message
                });
            }
            
            // Rate limiting between manufacturers
            await rateLimiter.delay(securityConfig.rateLimitDelay * 2);
        }
        
        // Add competitor analysis if enabled
        if (input.includeCompetitors && allCars.length > 1) {
            console.log('\n🔍 Adding competitor analysis...');
            await addCompetitorAnalysis(allCars);
        }
        
        // Calculate final statistics
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const successRate = processedCount > 0 ? (allCars.length / processedCount * 100).toFixed(2) : 0;
        
        // Generate metadata
        const metadata = generateMetadata(allCars, processingTime, successRate, securityMonitor);
        
        // Final output structure
        const output = {
            data: allCars,
            metadata: metadata,
            security: securityMonitor.getAuditTrail()
        };
        
        // Push final output
        await Actor.pushData(output);
        
        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ SCRAPING COMPLETED SUCCESSFULLY');
        console.log('='.repeat(50));
        console.log(`⏱️  Processing Time: ${processingTime}s`);
        console.log(`🚗 Total Cars: ${allCars.length}`);
        console.log(`💰 Price Range: $${getMinPrice(allCars).toLocaleString()} - $${getMaxPrice(allCars).toLocaleString()}`);
        console.log(`📊 Data Quality: ${metadata.data_quality_summary.average_score}/100`);
        console.log(`🛡️  Security Score: ${metadata.security_audit.score}/100`);
        console.log('='.repeat(50));
        
        // Final security audit
        await securityMonitor.finalAudit();
        
    } catch (error) {
        console.error('\n❌ Actor failed:', error);
        throw error;
    }
}

/**
 * Apply security transformations to car data
 */
function applySecurityTransformations(carData, securityConfig, sessionId) {
    const transformed = { ...carData };
    
    // Add security metadata
    transformed.session_id = sessionId;
    transformed.scraped_at = new Date().toISOString();
    transformed.security_flags = [];
    
    // Encrypt sensitive data if enabled
    if (securityConfig.encryptData && carData.price) {
        const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
        transformed.price = encryptData(carData.price, encryptionKey);
        transformed.security_flags.push('encrypted_price');
    }
    
    // Anonymize data if enabled
    if (securityConfig.anonymizeData) {
        delete transformed.dealer_info;
        delete transformed.contact_info;
        transformed.security_flags.push('anonymized');
    }
    
    // Add data integrity hash
    transformed.data_hash = generateDataHash(transformed);
    
    // Calculate data quality
    transformed.data_quality = calculateCompleteness(transformed);
    
    return transformed;
}

/**
 * Add competitor analysis to cars
 */
async function addCompetitorAnalysis(cars) {
    const priceGroups = groupCarsByPrice(cars);
    
    for (const car of cars) {
        car.competitors = getCompetitorAnalysis(car, priceGroups);
    }
    
    return cars;
}

/**
 * Group cars by price range
 */
function groupCarsByPrice(cars) {
    const groups = {
        budget: [],      // < $30,000
        midrange: [],    // $30,000 - $50,000
        premium: [],     // $50,000 - $80,000
        luxury: []       // > $80,000
    };
    
    for (const car of cars) {
        const price = car.price?.starting_msrp || 0;
        
        if (price < 30000) groups.budget.push(car);
        else if (price < 50000) groups.midrange.push(car);
        else if (price < 80000) groups.premium.push(car);
        else groups.luxury.push(car);
    }
    
    return groups;
}

/**
 * Generate metadata
 */
function generateMetadata(cars, processingTime, successRate, securityMonitor) {
    const audit = securityMonitor.getAuditSummary();
    
    // Calculate data quality statistics
    const qualityScores = cars.map(car => car.data_quality || 0);
    const avgQuality = qualityScores.length > 0 
        ? Math.round(qualityScores.reduce((a, b) => a + b) / qualityScores.length)
        : 0;
    
    // Calculate price statistics
    const prices = cars.map(car => car.price?.starting_msrp || 0).filter(p => p > 0);
    const avgPrice = prices.length > 0 
        ? Math.round(prices.reduce((a, b) => a + b) / prices.length)
        : 0;
    
    return {
        total_records: cars.length,
        processing_time: `${processingTime}s`,
        success_rate: `${successRate}%`,
        security_audit: {
            score: calculateSecurityScore(audit),
            incidents: audit.security_incidents,
            requests: audit.total_requests,
            blocked: audit.blocked_requests
        },
        data_quality_summary: {
            average_score: avgQuality,
            distribution: {
                excellent: qualityScores.filter(s => s >= 90).length,
                good: qualityScores.filter(s => s >= 70 && s < 90).length,
                fair: qualityScores.filter(s => s >= 50 && s < 70).length,
                poor: qualityScores.filter(s => s < 50).length
            }
        },
        price_statistics: {
            average: avgPrice,
            min: Math.min(...prices),
            max: Math.max(...prices),
            count: prices.length
        },
        timestamp: new Date().toISOString(),
        version: '4.0.0'
    };
}

/**
 * Calculate security score
 */
function calculateSecurityScore(audit) {
    let score = 100;
    
    // Deduct for incidents
    score -= audit.security_incidents * 5;
    
    // Deduct for blocked requests
    if (audit.total_requests > 0) {
        const blockRate = (audit.blocked_requests / audit.total_requests) * 100;
        if (blockRate > 10) score -= 10;
        if (blockRate > 30) score -= 20;
    }
    
    return Math.max(0, Math.round(score));
}

/**
 * Get minimum price from cars
 */
function getMinPrice(cars) {
    const prices = cars.map(car => car.price?.starting_msrp || Infinity);
    return Math.min(...prices) !== Infinity ? Math.min(...prices) : 0;
}

/**
 * Get maximum price from cars
 */
function getMaxPrice(cars) {
    const prices = cars.map(car => car.price?.starting_msrp || 0);
    return Math.max(...prices);
}

// Start the actor
Actor.main(main);

module.exports = { main };