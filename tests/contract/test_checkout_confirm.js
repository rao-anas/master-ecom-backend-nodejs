const request = require('supertest');
const app = require('../../src/app');
const Order = require('../../src/models/Order');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');
const PaymentTransaction = require('../../src/models/PaymentTransaction');

describe('POST /api/v1/checkout/confirm - Contract Tests', () => {
  beforeEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await PaymentTransaction.deleteMany({});
  });

  it('should return 200 and create order for cash on delivery', async () => {
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
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
      ],
      total: 10.99,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Mock checkout session creation (would normally be done in checkout create endpoint)
    const checkoutSessionId = 'checkout_1234567890_abc123';

    const response = await request(app)
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

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('orderNumber');
    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('total');
    expect(response.body.paymentMethod).toBe('cash_on_delivery');
    expect(response.body.paymentStatus).toBe('pending');
    expect(response.body.orderStatus).toBe('pending');
  });

  it('should return 400 for invalid checkoutSessionId', async () => {
    const response = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Cookie', `sessionId=test-session`)
      .send({
        checkoutSessionId: 'invalid',
        paymentMethod: 'cash_on_delivery',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing checkoutSessionId', async () => {
    const response = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Cookie', `sessionId=test-session`)
      .send({
        paymentMethod: 'cash_on_delivery',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

