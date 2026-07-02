const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function run() {
  try {
    console.log('1. Registering test user...');
    const testEmail = `testuser_${Date.now()}@example.com`;
    let res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: testEmail,
      password: 'Password123!',
      role: 'ADMIN'
    });
    console.log('Register Response:', res.data);
    
    console.log('\n2. Testing Forgot Password...');
    res = await axios.post(`${API_URL}/auth/forgot-password`, { email: testEmail });
    console.log('Forgot Password Response:', res.data);

    console.log('\n3. Testing Resend Verification...');
    res = await axios.post(`${API_URL}/auth/resend-verification`, { email: testEmail });
    console.log('Resend Verification Response:', res.data);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
