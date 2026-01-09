const { Apify, log } = require('apify');
const { createHash } = require('crypto');
const { URL } = require('url');

class SecureCarScraper {
    constructor(input) {
        this.input = input;
        this.requestQueue = null;
        this.dataset = null;
        this.userAgents = this.getUserAgents();
        this.sessionCount = 0;
        this.requestCount = 0;
    }

    getUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    validateUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch (error) {
            log.error(`Invalid URL: ${url}`);
            return false;
        }
    }

    sanitizeData(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = value.trim().replace(/[<>]/g, '');
            } else if (Array.isArray(value)) {
                sanitized[key] = value.filter(item => item && typeof item === 'string').map(item => item.trim());
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    async setupRequestQueue() {
        this.requestQueue = await Apify.openRequestQueue('car-scraper-queue');
        
        for (const startUrl of this.input.startUrls) {
            if (this.validateUrl(startUrl)) {
                await this.requestQueue.addRequest({
                    url: startUrl,
                    userData: { label: 'START' }
                });
            }
        }
    }

    async setupDataset() {
        this.dataset = await Apify.openDataset('car-listings');
    }

    createSecureHeaders() {
        return {
            'User-Agent': this.input.userAgent || this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };
    }

    async handlePageFunction({ request, response, body, contentType, $ }) {
        const { url } = request;
        
        if (response.statusCode !== 200) {
            log.warning(`Non-200 status code: ${response.statusCode} for URL: ${url}`);
            return;
        }

        try {
            if (request.userData.label === 'START') {
                await this.parseListingPage($, url);
            } else if (request.userData.label === 'DETAIL') {
                await this.parseDetailPage($, url);
            }
        } catch (error) {
            log.error(`Error processing page ${url}: ${error.message}`);
        }
    }

    async parseListingPage($, sourceUrl) {
        const carListings = [];
        
        $('.car-listing, .vehicle-item, .listing-card').each((index, element) => {
            try {
                const $element = $(element);
                const title = $element.find('.title, .car-title, h2, h3').first().text().trim();
                const price = $element.find('.price, .cost, .amount').first().text().trim();
                const link = $element.find('a').first().attr('href');
                const image = $element.find('img').first().attr('src');
                
                if (title && price) {
                    const carData = this.sanitizeData({
                        title,
                        price,
                        link: link ? new URL(link, sourceUrl).href : null,
                        image: image ? new URL(image, sourceUrl).href : null,
                        sourceUrl,
                        scrapedAt: new Date().toISOString(),
                        id: createHash('md5').update(title + price + sourceUrl).digest('hex')
                    });
                    
                    carListings.push(carData);
                }
            } catch (error) {
                log.warning(`Error parsing listing item: ${error.message}`);
            }
        });

        if (carListings.length > 0) {
            await this.dataset.pushData(carListings);
            log.info(`Scraped ${carListings.length} car listings from ${sourceUrl}`);
        }

        await this.enqueueDetailPages($, sourceUrl);
    }

    async parseDetailPage($, sourceUrl) {
        try {
            const carData = this.sanitizeData({
                title: $('h1, .vehicle-title, .car-title').first().text().trim(),
                price: $('.price, .cost, .amount').first().text().trim(),
                year: $('.year, .vehicle-year').first().text().trim(),
                make: $('.make, .vehicle-make').first().text().trim(),
                model: $('.model, .vehicle-model').first().text().trim(),
                mileage: $('.mileage, .odometer').first().text().trim(),
                transmission: $('.transmission, .gearbox').first().text().trim(),
                fuel: $('.fuel, .fuel-type').first().text().trim(),
                description: $('.description, .vehicle-description').first().text().trim(),
                images: $('.gallery img, .vehicle-images img').map((i, el) => $(el).attr('src')).get(),
                sourceUrl,
                scrapedAt: new Date().toISOString(),
                type: 'detail'
            });

            await this.dataset.pushData(carData);
            log.info(`Scraped detailed car information from ${sourceUrl}`);
        } catch (error) {
            log.error(`Error parsing detail page ${sourceUrl}: ${error.message}`);
        }
    }

    async enqueueDetailPages($, sourceUrl) {
        $('.car-listing a, .vehicle-item a, .listing-card a').each((index, element) => {
            const href = $(element).attr('href');
            if (href && this.requestCount < this.input.maxPages * 20) {
                const absoluteUrl = new URL(href, sourceUrl).href;
                if (this.validateUrl(absoluteUrl)) {
                    this.requestQueue.addRequest({
                        url: absoluteUrl,
                        userData: { label: 'DETAIL' }
                    });
                    this.requestCount++;
                }
            }
        });
    }

    async run() {
        log.info('Starting secure car scraper...');
        
        try {
            await this.setupRequestQueue();
            await this.setupDataset();

            const requestListOptions = {
                maxRequestRetries: this.input.maxRetries || 3,
                maxRequestsPerCrawl: this.input.maxPages || 10,
                requestQueueTimeoutSecs: 60,
                handlePageFunction: this.handlePageFunction.bind(this),
                requestHandlerTimeoutSecs: 30,
                maxConcurrency: 5,
                useSessionPool: true,
                sessionPoolOptions: {
                    maxPoolSize: 100,
                    sessionOptions: {
                        maxUsageCount: 10,
                        errorScoreThreshold: 0.7,
                        errorScoreDecrement: 0.1
                    }
                }
            };

            if (this.input.proxyType) {
                requestListOptions.proxyConfiguration = await Apify.createProxyConfiguration({
                    groups: [this.input.proxyType],
                    useApifyProxy: true
                });
            }

            const crawler = new Apify.CheerioCrawler({
                ...requestListOptions,
                preNavigationHooks: [
                    async ({ request }, gotoOptions) => {
                        gotoOptions.headers = this.createSecureHeaders();
                        if (this.input.requestDelay) {
                            await new Promise(resolve => setTimeout(resolve, this.input.requestDelay));
                        }
                    }
                ]
            });

            await crawler.run(this.requestQueue);
            
            log.info('Scraping completed successfully');
            
        } catch (error) {
            log.error(`Scraper failed: ${error.message}`);
            throw error;
        }
    }
}

Apify.main(async () => {
    const input = await Apify.getInput();
    
    if (!input || !input.startUrls || input.startUrls.length === 0) {
        throw new Error('Missing or invalid startUrls in input');
    }

    const scraper = new SecureCarScraper(input);
    await scraper.run();
});

module.exports = { SecureCarScraper };