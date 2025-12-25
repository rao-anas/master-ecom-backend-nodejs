const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const jwt = require('jsonwebtoken');

describe('GET /api/v1/users/me/orders - Contract Tests', () => {
  let user;
  let token;

  beforeEach(async () => {
    await User.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});

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

  it('should return 200 with user orders', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    await Order.create({
      customerId: user._id,
      customerEmail: user.email,
      items: [
        {
          productId: product._id,
          productName: product.name,
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'Country',
      },
      billingAddress: {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'Country',
      },
      paymentMethod: 'stripe',
      subtotal: 10.99,
      shippingCost: 5.99,
      total: 16.98,
    });

    const response = await request(app)
      .get('/api/v1/users/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('orders');
    expect(Array.isArray(response.body.orders)).toBe(true);
    expect(response.body.orders.length).toBeGreaterThan(0);
    expect(response.body.orders[0]).toHaveProperty('orderNumber');
    expect(response.body.orders[0]).toHaveProperty('total');
  });

  it('should return 200 with empty array if no orders', async () => {
    const response = await request(app)
      .get('/api/v1/users/me/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('orders');
    expect(response.body.orders).toHaveLength(0);
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/v1/users/me/orders')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should support pagination', async () => {
    const response = await request(app)
      .get('/api/v1/users/me/orders?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('orders');
    expect(response.body).toHaveProperty('pagination');
  });
});

