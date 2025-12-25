const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('POST /api/v1/checkout - Contract Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  it('should return 200 and create checkout session for guest user', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product._id,
          quantity: 2,
          unitPrice: 10.99,
          subtotal: 21.98,
        },
      ],
      total: 21.98,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
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
      })
      .expect(200);

    expect(response.body).toHaveProperty('checkoutSessionId');
    if (response.body.paymentMethod === 'stripe') {
      expect(response.body).toHaveProperty('clientSecret');
    }
  });

  it('should return 200 for cash on delivery payment method', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product._id,
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
      ],
      total: 10.99,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
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
        paymentMethod: 'cash_on_delivery',
      })
      .expect(200);

    expect(response.body).toHaveProperty('checkoutSessionId');
    expect(response.body.paymentMethod).toBe('cash_on_delivery');
  });

  it('should return 400 for empty cart', async () => {
    await Cart.create({
      sessionId: 'test-session',
      items: [],
      total: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for invalid payment method', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product._id,
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
      ],
      total: 10.99,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'invalid',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing shipping address', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product._id,
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
      ],
      total: 10.99,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
        paymentMethod: 'stripe',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

