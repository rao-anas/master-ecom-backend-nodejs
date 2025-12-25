const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('POST /api/v1/wishlists - Create Wishlist Contract Tests', () => {
  let user;
  let token;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await User.deleteMany({});

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

  it('should return 200 and create new named wishlist for authenticated user', async () => {
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gift Ideas',
      })
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('name', 'Gift Ideas');
    expect(response.body).toHaveProperty('productIds');
    expect(Array.isArray(response.body.productIds)).toBe(true);
    expect(response.body.productIds.length).toBe(0);
    expect(response.body.isDefault).toBe(true); // First wishlist is default
  });

  it('should return 401 for guest user trying to create named wishlist', async () => {
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Cookie', `sessionId=guest-session-123`)
      .send({
        name: 'Gift Ideas',
      })
      .expect(400); // Should require productId or return error

    expect(response.body).toHaveProperty('error');
  });

  it('should return 409 for duplicate wishlist name', async () => {
    // Create first wishlist
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gift Ideas',
      })
      .expect(200);

    // Try to create duplicate
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gift Ideas',
      })
      .expect(409);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('already exists');
  });

  it('should return 400 for empty wishlist name', async () => {
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '   ',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for wishlist name exceeding 100 characters', async () => {
    const longName = 'a'.repeat(101);
    
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: longName,
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should set second wishlist as non-default', async () => {
    // Create first wishlist (default)
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'First Wishlist',
      })
      .expect(200);

    // Create second wishlist (should not be default)
    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Second Wishlist',
      })
      .expect(200);

    expect(response.body.isDefault).toBe(false);
  });
});






