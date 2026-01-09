/**
 * Utility functions for the scraper
 * @module utils
 */

const crypto = require('crypto');

/**
 * Encrypt sensitive data
 */
function encryptData(data, key) {
    if (!key) return data;
    
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm: 'aes-256-gcm'
        };
    } catch (error) {
        console.error('Encryption failed:', error.message);
        return data;
    }
}

/**
 * Decrypt data
 */
function decryptData(encryptedData, key) {
    if (!encryptedData.encrypted || !key) {
        return encryptedData;
    }
    
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(key, 'hex'),
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error.message);
        throw error;
    }
}

/**
 * Generate data integrity hash
 */
function generateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Sanitize string input
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .trim()
        .replace(/[<>"'`]/g, '')
        .substring(0, 500);
}

/**
 * Parse price string to number
 */
function parsePrice(priceString) {
    if (!priceString) return null;
    
    const match = priceString.match(/\$?([\d,]+(?:\.\d{2})?)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

/**
 * Calculate data completeness score
 */
function calculateCompleteness(carData) {
    const requiredFields = [
        'manufacturer',
        'model',
        'price.starting_msrp',
        'performance.horsepower',
        'specifications.engine'
    ];
    
    let score = 0;
    
    requiredFields.forEach(field => {
        const keys = field.split('.');
        let value = carData;
        let exists = true;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                exists = false;
                break;
            }
        }
        
        if (exists && value !== null && value !== undefined) {
            score += 20;
        }
    });
    
    return Math.min(100, score);
}

/**
 * Extract performance metrics from text
 */
function extractPerformance(text) {
    const performance = {};
    
    // Horsepower
    const hpMatch = text.match(/(\d+)\s*hp|horsepower[:\s]*(\d+)/i);
    if (hpMatch) performance.horsepower = parseInt(hpMatch[1] || hpMatch[2]);
    
    // Torque
    const torqueMatch = text.match(/(\d+)\s*lb-ft|torque[:\s]*(\d+)/i);
    if (torqueMatch) performance.torque = parseInt(torqueMatch[1] || torqueMatch[2]);
    
    // 0-60 acceleration
    const accelMatch = text.match(/(\d+\.?\d*)\s*seconds?\s*0-?60|0-?60[:\s]*(\d+\.?\d*)/i);
    if (accelMatch) performance.acceleration_0_60 = parseFloat(accelMatch[1] || accelMatch[2]);
    
    // Engine
    const engineMatch = text.match(/engine[:\s]*([^.\n]+)/i);
    if (engineMatch) performance.engine = engineMatch[1].trim();
    
    return performance;
}

/**
 * Extract features from text
 */
function extractFeatures(text) {
    const features = [];
    const featureKeywords = [
        'leather seats', 'sunroof', 'navigation', 'bluetooth',
        'apple carplay', 'android auto', 'backup camera', 'blind spot',
        'lane keep', 'adaptive cruise', 'heated seats', 'ventilated seats',
        'premium audio', 'wireless charging', 'keyless entry', 'push button start',
        'parking sensors', '360 camera', 'heads up display'
    ];
    
    featureKeywords.forEach(feature => {
        if (text.includes(feature)) {
            features.push(feature);
        }
    });
    
    return features;
}

/**
 * Extract specifications from text
 */
function extractSpecifications(text) {
    const specs = {};
    
    // Transmission
    const transMatch = text.match(/transmission[:\s]*([^.\n]+)/i);
    if (transMatch) specs.transmission = transMatch[1].trim();
    
    // Drivetrain
    const driveMatch = text.match(/drivetrain[:\s]*([^.\n]+)|(fwd|awd|rwd|4wd)/i);
    if (driveMatch) specs.drivetrain = (driveMatch[1] || driveMatch[2]).trim();
    
    // Fuel type
    const fuelMatch = text.match(/fuel type[:\s]*([^.\n]+)/i);
    if (fuelMatch) specs.fuel_type = fuelMatch[1].trim();
    
    return specs;
}

/**
 * Extract fuel economy from text
 */
function extractFuelEconomy(text) {
    const fuel = {};
    
    const cityMatch = text.match(/city[:\s]*(\d+)\s*mpg/i);
    const highwayMatch = text.match(/highway[:\s]*(\d+)\s*mpg/i);
    const combinedMatch = text.match(/combined[:\s]*(\d+)\s*mpg/i);
    
    if (cityMatch) fuel.city = parseInt(cityMatch[1]);
    if (highwayMatch) fuel.highway = parseInt(highwayMatch[1]);
    if (combinedMatch) fuel.combined = parseInt(combinedMatch[1]);
    
    return fuel;
}

/**
 * Extract dimensions from text
 */
function extractDimensions(text) {
    const dims = {};
    
    const lengthMatch = text.match(/length[:\s]*([\d\.]+)\s*(in|inches?)/i);
    const widthMatch = text.match(/width[:\s]*([\d\.]+)\s*(in|inches?)/i);
    const heightMatch = text.match(/height[:\s]*([\d\.]+)\s*(in|inches?)/i);
    const wheelbaseMatch = text.match(/wheelbase[:\s]*([\d\.]+)\s*(in|inches?)/i);
    
    if (lengthMatch) dims.length = `${lengthMatch[1]} in`;
    if (widthMatch) dims.width = `${widthMatch[1]} in`;
    if (heightMatch) dims.height = `${heightMatch[1]} in`;
    if (wheelbaseMatch) dims.wheelbase = `${wheelbaseMatch[1]} in`;
    
    return dims;
}

/**
 * Estimate price based on manufacturer and model
 */
function estimatePrice(manufacturer, model) {
    const priceRanges = {
        'Toyota': 28000, 'Honda': 29000, 'BMW': 55000,
        'Mercedes-Benz': 60000, 'Audi': 52000, 'Tesla': 55000,
        'Ford': 32000, 'Chevrolet': 30000, 'Hyundai': 27000,
        'Kia': 28000, 'Nissan': 29000, 'Volkswagen': 31000,
        'Mazda': 29000, 'Subaru': 30000, 'Lexus': 45000,
        'Acura': 38000, 'Infiniti': 42000, 'Genesis': 48000,
        'Volvo': 47000, 'Porsche': 75000, 'Jaguar': 55000,
        'Land Rover': 65000
    };
    
    return priceRanges[manufacturer] || 35000;
}

/**
 * Calculate value score for a car
 */
function calculateValueScore(carData) {
    let score = 50;
    
    // Price component
    if (carData.price?.starting_msrp) {
        if (carData.price.starting_msrp < 25000) score += 20;
        else if (carData.price.starting_msrp < 35000) score += 10;
        else if (carData.price.starting_msrp > 60000) score -= 10;
    }
    
    // Performance component
    if (carData.performance?.horsepower) {
        if (carData.performance.horsepower > 300) score += 15;
        else if (carData.performance.horsepower > 200) score += 10;
    }
    
    // Features component
    if (carData.features?.length > 0) {
        score += Math.min(carData.features.length, 10);
    }
    
    // Fuel economy component
    if (carData.fuel_economy?.combined) {
        if (carData.fuel_economy.combined > 35) score += 15;
        else if (carData.fuel_economy.combined > 25) score += 5;
    }
    
    return Math.min(Math.max(score, 0), 100);
}

module.exports = {
    encryptData,
    decryptData,
    generateDataHash,
    sanitizeString,
    parsePrice,
    calculateCompleteness,
    extractPerformance,
    extractFeatures,
    extractSpecifications,
    extractFuelEconomy,
    extractDimensions,
    estimatePrice,
    calculateValueScore
};