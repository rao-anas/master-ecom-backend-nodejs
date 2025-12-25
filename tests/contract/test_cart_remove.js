const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('DELETE /api/v1/cart - Contract Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  it('should return 200 and remove item from cart', async () => {
    const product1 = await Product.create({
      name: 'Product 1',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img1.jpg'],
    });

    const product2 = await Product.create({
      name: 'Product 2',
      description: 'Test',
      price: 20.99,
      category: 'Electronics',
      stock: 50,
      images: ['https://example.com/img2.jpg'],
    });

    const cart = await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product1._id,
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
        {
          productId: product2._id,
          quantity: 1,
          unitPrice: 20.99,
          subtotal: 20.99,
        },
      ],
      total: 31.98,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .delete('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .query({ productId: product1._id.toString() })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].productId.toString()).toBe(product2._id.toString());
    expect(response.body.total).toBe(20.99);
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
      .delete('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .query({ productId: product._id.toString() })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for invalid productId', async () => {
    const response = await request(app)
      .delete('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .query({ productId: 'invalid-id' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

