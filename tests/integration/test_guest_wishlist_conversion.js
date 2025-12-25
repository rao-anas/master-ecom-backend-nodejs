const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Guest Wishlist Conversion Integration Tests', () => {
  let product1;
  let product2;
  let product3;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    product1 = await Product.create({
      name: 'Product 1',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img1.jpg'],
    });

    product2 = await Product.create({
      name: 'Product 2',
      description: 'Test',
      price: 19.99,
      category: 'Clothing',
      stock: 50,
      images: ['https://example.com/img2.jpg'],
    });

    product3 = await Product.create({
      name: 'Product 3',
      description: 'Test',
      price: 29.99,
      category: 'Books',
      stock: 30,
      images: ['https://example.com/img3.jpg'],
    });
  });

  it('should convert guest wishlist to user wishlist on registration', async () => {
    // Create guest wishlist
    await Wishlist.create({
      sessionId: 'guest-session-123',
      name: 'My Wishlist',
      productIds: [product1._id, product2._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Register user with session cookie
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', `sessionId=guest-session-123`)
      .send({
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(201);

    expect(registerResponse.body).toHaveProperty('wishlistConverted', true);

    const token = registerResponse.body.token;
    const userId = registerResponse.body.user._id;

    // Verify wishlist was converted
    const wishlists = await Wishlist.find({ userId });
    expect(wishlists.length).toBe(1);
    expect(wishlists[0].productIds.length).toBe(2);
    expect(wishlists[0].isDefault).toBe(true);
    expect(wishlists[0].sessionId).toBeUndefined();

    // Verify guest wishlist no longer exists
    const guestWishlist = await Wishlist.findOne({ sessionId: 'guest-session-123' });
    expect(guestWishlist).toBeNull();
  });

  it('should merge guest wishlist into existing user wishlist on login', async () => {
    // Create user
    const user = await User.create({
      email: 'existing@example.com',
      password: 'Password123',
      firstName: 'Existing',
      lastName: 'User',
    });

    // Create user wishlist with some products
    await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Create guest wishlist with different products
    await Wishlist.create({
      sessionId: 'guest-session-456',
      name: 'My Wishlist',
      productIds: [product2._id, product3._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Login with session cookie
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', `sessionId=guest-session-456`)
      .send({
        email: 'existing@example.com',
        password: 'Password123',
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('wishlistConverted', true);

    // Verify wishlist was merged
    const wishlists = await Wishlist.find({ userId: user._id });
    expect(wishlists.length).toBe(1);
    // Should have all 3 products (merged)
    expect(wishlists[0].productIds.length).toBe(3);

    // Verify guest wishlist no longer exists
    const guestWishlist = await Wishlist.findOne({ sessionId: 'guest-session-456' });
    expect(guestWishlist).toBeNull();
  });

  it('should handle duplicate products when merging guest wishlist', async () => {
    // Create user
    const user = await User.create({
      email: 'user@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    // Create user wishlist with product1
    await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Create guest wishlist with product1 (duplicate) and product2
    await Wishlist.create({
      sessionId: 'guest-session-789',
      name: 'My Wishlist',
      productIds: [product1._id, product2._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Login
    await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', `sessionId=guest-session-789`)
      .send({
        email: 'user@example.com',
        password: 'Password123',
      })
      .expect(200);

    // Verify duplicates were removed (should have only 2 unique products)
    const wishlists = await Wishlist.find({ userId: user._id });
    expect(wishlists.length).toBe(1);
    expect(wishlists[0].productIds.length).toBe(2);
  });

  it('should respect 50-item limit when merging guest wishlist', async () => {
    // Create user
    const user = await User.create({
      email: 'user@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    // Create user wishlist with 49 products
    const existingProducts = [];
    for (let i = 0; i < 49; i++) {
      const p = await Product.create({
        name: `Product ${i}`,
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });
      existingProducts.push(p._id);
    }

    await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: existingProducts,
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Create guest wishlist with 5 products
    const guestProducts = [];
    for (let i = 0; i < 5; i++) {
      const p = await Product.create({
        name: `Guest Product ${i}`,
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });
      guestProducts.push(p._id);
    }

    await Wishlist.create({
      sessionId: 'guest-session-limit',
      name: 'My Wishlist',
      productIds: guestProducts,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Login
    await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', `sessionId=guest-session-limit`)
      .send({
        email: 'user@example.com',
        password: 'Password123',
      })
      .expect(200);

    // Verify wishlist has exactly 50 products (49 + 1 from guest)
    const wishlists = await Wishlist.find({ userId: user._id });
    expect(wishlists.length).toBeGreaterThanOrEqual(1);
    const defaultWishlist = wishlists.find(w => w.isDefault);
    expect(defaultWishlist.productIds.length).toBe(50);
  });

  it('should handle empty guest wishlist gracefully', async () => {
    // Register user with empty guest wishlist (no wishlist created)
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', `sessionId=empty-guest-session`)
      .send({
        email: 'newuser2@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(201);

    // Should still succeed (no wishlist to convert)
    expect(registerResponse.body).toHaveProperty('wishlistConverted', false);
  });
});






