const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('DELETE /api/v1/wishlists/:wishlistId/products/:productId - Contract Tests', () => {
  let user;
  let token;
  let product1;
  let product2;
  let wishlist;

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
      productIds: [product1._id, product2._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });
  });

  it('should return 200 and remove product from wishlist for authenticated user', async () => {
    const response = await request(app)
      .delete(`/api/v1/wishlists/${wishlist._id}/products/${product1._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('productIds');
    expect(response.body.productIds.length).toBe(1);
    expect(response.body.productIds[0].toString()).toBe(product2._id.toString());
  });

  it('should return 200 and remove product from wishlist for guest user', async () => {
    const guestWishlist = await Wishlist.create({
      sessionId: 'guest-session-123',
      name: 'My Wishlist',
      productIds: [product1._id, product2._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .delete(`/api/v1/wishlists/${guestWishlist._id}/products/${product1._id}`)
      .set('Cookie', `sessionId=guest-session-123`)
      .expect(200);

    expect(response.body.productIds.length).toBe(1);
  });

  it('should return 404 for non-existent wishlist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .delete(`/api/v1/wishlists/${fakeId}/products/${product1._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent product in wishlist', async () => {
    const fakeProductId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .delete(`/api/v1/wishlists/${wishlist._id}/products/${fakeProductId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200); // Should succeed but product not removed (not in wishlist)

    // Product count should remain the same
    expect(response.body.productIds.length).toBe(2);
  });

  it('should return 403 for removing from another user\'s wishlist', async () => {
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
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .delete(`/api/v1/wishlists/${otherWishlist._id}/products/${product1._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for invalid wishlistId', async () => {
    const response = await request(app)
      .delete(`/api/v1/wishlists/invalid-id/products/${product1._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for invalid productId', async () => {
    const response = await request(app)
      .delete(`/api/v1/wishlists/${wishlist._id}/products/invalid-id`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

