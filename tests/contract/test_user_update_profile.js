const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('PUT /api/v1/users/me - Contract Tests', () => {
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

  it('should return 200 and update user profile', async () => {
    const response = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Updated',
        lastName: 'Name',
      })
      .expect(200);

    expect(response.body.firstName).toBe('Updated');
    expect(response.body.lastName).toBe('Name');
    expect(response.body.email).toBe('test@example.com'); // Email unchanged
  });

  it('should return 200 and update shipping addresses', async () => {
    const response = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddresses: [
          {
            street: '123 Main St',
            city: 'City',
            state: 'State',
            zipCode: '12345',
            country: 'Country',
            isDefault: true,
          },
        ],
      })
      .expect(200);

    expect(response.body.shippingAddresses).toHaveLength(1);
    expect(response.body.shippingAddresses[0].street).toBe('123 Main St');
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .put('/api/v1/users/me')
      .send({
        firstName: 'Updated',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for invalid shipping address', async () => {
    const response = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddresses: [
          {
            street: '123 Main St',
            // Missing required fields
          },
        ],
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

