const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('GET /api/v1/users/me - Contract Tests', () => {
  let user;
  let token;

  beforeEach(async () => {
    await User.deleteMany({});

    user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('should return 200 with user profile for authenticated user', async () => {
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('email', 'test@example.com');
    expect(response.body).toHaveProperty('firstName', 'Test');
    expect(response.body).toHaveProperty('lastName', 'User');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordResetToken');
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/v1/users/me')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

