module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js', '**/tests/integration/**/*.js', '**/tests/unit/**/*.js', '**/tests/contract/**/*.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/logger.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};

