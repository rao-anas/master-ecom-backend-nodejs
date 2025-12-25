const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Authenticated User Cart Integration Tests', () => {
  let user;
  let token;

  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    // Create test user (plain password - model will hash it)
    user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    // Generate JWT token
    token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('should create cart for authenticated user', async () => {
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
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product._id.toString(),
        quantity: 1,
      })
      .expect(200);

    expect(response.body.items).toHaveLength(1);

    // Verify cart persists for user
    const getResponse = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.items).toHaveLength(1);
  });

  it('should maintain cart across sessions for authenticated user', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    // Add to cart
    await request(app)
      .post('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product._id.toString(),
        quantity: 1,
      })
      .expect(200);

    // Generate new token (simulating new session)
    const newToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Cart should still be accessible
    const response = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
  });
});

