#!/usr/bin/env node

/**
 * Security check script
 * @module security-check
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Running security checks...\n');

const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
};

/**
 * Run all security checks
 */
async function runSecurityChecks() {
    console.log('📋 Security Audit Report');
    console.log('='.repeat(50));
    
    await checkDependencies();
    await checkConfiguration();
    await checkFilePermissions();
    await checkSensitiveData();
    await checkCodeSecurity();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Passed: ${checks.passed}`);
    console.log(`   ⚠️  Warnings: ${checks.warnings}`);
    console.log(`   ❌ Failed: ${checks.failed}`);
    
    const score = Math.round((checks.passed / (checks.passed + checks.failed + checks.warnings)) * 100);
    console.log(`\n   🛡️  Security Score: ${score}/100`);
    
    if (score < 70) {
        console.error('\n❌ Security check failed! Score too low.');
        process.exit(1);
    }
    
    console.log('\n✅ Security checks passed!');
}

/**
 * Check dependencies
 */
async function checkDependencies() {
    process.stdout.write('• Checking dependencies... ');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const vulnerablePackages = [
            'lodash', 'hoek', 'minimist', 'axios' // Example checks
        ];
        
        const found = vulnerablePackages.filter(pkg => dependencies[pkg]);
        
        if (found.length > 0) {
            console.log('⚠️');
            console.log(`   Warning: Potentially vulnerable packages: ${found.join(', ')}`);
            checks.warnings++;
        } else {
            console.log('✅');
            checks.passed++;
        }
    } catch (error) {
        console.log('❌');
        console.log(`   Error: ${error.message}`);
        checks.failed++;
    }
}

/**
 * Check configuration
 */
async function checkConfiguration() {
    process.stdout.write('• Checking configuration... ');
    
    try {
        const configFiles = ['.env.example', 'config/security.js'];
        
        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                
                // Check for hardcoded secrets
                const secretPatterns = [
                    /password\s*=\s*['"][^'"]+['"]/i,
                    /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
                    /secret\s*=\s*['"][^'"]+['"]/i
                ];
                
                secretPatterns.forEach(pattern => {
                    if (pattern.test(content)) {
                        throw new Error(`Hardcoded secret found in ${file}`);
                    }
                });
            }
        }
        
        console.log('✅');
        checks.passed++;
    } catch (error) {
        console.log('❌');
        console.log(`   Error: ${error.message}`);
        checks.failed++;
    }
}

/**
 * Check file permissions
 */
async function checkFilePermissions() {
    process.stdout.write('• Checking file permissions... ');
    
    try {
        const sensitiveFiles = [
            { path: '.env', expected: '600' },
            { path: 'package.json', expected: '644' }
        ];
        
        for (const file of sensitiveFiles) {
            if (fs.existsSync(file.path)) {
                const stats = fs.statSync(file.path);
                const mode = stats.mode.toString(8).slice(-3);
                
                if (mode !== file.expected) {
                    console.log('⚠️');
                    console.log(`   Warning: ${file.path} has permissions ${mode}, expected ${file.expected}`);
                    checks.warnings++;
                    return;
                }
            }
        }
        
        console.log('✅');
        checks.passed++;
    } catch (error) {
        console.log('❌');
        console.log(`   Error: ${error.message}`);
        checks.failed++;
    }
}

/**
 * Check for sensitive data
 */
async function checkSensitiveData() {
    process.stdout.write('• Checking for sensitive data... ');
    
    try {
        const piiPatterns = [
            /[\w\.-]+@[\w\.-]+\.\w+/g, // Email
            /\d{3}[-.]?\d{3}[-.]?\d{4}/g, // Phone
            /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g // Credit card
        ];
        
        const codeFiles = getCodeFiles();
        let foundPII = false;
        
        for (const file of codeFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            piiPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches && matches.length > 0) {
                    foundPII = true;
                    console.log('❌');
                    console.log(`   Error: Potential PII found in ${file}`);
                    checks.failed++;
                    return;
                }
            });
        }
        
        if (!foundPII) {
            console.log('✅');
            checks.passed++;
        }
    } catch (error) {
        console.log('❌');
        console.log(`   Error: ${error.message}`);
        checks.failed++;
    }
}

/**
 * Check code security
 */
async function checkCodeSecurity() {
    process.stdout.write('• Checking code security... ');
    
    try {
        const unsafePatterns = [
            { pattern: /eval\(/, message: 'eval() usage detected' },
            { pattern: /setTimeout\(.*,.*0\)/, message: 'Potential race condition' },
            { pattern: /innerHTML\s*=/, message: 'innerHTML assignment detected' },
            { pattern: /child_process\.exec\(/, message: 'Unsafe exec() usage' }
        ];
        
        const codeFiles = getCodeFiles();
        let issuesFound = false;
        
        for (const file of codeFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            unsafePatterns.forEach(({ pattern, message }) => {
                if (pattern.test(content)) {
                    issuesFound = true;
                    console.log('⚠️');
                    console.log(`   Warning: ${message} in ${file}`);
                    checks.warnings++;
                }
            });
        }
        
        if (!issuesFound) {
            console.log('✅');
            checks.passed++;
        }
    } catch (error) {
        console.log('❌');
        console.log(`   Error: ${error.message}`);
        checks.failed++;
    }
}

/**
 * Get all code files
 */
function getCodeFiles() {
    const extensions = ['.js', '.json'];
    const ignoreDirs = ['node_modules', '.git', 'dist'];
    
    const files = [];
    
    function walk(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (!ignoreDirs.includes(item)) {
                    walk(fullPath);
                }
            } else if (extensions.includes(path.extname(item))) {
                files.push(fullPath);
            }
        }
    }
    
    walk('.');
    return files;
}

// Run checks if script is called directly
if (require.main === module) {
    runSecurityChecks().catch(console.error);
}

module.exports = { runSecurityChecks };