const axios = require('axios');

const BASE_URL = process.env.SETU_BASE_URL; // https://fiu-sandbox.setu.co

const setuClient = axios.create({ baseURL: BASE_URL });

// Inject auth headers on every request
setuClient.interceptors.request.use((config) => {
  config.headers['x-client-id'] = process.env.SETU_CLIENT_ID;
  config.headers['x-client-secret'] = process.env.SETU_CLIENT_SECRET;
  config.headers['x-product-instance-id'] = process.env.SETU_PRODUCT_INSTANCE_ID;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

// Mock simulation adapter for local testing when no real credentials are set
const isPlaceholder = !process.env.SETU_CLIENT_ID || 
                      process.env.SETU_CLIENT_ID === 'your_client_id_here' || 
                      process.env.SETU_CLIENT_ID === 'your_x_client_id_here' ||
                      process.env.SETU_CLIENT_ID === 'sandbox_client_tally_replica';

async function mockAdapter(config) {
  // 1. POST /consents -> Return redirect URL back to frontend banking view
  if (config.url === '/consents' && config.method === 'post') {
    const consentId = 'mock-consent-' + Date.now();
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUrl = `${clientUrl}/banking?mock_consent_success=true&consent_id=${consentId}`;
    return {
      data: { id: consentId, url: redirectUrl },
      status: 201,
      statusText: 'Created',
      headers: {},
      config
    };
  }

  // 2. POST /sessions -> Return session ID
  if (config.url === '/sessions' && config.method === 'post') {
    const sessionId = 'mock-session-' + Date.now();
    return {
      data: { id: sessionId },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  }

  // 3. GET /sessions/:id -> Return transactions for HDFC Savings
  if (config.url.startsWith('/sessions/') && config.method === 'get') {
    return {
      data: {
        fips: [
          {
            accounts: [
              {
                linkRefNumber: 'ref-hdfc-123',
                data: {
                  account: {
                    transactions: {
                      transaction: [
                        { txnId: 'txn-mock-01', transactionTimestamp: new Date(Date.now() - 1*24*60*60*1000).toISOString(), narration: 'UPI/9920199/Merchant Payment', amount: '5000.00', type: 'DEBIT' },
                        { txnId: 'txn-mock-02', transactionTimestamp: new Date(Date.now() - 2*24*60*60*1000).toISOString(), narration: 'IMPS/CR/CLIENT-INVOICE-REPLICA', amount: '12000.00', type: 'CREDIT' },
                        { txnId: 'txn-mock-03', transactionTimestamp: new Date(Date.now() - 5*24*60*60*1000).toISOString(), narration: 'Salary Payout Credit', amount: '45000.00', type: 'CREDIT' }
                      ]
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  }

  // 4. DELETE /consents/:id -> Revoke mock consent
  if (config.url.startsWith('/consents/') && config.method === 'delete') {
    return {
      data: { message: 'Consent revoked successfully' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  }

  return {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  };
}

if (isPlaceholder) {
  setuClient.defaults.adapter = mockAdapter;
}

module.exports = setuClient;
