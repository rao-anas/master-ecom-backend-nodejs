const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('Guest Cart Integration Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  it('should create cart automatically for new guest session', async () => {
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
      .set('Cookie', `sessionId=new-guest-session`)
      .send({
        productId: product._id.toString(),
        quantity: 1,
      })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    
    // Verify cart persists
    const getResponse = await request(app)
      .get('/api/v1/cart')
      .set('Cookie', `sessionId=new-guest-session`)
      .expect(200);

    expect(getResponse.body.items).toHaveLength(1);
  });

  it('should maintain separate carts for different guest sessions', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    // Add to cart for session 1
    await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=session-1`)
      .send({
        productId: product._id.toString(),
        quantity: 2,
      })
      .expect(200);

    // Add to cart for session 2
    await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=session-2`)
      .send({
        productId: product._id.toString(),
        quantity: 3,
      })
      .expect(200);

    // Verify separate carts
    const cart1 = await request(app)
      .get('/api/v1/cart')
      .set('Cookie', `sessionId=session-1`)
      .expect(200);

    const cart2 = await request(app)
      .get('/api/v1/cart')
      .set('Cookie', `sessionId=session-2`)
      .expect(200);

    expect(cart1.body.items[0].quantity).toBe(2);
    expect(cart2.body.items[0].quantity).toBe(3);
  });

  it('should update existing item quantity when adding same product', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    // Add product first time
    await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .send({
        productId: product._id.toString(),
        quantity: 1,
      })
      .expect(200);

    // Add same product again
    const response = await request(app)
      .post('/api/v1/cart')
      .set('Cookie', `sessionId=test-session`)
      .send({
        productId: product._id.toString(),
        quantity: 2,
      })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3); // 1 + 2
  });
});

