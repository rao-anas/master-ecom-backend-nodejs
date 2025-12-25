const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('GET /api/v1/cart - Contract Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  it('should return 200 with cart contents for guest user', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const cart = await Cart.create({
      sessionId: 'test-session-id',
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
      .get('/api/v1/cart')
      .set('Cookie', `sessionId=test-session-id`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('total', 21.98);
    expect(response.body.items).toHaveLength(1);
  });

  it('should return 200 with empty cart if no cart exists', async () => {
    const response = await request(app)
      .get('/api/v1/cart')
      .set('Cookie', `sessionId=new-session-id`)
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body.items).toHaveLength(0);
    expect(response.body.total).toBe(0);
  });

  it('should return cart with correct structure', async () => {
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
      .get('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
    expect(Array.isArray(response.body.items)).toBe(true);
  });
});

