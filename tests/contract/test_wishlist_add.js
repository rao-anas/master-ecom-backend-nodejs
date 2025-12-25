const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('POST /api/v1/wishlists - Add Product Contract Tests', () => {
  let user;
  let token;
  let product;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('should return 200 and add product to wishlist for authenticated user', async () => {
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product._id.toString(),
      })
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('name', 'My Wishlist');
    expect(response.body).toHaveProperty('productIds');
    expect(response.body.productIds.length).toBe(1);
    expect(response.body.isDefault).toBe(true);
  });

  it('should return 200 and add product to wishlist for guest user', async () => {
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Cookie', `sessionId=guest-session-123`)
      .send({
        productId: product._id.toString(),
      })
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('name', 'My Wishlist');
    expect(response.body).toHaveProperty('productIds');
    expect(response.body.productIds.length).toBe(1);
  });

  it('should return 200 and not add duplicate product', async () => {
    // Add product first time
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product._id.toString(),
      })
      .expect(200);

    // Try to add same product again
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product._id.toString(),
      })
      .expect(200);

    // Should still have only 1 product (duplicate prevented)
    expect(response.body.productIds.length).toBe(1);
  });

  it('should return 400 for invalid productId', async () => {
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: 'invalid-id',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent product', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: fakeId.toString(),
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when wishlist reaches 50 product limit', async () => {
    // Create wishlist with 50 products
    const productIds = [];
    for (let i = 0; i < 50; i++) {
      const p = await Product.create({
        name: `Product ${i}`,
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });
      productIds.push(p._id);
    }

    await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds,
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Try to add 51st product
    const newProduct = await Product.create({
      name: 'New Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: newProduct._id.toString(),
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('50 products');
  });
});

