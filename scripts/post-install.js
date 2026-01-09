#!/usr/bin/env node

/**
 * Post-installation setup script
 * @module post-install
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Setting up secure car scraper...\n');

/**
 * Create necessary directories
 */
function createDirectories() {
    const directories = [
        '.actor',
        'src/security',
        'config',
        'scripts',
        'tests',
        'logs',
        'data'
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
}

/**
 * Create environment file
 */
function createEnvFile() {
    const envExample = `# Security Configuration
ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}
LOG_LEVEL=info
SECURITY_LEVEL=standard

# Rate Limiting
RATE_LIMIT_DELAY=2000
MAX_RETRIES=3

# Data Protection
ENCRYPT_SENSITIVE_DATA=true
ANONYMIZE_DATA=true

# Monitoring
ENABLE_AUDIT_LOG=true
`;

    if (!fs.existsSync('.env.example')) {
        fs.writeFileSync('.env.example', envExample);
        console.log('📄 Created .env.example file');
    }
    
    if (!fs.existsSync('.env')) {
        fs.writeFileSync('.env', '# Copy from .env.example and update values\n');
        console.log('📄 Created .env file (update with your values)');
    }
}

/**
 * Set file permissions
 */
function setFilePermissions() {
    const sensitiveFiles = ['.env', 'config/security.js'];
    
    sensitiveFiles.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                fs.chmodSync(file, 0o600);
                console.log(`🔐 Set secure permissions for: ${file}`);
            } catch (error) {
                console.log(`⚠️  Could not set permissions for ${file}: ${error.message}`);
            }
        }
    });
}

/**
 * Create security documentation
 */
function createSecurityDocs() {
    const securityReadme = `# Security Features

## Overview
This actor includes multiple security layers for safe data scraping.

## Security Layers
1. **Data Encryption**: AES-256-GCM for sensitive data
2. **Rate Limiting**: Adaptive delays and exponential backoff
3. **Data Validation**: Comprehensive input/output validation
4. **Privacy Compliance**: GDPR and CCPA compliant
5. **Anti-detection**: User agent rotation, fingerprint randomization

## Configuration
See .env.example for configuration options.

## Monitoring
- Real-time security monitoring
- Audit logging
- Incident detection
`;

    if (!fs.existsSync('SECURITY.md')) {
        fs.writeFileSync('SECURITY.md', securityReadme);
        console.log('📚 Created security documentation');
    }
}

/**
 * Run initial checks
 */
function runInitialChecks() {
    console.log('\n🔍 Running initial checks...');
    
    const checks = [
        { name: 'Node.js version', check: () => process.version },
        { name: 'NPM version', check: () => require('child_process').execSync('npm --version').toString().trim() }
    ];
    
    checks.forEach(({ name, check }) => {
        try {
            const result = check();
            console.log(`   ✅ ${name}: ${result}`);
        } catch (error) {
            console.log(`   ❌ ${name}: ${error.message}`);
        }
    });
}

/**
 * Main setup function
 */
async function main() {
    console.log('🚀 Starting setup...\n');
    
    try {
        createDirectories();
        createEnvFile();
        setFilePermissions();
        createSecurityDocs();
        runInitialChecks();
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Setup completed successfully!');
        console.log('='.repeat(50));
        console.log('\nNext steps:');
        console.log('1. Update .env file with your configuration');
        console.log('2. Run security checks: npm run security-check');
        console.log('3. Test the actor locally');
        console.log('\n🔒 Your actor is now security-hardened!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup if script is called directly
if (require.main === module) {
    main();
}

module.exports = { main };