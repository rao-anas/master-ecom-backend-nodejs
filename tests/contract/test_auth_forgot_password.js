const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('POST /api/v1/auth/forgot-password - Contract Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should return 200 for valid email', async () => {
    await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'test@example.com',
      })
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('password reset');
  });

  it('should return 200 even for non-existent email (security)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'nonexistent@example.com',
      })
      .expect(200);

    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'invalid-email',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

