const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const Cart = require('../../src/models/Cart');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('POST /api/v1/wishlists/:wishlistId/add-to-cart - Contract Tests', () => {
  let user;
  let token;
  let product1;
  let product2;
  let product3;
  let wishlist;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Cart.deleteMany({});

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
      stock: 0, // Out of stock
      images: ['https://example.com/img3.jpg'],
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

    wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id, product2._id, product3._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });
  });

  it('should return 200 and add all wishlist items to cart', async () => {
    const response = await request(app)
      .post(`/api/v1/wishlists/${wishlist._id}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(response.body).toHaveProperty('cart');
    expect(response.body).toHaveProperty('itemsAdded');
    expect(response.body).toHaveProperty('itemsSkipped');
    // product3 is out of stock, so should be skipped
    expect(response.body.itemsAdded).toBe(2);
    expect(response.body.itemsSkipped).toBe(1);
    expect(response.body.cart.items.length).toBe(2);
  });

  it('should return 200 and add specific products to cart', async () => {
    const response = await request(app)
      .post(`/api/v1/wishlists/${wishlist._id}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productIds: [product1._id.toString()],
      })
      .expect(200);

    expect(response.body.itemsAdded).toBe(1);
    expect(response.body.itemsSkipped).toBe(0);
    expect(response.body.cart.items.length).toBe(1);
    // Handle both ObjectId and populated object formats
    const productId = typeof response.body.cart.items[0].productId === 'object' && response.body.cart.items[0].productId._id 
      ? response.body.cart.items[0].productId._id.toString() 
      : response.body.cart.items[0].productId.toString();
    expect(productId).toBe(product1._id.toString());
  });

  it('should return 200 and add items to guest cart', async () => {
    const guestWishlist = await Wishlist.create({
      sessionId: 'guest-session-123',
      name: 'My Wishlist',
      productIds: [product1._id, product2._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post(`/api/v1/wishlists/${guestWishlist._id}/add-to-cart`)
      .set('Cookie', `sessionId=guest-session-123`)
      .send({})
      .expect(200);

    expect(response.body.itemsAdded).toBe(2);
    expect(response.body.cart.items.length).toBe(2);
  });

  it('should return 404 for non-existent wishlist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post(`/api/v1/wishlists/${fakeId}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 for accessing another user\'s private wishlist', async () => {
    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'Password123',
      firstName: 'Other',
      lastName: 'User',
    });

    const otherWishlist = await Wishlist.create({
      userId: otherUser._id,
      name: 'Other Wishlist',
      productIds: [product1._id],
      isDefault: true,
      isShared: false,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post(`/api/v1/wishlists/${otherWishlist._id}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 200 for accessing shared wishlist', async () => {
    const sharedWishlist = await Wishlist.create({
      userId: user._id,
      name: 'Shared Wishlist',
      productIds: [product1._id, product2._id],
      isDefault: false,
      isShared: true,
      shareToken: 'test-share-token',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Another user can add shared wishlist to cart
    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'Password123',
      firstName: 'Other',
      lastName: 'User',
    });

    const otherToken = jwt.sign(
      { userId: otherUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .post(`/api/v1/wishlists/${sharedWishlist._id}/add-to-cart`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({})
      .expect(200);

    expect(response.body.itemsAdded).toBe(2);
  });

  it('should return 400 for invalid productIds array', async () => {
    const response = await request(app)
      .post(`/api/v1/wishlists/${wishlist._id}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productIds: 'not-an-array',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for empty wishlist', async () => {
    const emptyWishlist = await Wishlist.create({
      userId: user._id,
      name: 'Empty Wishlist',
      productIds: [],
      isDefault: false,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .post(`/api/v1/wishlists/${emptyWishlist._id}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('No products');
  });
});

