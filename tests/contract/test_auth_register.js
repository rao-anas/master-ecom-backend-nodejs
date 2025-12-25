const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Cart = require('../../src/models/Cart');
const Order = require('../../src/models/Order');

describe('POST /api/v1/auth/register - Contract Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
  });

  it('should return 201 and create new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.user.firstName).toBe('New');
    expect(response.body.user.lastName).toBe('User');
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body).toHaveProperty('token');
  });

  it('should return 400 for duplicate email', async () => {
    await User.create({
      email: 'existing@example.com',
      password: 'Password123',
      firstName: 'Existing',
      lastName: 'User',
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for weak password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

