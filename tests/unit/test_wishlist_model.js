const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');

describe('Wishlist Model Unit Tests', () => {
  let user;
  let product1;
  let product2;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

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
  });

  it('should create wishlist with userId', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.userId.toString()).toBe(user._id.toString());
    expect(wishlist.name).toBe('My Wishlist');
    expect(wishlist.productIds.length).toBe(1);
    expect(wishlist.isDefault).toBe(true);
    expect(wishlist.expiresAt).toBeDefined();
  });

  it('should create wishlist with sessionId for guest', async () => {
    const wishlist = await Wishlist.create({
      sessionId: 'guest-session-123',
      name: 'My Wishlist',
      productIds: [product1._id],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    expect(wishlist.sessionId).toBe('guest-session-123');
    expect(wishlist.userId).toBeUndefined();
    expect(wishlist.name).toBe('My Wishlist');
  });

  it('should fail validation if neither userId nor sessionId provided', async () => {
    await expect(
      Wishlist.create({
        name: 'My Wishlist',
        productIds: [product1._id],
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      })
    ).rejects.toThrow();
  });

  it('should fail validation if both userId and sessionId provided', async () => {
    await expect(
      Wishlist.create({
        userId: user._id,
        sessionId: 'guest-session-123',
        name: 'My Wishlist',
        productIds: [product1._id],
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      })
    ).rejects.toThrow();
  });

  it('should enforce 50 product limit', async () => {
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

    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'Full Wishlist',
      productIds,
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.productIds.length).toBe(50);

    // Try to add 51st product
    const newProduct = await Product.create({
      name: 'New Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    wishlist.productIds.push(newProduct._id);
    await expect(wishlist.save()).rejects.toThrow('50 products');
  });

  it('should remove duplicate productIds automatically', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [product1._id, product1._id, product2._id], // duplicate product1
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.productIds.length).toBe(2);
    const ids = wishlist.productIds.map(id => id.toString());
    expect(ids).toContain(product1._id.toString());
    expect(ids).toContain(product2._id.toString());
  });

  it('should set expiration to 60 days for authenticated users', async () => {
    const beforeCreate = Date.now();
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [],
      isDefault: true,
    });

    const afterCreate = Date.now();
    const expirationTime = wishlist.expiresAt.getTime();
    const expectedMin = beforeCreate + 59 * 24 * 60 * 60 * 1000;
    const expectedMax = afterCreate + 61 * 24 * 60 * 60 * 1000;

    expect(expirationTime).toBeGreaterThanOrEqual(expectedMin);
    expect(expirationTime).toBeLessThanOrEqual(expectedMax);
  });

  it('should set expiration to 24 hours for guest users', async () => {
    const beforeCreate = Date.now();
    const wishlist = await Wishlist.create({
      sessionId: 'guest-session-123',
      name: 'My Wishlist',
      productIds: [],
    });

    const afterCreate = Date.now();
    const expirationTime = wishlist.expiresAt.getTime();
    const expectedMin = beforeCreate + 23 * 60 * 60 * 1000;
    const expectedMax = afterCreate + 25 * 60 * 60 * 1000;

    expect(expirationTime).toBeGreaterThanOrEqual(expectedMin);
    expect(expirationTime).toBeLessThanOrEqual(expectedMax);
  });

  it('should generate shareToken when isShared is true', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [],
      isDefault: true,
      isShared: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.shareToken).toBeDefined();
    expect(typeof wishlist.shareToken).toBe('string');
    expect(wishlist.shareToken.length).toBeGreaterThan(0);
  });

  it('should remove shareToken when isShared is false', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [],
      isDefault: true,
      isShared: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.shareToken).toBeDefined();

    wishlist.isShared = false;
    await wishlist.save();

    expect(wishlist.shareToken).toBeUndefined();
  });

  it('should enforce max length for wishlist name', async () => {
    const longName = 'a'.repeat(101);

    await expect(
      Wishlist.create({
        userId: user._id,
        name: longName,
        productIds: [],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      })
    ).rejects.toThrow('100 characters');
  });

  it('should default name to "My Wishlist"', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      productIds: [],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.name).toBe('My Wishlist');
  });

  it('should default isDefault to false', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [],
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.isDefault).toBe(false);
  });

  it('should default isShared to false', async () => {
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'My Wishlist',
      productIds: [],
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    expect(wishlist.isShared).toBe(false);
  });
});






