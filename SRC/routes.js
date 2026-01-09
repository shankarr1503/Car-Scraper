/**
 * Main scraping routes and logic
 * @module routes
 */

const { CheerioCrawler, PuppeteerCrawler } = require('crawlee');
const UserAgent = require('user-agents');
const { 
    extractPerformance, 
    extractFeatures, 
    extractSpecifications,
    extractFuelEconomy,
    extractDimensions,
    estimatePrice,
    calculateValueScore
} = require('./utils');

/**
 * Scrape a manufacturer's models
 */
async function scrapeManufacturer(config) {
    const {
        manufacturer,
        vehicleType,
        country,
        securityMonitor,
        rateLimiter,
        dataValidator,
        securityConfig,
        maxPerManufacturer = 10
    } = config;
    
    const cars = [];
    
    try {
        // Get model list
        const models = await getManufacturerModels(manufacturer, vehicleType, country, securityMonitor);
        
        // Scrape each model
        for (const model of models.slice(0, maxPerManufacturer)) {
            try {
                const carData = await scrapeCarDetails({
                    manufacturer,
                    model,
                    country,
                    securityMonitor,
                    rateLimiter
                });
                
                if (carData) {
                    cars.push(carData);
                }
                
                // Rate limiting
                await rateLimiter.delay(securityConfig.rateLimitDelay);
                
            } catch (error) {
                securityMonitor.logEvent('model_scrape_error', {
                    manufacturer,
                    model,
                    error: error.message
                });
            }
        }
        
    } catch (error) {
        throw new Error(`Failed to scrape ${manufacturer}: ${error.message}`);
    }
    
    return cars;
}

/**
 * Get manufacturer models
 */
async function getManufacturerModels(manufacturer, vehicleType, country, securityMonitor) {
    const models = new Set();
    
    const crawler = new PuppeteerCrawler({
        launchContext: {
            launchOptions: {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            }
        },
        navigationTimeoutSecs: 30,
        maxRequestRetries: 2,
        
        async requestHandler({ page }) {
            // Set random user agent
            const userAgent = new UserAgent();
            await page.setUserAgent(userAgent.toString());
            
            // Block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'stylesheet', 'font'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            // Search for models
            const searchQuery = `${manufacturer} ${vehicleType} models 2024 2025`;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=${country}`;
            
            await page.goto(searchUrl, { waitUntil: 'networkidle2' });
            
            // Extract models from page
            const pageModels = await page.evaluate((manuf) => {
                const foundModels = [];
                const selectors = ['h3', '.DKV0Md', '.LC20lb', '.yuRUbf a'];
                
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text.includes(manuf) && text.length < 100) {
                            // Extract model name
                            const modelRegex = new RegExp(`${manuf}\\s+([A-Z][a-zA-Z0-9\\-\\s]+)`, 'i');
                            const match = text.match(modelRegex);
                            if (match) {
                                foundModels.push(match[0]);
                            }
                        }
                    });
                });
                
                return [...new Set(foundModels)];
            }, manufacturer);
            
            pageModels.forEach(model => models.add(model));
        },
        
        async failedRequestHandler({ request, error }) {
            securityMonitor.logEvent('crawl_failed', {
                url: request.url,
                error: error.message
            });
        }
    });
    
    try {
        await crawler.run([`search-${manufacturer}`]);
    } catch (error) {
        securityMonitor.logEvent('models_crawl_failed', {
            manufacturer,
            error: error.message
        });
    }
    
    return Array.from(models).slice(0, 15);
}

/**
 * Scrape car details
 */
async function scrapeCarDetails(config) {
    const {
        manufacturer,
        model,
        country,
        securityMonitor,
        rateLimiter
    } = config;
    
    const carData = {
        vehicle_type: 'Sedan',
        manufacturer,
        model,
        year: new Date().getFullYear(),
        price: {},
        performance: {},
        features: [],
        specifications: {},
        dimensions: {},
        fuel_economy: {},
        scraped_at: new Date().toISOString()
    };
    
    try {
        // Try multiple data sources
        const sources = [
            scrapeFromGoogle,
            // scrapeFromEdmunds,
            // scrapeFromCarsCom
        ];
        
        for (const source of sources) {
            try {
                const sourceData = await source(manufacturer, model, country, securityMonitor);
                if (sourceData && Object.keys(sourceData).length > 0) {
                    mergeCarData(carData, sourceData);
                    if (carData.price?.starting_msrp && carData.performance?.horsepower) {
                        break; // Got good data, stop trying sources
                    }
                }
            } catch (error) {
                // Continue to next source
            }
        }
        
        // Estimate missing data
        if (!carData.price?.starting_msrp) {
            carData.price.starting_msrp = estimatePrice(manufacturer, model);
            carData.price.is_estimated = true;
        }
        
        // Calculate derived fields
        carData.value_score = calculateValueScore(carData);
        
        return carData;
        
    } catch (error) {
        securityMonitor.logEvent('car_details_error', {
            manufacturer,
            model,
            error: error.message
        });
        return null;
    }
}

/**
 * Scrape data from Google
 */
async function scrapeFromGoogle(manufacturer, model, country, securityMonitor) {
    const data = {};
    
    const crawler = new CheerioCrawler({
        maxRequestRetries: 2,
        
        async requestHandler({ $, request }) {
            const bodyText = $('body').text();
            const lowerBody = bodyText.toLowerCase();
            
            // Extract price
            const priceMatches = bodyText.match(/\$([\d,]+)/g) || [];
            const prices = priceMatches
                .map(p => parseFloat(p.replace(/[$,]/g, '')))
                .filter(p => p > 1000 && p < 500000);
            
            if (prices.length > 0) {
                data.price = {
                    starting_msrp: Math.min(...prices),
                    max_price: Math.max(...prices),
                    price_range: `$${Math.min(...prices).toLocaleString()} - $${Math.max(...prices).toLocaleString()}`
                };
            }
            
            // Extract other data
            data.performance = extractPerformance(lowerBody);
            data.features = extractFeatures(lowerBody);
            data.specifications = extractSpecifications(lowerBody);
            data.fuel_economy = extractFuelEconomy(lowerBody);
            data.dimensions = extractDimensions(lowerBody);
        }
    });
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${manufacturer} ${model} price specifications 2024`)}&gl=${country}`;
    
    try {
        await crawler.run([searchUrl]);
    } catch (error) {
        securityMonitor.logEvent('google_scrape_failed', {
            manufacturer,
            model,
            error: error.message
        });
    }
    
    return data;
}

/**
 * Merge car data from different sources
 */
function mergeCarData(target, source) {
    // Merge price
    if (source.price) {
        target.price = { ...target.price, ...source.price };
    }
    
    // Merge performance
    if (source.performance) {
        target.performance = { ...target.performance, ...source.performance };
    }
    
    // Merge features
    if (source.features) {
        target.features = [...new Set([...target.features, ...source.features])];
    }
    
    // Merge specifications
    if (source.specifications) {
        target.specifications = { ...target.specifications, ...source.specifications };
    }
    
    // Merge other fields
    ['dimensions', 'fuel_economy', 'safety_ratings'].forEach(field => {
        if (source[field]) {
            target[field] = { ...target[field], ...source[field] };
        }
    });
}

/**
 * Get competitor analysis for a car
 */
function getCompetitorAnalysis(car, priceGroups) {
    const carPrice = car.price?.starting_msrp || 0;
    let competitorsGroup;
    
    if (carPrice < 30000) competitorsGroup = priceGroups.budget;
    else if (carPrice < 50000) competitorsGroup = priceGroups.midrange;
    else if (carPrice < 80000) competitorsGroup = priceGroups.premium;
    else competitorsGroup = priceGroups.luxury;
    
    // Find top 3 competitors
    return competitorsGroup
        .filter(c => 
            c.manufacturer !== car.manufacturer && 
            Math.abs((c.price?.starting_msrp || 0) - carPrice) < 15000
        )
        .slice(0, 3)
        .map(competitor => ({
            manufacturer: competitor.manufacturer,
            model: competitor.model,
            price_difference: ((competitor.price?.starting_msrp || 0) - carPrice).toFixed(0),
            key_advantages: getAdvantages(competitor, car)
        }));
}

/**
 * Get advantages of competitor over car
 */
function getAdvantages(competitor, car) {
    const advantages = [];
    
    if ((competitor.performance?.horsepower || 0) > (car.performance?.horsepower || 0)) {
        advantages.push('More horsepower');
    }
    
    if ((competitor.features?.length || 0) > (car.features?.length || 0)) {
        advantages.push('More features');
    }
    
    if ((competitor.fuel_economy?.combined || 0) > (car.fuel_economy?.combined || 0)) {
        advantages.push('Better fuel economy');
    }
    
    return advantages;
}

module.exports = {
    scrapeManufacturer,
    getCompetitorAnalysis
};