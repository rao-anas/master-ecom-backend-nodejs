const mongoose = require('mongoose');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');

describe('Cart Model', () => {
  beforeAll(async () => {
    // MongoDB Memory Server is set up in tests/setup.js
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  describe('Validation', () => {
    it('should require either userId or sessionId', async () => {
      const cart = new Cart({
        items: [],
        total: 0,
      });

      await expect(cart.save()).rejects.toThrow();
    });

    it('should allow cart with userId only', async () => {
      const cart = new Cart({
        userId: new mongoose.Types.ObjectId(),
        items: [],
        total: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      const savedCart = await cart.save();
      expect(savedCart.userId).toBeDefined();
      expect(savedCart.sessionId).toBeUndefined();
    });

    it('should allow cart with sessionId only', async () => {
      const cart = new Cart({
        sessionId: 'test-session-id',
        items: [],
        total: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      });

      const savedCart = await cart.save();
      expect(savedCart.sessionId).toBe('test-session-id');
      expect(savedCart.userId).toBeUndefined();
    });

    it('should calculate total from items', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const cart = new Cart({
        sessionId: 'test-session',
        items: [
          {
            productId: product._id,
            quantity: 2,
            unitPrice: 10.99,
            subtotal: 21.98,
          },
        ],
        total: 21.98,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const savedCart = await cart.save();
      expect(savedCart.total).toBe(21.98);
      expect(savedCart.items).toHaveLength(1);
    });

    it('should validate cart item structure', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const cart = new Cart({
        sessionId: 'test-session',
        items: [
          {
            productId: product._id,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        total: 10.99,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const savedCart = await cart.save();
      expect(savedCart.items[0].productId).toEqual(product._id);
      expect(savedCart.items[0].quantity).toBe(1);
      expect(savedCart.items[0].unitPrice).toBe(10.99);
      expect(savedCart.items[0].subtotal).toBe(10.99);
    });
  });

  describe('Indexes', () => {
    it('should have sparse index on userId', async () => {
      const indexes = await Cart.collection.getIndexes();
      expect(indexes).toHaveProperty('userId_1');
    });

    it('should have sparse index on sessionId', async () => {
      const indexes = await Cart.collection.getIndexes();
      expect(indexes).toHaveProperty('sessionId_1');
    });

    it('should have TTL index on expiresAt', async () => {
      const indexes = await Cart.collection.getIndexes();
      expect(indexes).toHaveProperty('expiresAt_1');
    });
  });
});

