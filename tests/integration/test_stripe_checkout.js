const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const PaymentTransaction = require('../../src/models/PaymentTransaction');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          client_secret: 'pi_test_123_secret_xyz',
          status: 'requires_payment_method',
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          status: 'succeeded',
        }),
      },
    };
  });
});

describe('Stripe Checkout Integration Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await PaymentTransaction.deleteMany({});
  });

  it('should create Stripe payment intent for checkout', async () => {
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
        paymentMethod: 'stripe',
      })
      .expect(200);

    expect(response.body).toHaveProperty('checkoutSessionId');
    expect(response.body).toHaveProperty('clientSecret');
    expect(response.body.clientSecret).toMatch(/^pi_test_\d+_secret_/);
  });
});

