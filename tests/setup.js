const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ecommerce-test';
process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/ecommerce-test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long-for-testing';
process.env.PORT = '3000';
process.env.FRONTEND_URL = 'http://localhost:3001';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';

let mongoServer;

beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Override MONGODB_URI for tests
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_TEST_URI = mongoUri;
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Close connection and stop server
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clean up collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

