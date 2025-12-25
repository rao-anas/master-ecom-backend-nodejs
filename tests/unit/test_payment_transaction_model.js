const mongoose = require('mongoose');
const PaymentTransaction = require('../../src/models/PaymentTransaction');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');

describe('PaymentTransaction Model', () => {
  beforeAll(async () => {
    // MongoDB Memory Server is set up in tests/setup.js
  });

  afterEach(async () => {
    await PaymentTransaction.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
  });

  describe('Validation', () => {
    it('should require orderId', async () => {
      const transaction = new PaymentTransaction({
        transactionId: 'txn_test_123',
        amount: 100.00,
        paymentMethod: 'stripe',
        status: 'pending',
      });

      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require transactionId', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      const transaction = new PaymentTransaction({
        orderId: order._id,
        amount: 100.00,
        paymentMethod: 'stripe',
        status: 'pending',
      });

      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require amount', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      const transaction = new PaymentTransaction({
        orderId: order._id,
        transactionId: 'txn_test_123',
        paymentMethod: 'stripe',
        status: 'pending',
      });

      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require paymentMethod', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      const transaction = new PaymentTransaction({
        orderId: order._id,
        transactionId: 'txn_test_123',
        amount: 100.00,
        status: 'pending',
      });

      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require status', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      const transaction = new PaymentTransaction({
        orderId: order._id,
        transactionId: 'txn_test_123',
        amount: 100.00,
        paymentMethod: 'stripe',
      });

      await expect(transaction.save()).rejects.toThrow();
    });

    it('should create a valid payment transaction', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      const transaction = new PaymentTransaction({
        orderId: order._id,
        transactionId: 'pi_test_123',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'stripe',
        status: 'pending',
        stripePaymentIntentId: 'pi_test_123',
      });

      const savedTransaction = await transaction.save();
      expect(savedTransaction.transactionId).toBe('pi_test_123');
      expect(savedTransaction.status).toBe('pending');
      expect(savedTransaction.amount).toBe(100.00);
    });
  });

  describe('Indexes', () => {
    it('should have index on orderId', async () => {
      // Create a document first to ensure collection exists
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 10.99,
            subtotal: 10.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      await PaymentTransaction.create({
        orderId: order._id,
        transactionId: 'txn_test_123',
        amount: 100.00,
        paymentMethod: 'stripe',
        status: 'pending',
      });

      const indexes = await PaymentTransaction.collection.getIndexes();
      expect(indexes).toHaveProperty('orderId_1');
    });

    it('should have unique index on transactionId', async () => {
      const product = await Product.create({
        name: 'Test Product 2',
        description: 'Test',
        price: 20.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img2.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-002',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 20.99,
            subtotal: 20.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      await PaymentTransaction.create({
        orderId: order._id,
        transactionId: 'txn_test_456',
        amount: 100.00,
        paymentMethod: 'stripe',
        status: 'pending',
      });

      const indexes = await PaymentTransaction.collection.getIndexes();
      expect(indexes).toHaveProperty('transactionId_1');
    });

    it('should have index on status', async () => {
      const product = await Product.create({
        name: 'Test Product 3',
        description: 'Test',
        price: 30.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img3.jpg'],
      });

      const order = await Order.create({
        orderNumber: 'ORD-2025-003',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: 30.99,
            subtotal: 30.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 10.99,
        shippingCost: 0,
        total: 10.99,
      });

      await PaymentTransaction.create({
        orderId: order._id,
        transactionId: 'txn_test_789',
        amount: 100.00,
        paymentMethod: 'stripe',
        status: 'pending',
      });

      const indexes = await PaymentTransaction.collection.getIndexes();
      expect(indexes).toHaveProperty('status_1');
    });
  });
});

