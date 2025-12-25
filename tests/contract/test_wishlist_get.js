const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('GET /api/v1/wishlists - Contract Tests', () => {
  let user;
  let token;
  let product1;
  let product2;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    // Create test products
    product1 = await Product.create({
      name: 'Product 1',
      description: 'Test product 1',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img1.jpg'],
    });

    product2 = await Product.create({
      name: 'Product 2',
      description: 'Test product 2',
      price: 19.99,
      category: 'Clothing',
      stock: 50,
      images: ['https://example.com/img2.jpg'],
    });

    // Create test user
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

  it('should return 200 and get wishlists for authenticated user', async () => {
    // Create wishlist for user
    await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id, product2._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .get('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0]).toHaveProperty('name', 'My Wishlist');
    expect(response.body[0]).toHaveProperty('productIds');
    expect(response.body[0].productIds.length).toBe(2);
  });

  it('should return 200 and get single wishlist for guest user', async () => {
    // Create guest wishlist
    const guestWishlist = await Wishlist.create({
      sessionId: 'guest-session-123',
      name: 'My Wishlist',
      productIds: [product1._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .get('/api/v1/wishlists')
      .set('Cookie', `sessionId=guest-session-123`)
      .expect(200);

    // Guest gets single wishlist (not array)
    expect(response.body).toHaveProperty('_id');
    expect(response.body._id.toString()).toBe(guestWishlist._id.toString());
    expect(response.body).toHaveProperty('name', 'My Wishlist');
    expect(response.body).toHaveProperty('productIds');
  });

  it('should return 200 and create wishlist automatically for guest if none exists', async () => {
    const response = await request(app)
      .get('/api/v1/wishlists')
      .set('Cookie', `sessionId=new-guest-session`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('name', 'My Wishlist');
    expect(response.body).toHaveProperty('productIds');
    expect(Array.isArray(response.body.productIds)).toBe(true);
    expect(response.body.productIds.length).toBe(0);
  });

  it('should return 200 and get specific wishlist by ID', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .get(`/api/v1/wishlists/${wishlist._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body._id.toString()).toBe(wishlist._id.toString());
    expect(response.body).toHaveProperty('name', 'My Wishlist');
  });

  it('should return 404 for non-existent wishlist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .get(`/api/v1/wishlists/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 for accessing another user\'s wishlist', async () => {
    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'Password123',
      firstName: 'Other',
      lastName: 'User',
    });

    const wishlist = await Wishlist.create({
      userId: otherUser._id,
      name: 'Other Wishlist',
      productIds: [product1._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .get(`/api/v1/wishlists/${wishlist._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

