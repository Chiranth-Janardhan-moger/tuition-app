const https = require('https');
const http = require('http');
require('dotenv').config({ path: '../.env' });

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Helper function to make HTTP requests
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    if (data) {
      const jsonData = JSON.stringify(data);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const req = protocol.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(body)
          };
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(response);
          }
        } catch (e) {
          reject({ status: res.statusCode, data: { message: body } });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function regenerateFeeCycles() {
  try {
    console.log('Starting fee cycle regeneration...');
    console.log('API URL:', API_URL);
    
    // Get admin credentials from command line args or use defaults
    const phoneNumber = process.argv[2] || '9876543210';
    const password = process.argv[3] || 'admin123';
    
    // First, login as admin to get token
    console.log('\n1. Logging in as admin...');
    console.log('   Phone:', phoneNumber);
    const loginResponse = await makeRequest(
      `${API_URL}/api/auth/login`,
      { method: 'POST' },
      { phoneNumber, password }
    );
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    
    // Call regenerate-cycles endpoint
    console.log('\n2. Regenerating fee cycles...');
    const response = await makeRequest(
      `${API_URL}/api/fees/regenerate-cycles`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✓ Regeneration completed successfully!');
    console.log('\nResults:');
    console.log('- Total fees fixed:', response.data.totalFixed);
    
    if (response.data.details && response.data.details.length > 0) {
      console.log('\nDetails by student:');
      response.data.details.forEach(detail => {
        console.log(`  ${detail.studentName}:`);
        console.log(`    - Paid fees fixed: ${detail.paidFixed}`);
        console.log(`    - New cycles created: ${detail.newCreated}`);
      });
    }
    
    console.log('\n✓ All done! Fee cycles have been regenerated based on joining dates.');
    
  } catch (error) {
    console.error('\n✗ Error:', error.data?.message || error.message);
    if (error.status === 401) {
      console.error('\nAuthentication failed. Please run the script with your admin credentials:');
      console.error('node regenerateFeeCycles.js <phone_number> <password>');
      console.error('\nExample:');
      console.error('node regenerateFeeCycles.js 9876543210 mypassword');
    }
    process.exit(1);
  }
}

console.log('='.repeat(60));
console.log('Fee Cycle Regeneration Script');
console.log('='.repeat(60));
console.log('\nUsage: node regenerateFeeCycles.js [phone_number] [password]');
console.log('If not provided, defaults will be used (1234567890 / admin123)\n');

// Run the script
regenerateFeeCycles();
