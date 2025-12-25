const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('PUT /api/v1/cart - Contract Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  it('should return 200 and update item quantity in cart', async () => {
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

    const response = await request(app)
      .put('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .send({
        productId: product._id.toString(),
        quantity: 3,
      })
      .expect(200);

    expect(response.body.items[0].quantity).toBe(3);
    expect(response.body.total).toBe(32.97);
  });

  it('should return 200 and remove item when quantity is 0', async () => {
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

    const response = await request(app)
      .put('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .send({
        productId: product._id.toString(),
        quantity: 0,
      })
      .expect(200);

    expect(response.body.items).toHaveLength(0);
    expect(response.body.total).toBe(0);
  });

  it('should return 404 when product not in cart', async () => {
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
      items: [],
      total: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .put('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .send({
        productId: product._id.toString(),
        quantity: 2,
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

