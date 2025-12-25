const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('POST /api/v1/cart - Contract Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  it('should return 200 and add item to cart for guest user', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const response = await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session-id`)
      .send({
        productId: product._id.toString(),
        quantity: 2,
      })
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(2);
    expect(response.body.total).toBe(21.98);
  });

  it('should return 400 for invalid productId', async () => {
    const response = await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session-id`)
      .send({
        productId: 'invalid-id',
        quantity: 1,
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing quantity', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const response = await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session-id`)
      .send({
        productId: product._id.toString(),
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent product', async () => {
    const mongoose = require('mongoose');
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session-id`)
      .send({
        productId: fakeId.toString(),
        quantity: 1,
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when product is out of stock', async () => {
    const product = await Product.create({
      name: 'Out of Stock Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 0,
      images: ['https://example.com/img.jpg'],
    });

    const response = await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session-id`)
      .send({
        productId: product._id.toString(),
        quantity: 1,
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

