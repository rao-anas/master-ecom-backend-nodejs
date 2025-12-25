const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Cart = require('../../src/models/Cart');
const bcrypt = require('bcryptjs');

describe('POST /api/v1/auth/login - Contract Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Cart.deleteMany({});
  });

  it('should return 200 and login user with valid credentials', async () => {
    // Create user with plain password - model will hash it
    await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body).toHaveProperty('token');
  });

  it('should return 401 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Password123',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 for invalid password', async () => {
    // Create user with plain password - model will hash it
    await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        password: 'Password123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

