const mongoose = require('mongoose');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');

describe('Order Model', () => {
  beforeAll(async () => {
    // MongoDB Memory Server is set up in tests/setup.js
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
  });

  describe('Validation', () => {
    it('should require orderNumber', async () => {
      const order = new Order({
        customerEmail: 'test@example.com',
        items: [],
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
        subtotal: 0,
        shippingCost: 0,
        total: 0,
      });

      await expect(order.save()).rejects.toThrow();
    });

    it('should require customerEmail', async () => {
      const order = new Order({
        orderNumber: 'ORD-2025-001',
        items: [],
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
        subtotal: 0,
        shippingCost: 0,
        total: 0,
      });

      await expect(order.save()).rejects.toThrow();
    });

    it('should require items array', async () => {
      const order = new Order({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
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
        subtotal: 0,
        shippingCost: 0,
        total: 0,
      });

      await expect(order.save()).rejects.toThrow();
    });

    it('should require shippingAddress', async () => {
      const order = new Order({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [],
        billingAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
        paymentMethod: 'stripe',
        subtotal: 0,
        shippingCost: 0,
        total: 0,
      });

      await expect(order.save()).rejects.toThrow();
    });

    it('should require paymentMethod', async () => {
      const order = new Order({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [],
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
        subtotal: 0,
        shippingCost: 0,
        total: 0,
      });

      await expect(order.save()).rejects.toThrow();
    });

    it('should create a valid order', async () => {
      const product = await Product.create({
        name: 'Test Product',
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });

      const order = new Order({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: 2,
            unitPrice: 10.99,
            subtotal: 21.98,
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
        subtotal: 21.98,
        shippingCost: 5.99,
        total: 27.97,
      });

      const savedOrder = await order.save();
      expect(savedOrder.orderNumber).toBe('ORD-2025-001');
      expect(savedOrder.paymentStatus).toBe('pending');
      expect(savedOrder.orderStatus).toBe('pending');
      expect(savedOrder.total).toBe(27.97);
    });

    it('should validate paymentMethod enum', async () => {
      const order = new Order({
        orderNumber: 'ORD-2025-001',
        customerEmail: 'test@example.com',
        items: [],
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
        paymentMethod: 'invalid',
        subtotal: 0,
        shippingCost: 0,
        total: 0,
      });

      await expect(order.save()).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should have unique index on orderNumber', async () => {
      const indexes = await Order.collection.getIndexes();
      expect(indexes).toHaveProperty('orderNumber_1');
    });

    it('should have index on customerId', async () => {
      const indexes = await Order.collection.getIndexes();
      expect(indexes).toHaveProperty('customerId_1');
    });

    it('should have index on customerEmail', async () => {
      const indexes = await Order.collection.getIndexes();
      expect(indexes).toHaveProperty('customerEmail_1');
    });

    it('should have index on paymentStatus', async () => {
      const indexes = await Order.collection.getIndexes();
      expect(indexes).toHaveProperty('paymentStatus_1');
    });

    it('should have index on orderStatus', async () => {
      const indexes = await Order.collection.getIndexes();
      expect(indexes).toHaveProperty('orderStatus_1');
    });
  });
});

