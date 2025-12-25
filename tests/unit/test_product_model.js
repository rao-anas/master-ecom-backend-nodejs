const mongoose = require('mongoose');
const Product = require('../../src/models/Product');

describe('Product Model', () => {
  beforeAll(async () => {
    // MongoDB Memory Server is set up in tests/setup.js
  });

  afterEach(async () => {
    await Product.deleteMany({});
  });

  describe('Validation', () => {
    it('should require name field', async () => {
      const product = new Product({
        description: 'Test description',
        price: 29.99,
        category: 'Electronics',
        stock: 100,
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should require description field', async () => {
      const product = new Product({
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
        stock: 100,
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should require price field', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        category: 'Electronics',
        stock: 100,
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should require category field', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        stock: 100,
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should require stock field', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'Electronics',
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should not allow negative price', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: -10,
        category: 'Electronics',
        stock: 100,
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should not allow negative stock', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'Electronics',
        stock: -10,
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should require at least one image', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'Electronics',
        stock: 100,
        images: [],
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should create a valid product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/image1.jpg'],
        specifications: { color: 'red', size: 'large' },
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name).toBe(productData.name);
      expect(savedProduct.price).toBe(productData.price);
      expect(savedProduct.isAvailable).toBe(true);
      expect(savedProduct.createdAt).toBeDefined();
      expect(savedProduct.updatedAt).toBeDefined();
    });

    it('should set isAvailable to false when stock is 0', async () => {
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'Electronics',
        stock: 0,
        images: ['https://example.com/image1.jpg'],
      });

      const savedProduct = await product.save();
      expect(savedProduct.isAvailable).toBe(false);
    });
  });

  describe('Indexes', () => {
    it('should have text index on name and description fields', async () => {
      const indexes = await Product.collection.getIndexes();
      // Mongoose creates compound text index as "name_text_description_text"
      expect(indexes).toHaveProperty('name_text_description_text');
    });

    it('should have index on category field', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes).toHaveProperty('category_1');
    });

    it('should have index on price field', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes).toHaveProperty('price_1');
    });

    it('should have index on stock field', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes).toHaveProperty('stock_1');
    });

    it('should have index on isAvailable field', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes).toHaveProperty('isAvailable_1');
    });
  });
});

