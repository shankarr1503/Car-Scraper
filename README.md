# Secure Car Scraper

A production-ready car listing scraper built with Apify, featuring advanced security measures and anti-detection capabilities.

## 🔒 Security Features

- **Rate Limiting**: Configurable delays between requests
- **IP Rotation**: Residential/datacenter proxy support
- **User-Agent Rotation**: Randomized browser signatures
- **Request Headers**: Mimics real browser behavior
- **Data Sanitization**: Input validation and XSS prevention
- **Session Management**: Advanced session pool handling
- **Error Handling**: Comprehensive retry logic
- **Logging**: Security-focused audit trails

## 🚀 Features

- Multi-site car listing extraction
- Detailed vehicle information parsing
- Image and metadata collection
- Configurable output formats (JSON, CSV, XLSX)
- Scalable architecture with request queues
- Real-time monitoring and logging

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Apify account and token

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/username/car-scraper.git
cd car-scraper

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your settings
# Edit .env with your API keys and preferences
```

## ⚙️ Configuration

### Environment Variables

Edit `.env` file with your settings:

```bash
# Required
APIFY_TOKEN=your_apify_token_here

# Security
MAX_REQUESTS_PER_MINUTE=60
REQUEST_TIMEOUT=30000
PROXY_TYPE=residential
```

### Input Schema

Configure scraping parameters via `INPUT_SCHEMA.json`:

- `startUrls`: Target websites to scrape
- `maxPages`: Maximum pages to process
- `proxyType`: Residential/datacenter/Google proxies
- `requestDelay`: Delay between requests (ms)
- `useHeadless`: Enable Puppeteer for JS-heavy sites

## 🏃‍♂️ Usage

### Local Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Security audit
npm run security
```

### Production Deployment

```bash
# Start scraper
npm start

# Build for production
npm run build
```

### Apify Platform

1. Push to Apify:
```bash
apify push
```

2. Configure input parameters in the Apify UI
3. Run the actor with desired settings

## 🔧 Security Guidelines

### ⚠️ Important Security Notes

1. **Never commit sensitive data**:
   - API keys, tokens, passwords
   - Personal information
   - Database credentials

2. **Rate limiting compliance**:
   - Respect robots.txt files
   - Implement appropriate delays
   - Monitor for IP blocks

3. **Data protection**:
   - Sanitize all scraped data
   - Validate input parameters
   - Use secure data storage

4. **Proxy usage**:
   - Rotate IP addresses regularly
   - Use residential proxies for better success rates
   - Monitor proxy performance

### 🛡️ Best Practices

- Always validate URLs before processing
- Implement proper error handling
- Use HTTPS connections when possible
- Monitor scraping activities
- Respect website terms of service
- Implement data retention policies

## 📊 Output Format

The scraper generates structured data with the following fields:

```json
{
  "title": "Vehicle Title",
  "price": "$25,000",
  "year": "2023",
  "make": "Toyota",
  "model": "Camry",
  "mileage": "15,000 miles",
  "transmission": "Automatic",
  "fuel": "Gasoline",
  "description": "Vehicle description...",
  "images": ["url1", "url2"],
  "sourceUrl": "https://example.com/listing/123",
  "scrapedAt": "2024-01-09T14:30:00.000Z",
  "id": "unique_hash_id"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Rate Limiting**:
   - Increase `requestDelay`
   - Use residential proxies
   - Reduce concurrency

2. **Blocking**:
   - Rotate user agents
   - Change proxy type
   - Implement headless browsing

3. **Parsing Errors**:
   - Check website structure changes
   - Update CSS selectors
   - Validate HTML responses

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true npm start
```

## 📝 Monitoring

- Check Apify console for run statistics
- Monitor error rates and success rates
- Review logs for security issues
- Track proxy performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement security best practices
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This tool is for educational and legitimate data collection purposes only. Users are responsible for:

- Compliance with website terms of service
- Adherence to data protection laws (GDPR, CCPA)
- Respect for robots.txt and rate limits
- Proper handling of scraped data

The authors are not liable for misuse of this software.

## 📞 Support

For security issues or questions:
- Create an issue in the repository
- Review the documentation
- Check Apify community forums