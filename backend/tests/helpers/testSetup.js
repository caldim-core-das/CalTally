const { sequelize } = require('../../models');

beforeAll(async () => {
  // Sync the database before running tests
  // We use force: true to ensure a clean slate in test DB
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync({ force: true });
  }
});

afterAll(async () => {
  // Close database connection after all tests
  await sequelize.close();
});

// Helper function to create a test user and get auth token
global.getAuthToken = async (app) => {
  const request = require('supertest');
  
  // Register user
  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    });

  // Login
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password: 'Password123!',
    });

  return res.body.token;
};

// Expose supertest request helper globally for tests
global.request = require('supertest');
