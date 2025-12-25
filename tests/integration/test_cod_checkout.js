const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const PaymentTransaction = require('../../src/models/PaymentTransaction');

describe('Cash on Delivery Checkout Integration Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await PaymentTransaction.deleteMany({});
  });

  it('should create order with cash on delivery payment', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const cart = await Cart.create({
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

    // Create checkout session
    const checkoutResponse = await request(app)
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

    const checkoutSessionId = checkoutResponse.body.checkoutSessionId;

    // Confirm checkout
    const confirmResponse = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Cookie', `sessionId=test-session`)
      .send({
        checkoutSessionId,
        paymentMethod: 'cash_on_delivery',
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
      })
      .expect(200);

    expect(confirmResponse.body.paymentMethod).toBe('cash_on_delivery');
    expect(confirmResponse.body.paymentStatus).toBe('pending');
    expect(confirmResponse.body.orderStatus).toBe('pending');
    expect(confirmResponse.body.items).toHaveLength(1);
    expect(confirmResponse.body.total).toBeGreaterThan(0);
  });
});

