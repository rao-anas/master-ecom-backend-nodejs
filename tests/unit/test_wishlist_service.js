const WishlistService = require('../../src/services/WishlistService');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const Cart = require('../../src/models/Cart');
const mongoose = require('mongoose');

describe('WishlistService Unit Tests', () => {
  let user;
  let product1;
  let product2;
  let product3;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Cart.deleteMany({});

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

    product3 = await Product.create({
      name: 'Product 3',
      description: 'Test',
      price: 29.99,
      category: 'Books',
      stock: 0, // Out of stock
      images: ['https://example.com/img3.jpg'],
    });
  });

  describe('getWishlists', () => {
    it('should return all wishlists for authenticated user', async () => {
      await Wishlist.create({
        userId: user._id,
        name: 'Wishlist 1',
        productIds: [product1._id],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      await Wishlist.create({
        userId: user._id,
        name: 'Wishlist 2',
        productIds: [product2._id],
        isDefault: false,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const wishlists = await WishlistService.getWishlists(user._id, null);
      expect(Array.isArray(wishlists)).toBe(true);
      expect(wishlists.length).toBe(2);
    });

    it('should return single wishlist for guest user', async () => {
      await Wishlist.create({
        sessionId: 'guest-session-123',
        name: 'My Wishlist',
        productIds: [product1._id],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const wishlist = await WishlistService.getWishlists(null, 'guest-session-123');
      expect(wishlist).toHaveProperty('_id');
      expect(wishlist.name).toBe('My Wishlist');
    });

    it('should create wishlist automatically for guest if none exists', async () => {
      const wishlist = await WishlistService.getWishlists(null, 'new-guest-session');
      expect(wishlist).toHaveProperty('_id');
      expect(wishlist.name).toBe('My Wishlist');
      expect(wishlist.productIds.length).toBe(0);
    });

    it('should return specific wishlist by ID', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'My Wishlist',
        productIds: [product1._id],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const result = await WishlistService.getWishlists(user._id, null, wishlist._id);
      expect(result._id.toString()).toBe(wishlist._id.toString());
    });

    it('should throw error if wishlist not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        WishlistService.getWishlists(user._id, null, fakeId)
      ).rejects.toThrow('not found');
    });
  });

  describe('createWishlist', () => {
    it('should create new wishlist for authenticated user', async () => {
      const wishlist = await WishlistService.createWishlist(user._id, 'Gift Ideas');
      expect(wishlist.name).toBe('Gift Ideas');
      expect(wishlist.isDefault).toBe(true); // First wishlist is default
      expect(wishlist.userId.toString()).toBe(user._id.toString());
    });

    it('should set second wishlist as non-default', async () => {
      await WishlistService.createWishlist(user._id, 'First Wishlist');
      const secondWishlist = await WishlistService.createWishlist(user._id, 'Second Wishlist');
      expect(secondWishlist.isDefault).toBe(false);
    });

    it('should throw error for duplicate wishlist name', async () => {
      await WishlistService.createWishlist(user._id, 'Gift Ideas');
      await expect(
        WishlistService.createWishlist(user._id, 'Gift Ideas')
      ).rejects.toThrow('already exists');
    });

    it('should throw error if userId not provided', async () => {
      await expect(
        WishlistService.createWishlist(null, 'Gift Ideas')
      ).rejects.toThrow('User ID is required');
    });
  });

  describe('addProduct', () => {
    it('should add product to default wishlist', async () => {
      const wishlist = await WishlistService.addProduct(user._id, null, product1._id);
      expect(wishlist.productIds.length).toBe(1);
      // Handle both ObjectId and populated object formats
      const productId = typeof wishlist.productIds[0] === 'object' && wishlist.productIds[0]._id 
        ? wishlist.productIds[0]._id.toString() 
        : wishlist.productIds[0].toString();
      expect(productId).toBe(product1._id.toString());
      expect(wishlist.isDefault).toBe(true);
    });

    it('should add product to specific wishlist', async () => {
      const existingWishlist = await Wishlist.create({
        userId: user._id,
        name: 'Gift Ideas',
        productIds: [],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const wishlist = await WishlistService.addProduct(
        user._id,
        null,
        product1._id,
        existingWishlist._id
      );

      expect(wishlist._id.toString()).toBe(existingWishlist._id.toString());
      expect(wishlist.productIds.length).toBe(1);
    });

    it('should not add duplicate product', async () => {
      await WishlistService.addProduct(user._id, null, product1._id);
      const wishlist = await WishlistService.addProduct(user._id, null, product1._id);
      expect(wishlist.productIds.length).toBe(1);
    });

    it('should throw error if product not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        WishlistService.addProduct(user._id, null, fakeId)
      ).rejects.toThrow('Product not found');
    });

    it('should throw error if wishlist reaches 50 product limit', async () => {
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

      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'Full Wishlist',
        productIds,
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const newProduct = await Product.create({
        name: 'New Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      await expect(
        WishlistService.addProduct(user._id, null, newProduct._id, wishlist._id)
      ).rejects.toThrow('50 products');
    });
  });

  describe('removeProduct', () => {
    it('should remove product from wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'My Wishlist',
        productIds: [product1._id, product2._id],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const updatedWishlist = await WishlistService.removeProduct(
        user._id,
        null,
        wishlist._id,
        product1._id
      );

      expect(updatedWishlist.productIds.length).toBe(1);
      expect(updatedWishlist.productIds[0].toString()).toBe(product2._id.toString());
    });

    it('should throw error if wishlist not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        WishlistService.removeProduct(user._id, null, fakeId, product1._id)
      ).rejects.toThrow('not found');
    });

    it('should throw error if not authorized', async () => {
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

      await expect(
        WishlistService.removeProduct(user._id, null, wishlist._id, product1._id)
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('shareWishlist', () => {
    it('should generate share token for wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'My Wishlist',
        productIds: [product1._id],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const result = await WishlistService.shareWishlist(user._id, wishlist._id);
      expect(result).toHaveProperty('shareToken');
      expect(result).toHaveProperty('shareUrl');
      expect(result.shareToken).toBeDefined();

      // Verify wishlist was updated
      const updatedWishlist = await Wishlist.findById(wishlist._id);
      expect(updatedWishlist.isShared).toBe(true);
      expect(updatedWishlist.shareToken).toBe(result.shareToken);
    });

    it('should throw error if not authorized', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'Password123',
        firstName: 'Other',
        lastName: 'User',
      });

      const wishlist = await Wishlist.create({
        userId: otherUser._id,
        name: 'Other Wishlist',
        productIds: [],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      await expect(
        WishlistService.shareWishlist(user._id, wishlist._id)
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('viewSharedWishlist', () => {
    it('should return shared wishlist by token', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'Shared Wishlist',
        productIds: [product1._id, product2._id],
        isDefault: true,
        isShared: true,
        shareToken: 'test-share-token-123',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const result = await WishlistService.viewSharedWishlist('test-share-token-123');
      expect(result._id.toString()).toBe(wishlist._id.toString());
      expect(result.productIds.length).toBe(2);
    });

    it('should throw error for invalid token', async () => {
      await expect(
        WishlistService.viewSharedWishlist('invalid-token')
      ).rejects.toThrow('not found');
    });
  });

  describe('addToCart', () => {
    it('should add all wishlist items to cart', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'My Wishlist',
        productIds: [product1._id, product2._id],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const result = await WishlistService.addToCart(user._id, null, wishlist._id);
      expect(result.itemsAdded).toBe(2);
      expect(result.itemsSkipped).toBe(0);
      expect(result.cart).toBeDefined();
    });

    it('should skip out of stock products', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'My Wishlist',
        productIds: [product1._id, product3._id], // product3 is out of stock
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const result = await WishlistService.addToCart(user._id, null, wishlist._id);
      expect(result.itemsAdded).toBe(1);
      expect(result.itemsSkipped).toBe(1);
    });

    it('should add only specified products to cart', async () => {
      const wishlist = await Wishlist.create({
        userId: user._id,
        name: 'My Wishlist',
        productIds: [product1._id, product2._id],
        isDefault: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const result = await WishlistService.addToCart(
        user._id,
        null,
        wishlist._id,
        [product1._id.toString()]
      );
      expect(result.itemsAdded).toBe(1);
      expect(result.cart.items.length).toBe(1);
    });
  });
});

