/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js'],
  clearMocks: true,
  restoreMocks: true,
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
};

module.exports = config;
