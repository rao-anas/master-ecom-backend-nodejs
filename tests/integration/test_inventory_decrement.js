const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const InventoryLog = require('../../src/models/InventoryLog');

describe('Inventory Decrement Integration Tests', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await InventoryLog.deleteMany({});
  });

  it('should decrement inventory when order is created', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const initialStock = product.stock;

    const cart = await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product._id,
          quantity: 3,
          unitPrice: 10.99,
          subtotal: 32.97,
        },
      ],
      total: 32.97,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create checkout session
    const checkoutResponse = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
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
        paymentMethod: 'cash_on_delivery',
      })
      .expect(200);

    const checkoutSessionId = checkoutResponse.body.checkoutSessionId;

    // Confirm checkout (creates order and decrements inventory)
    await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Cookie', `sessionId=test-session`)
      .send({
        checkoutSessionId,
        paymentMethod: 'cash_on_delivery',
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
      })
      .expect(200);

    // Verify inventory was decremented
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(initialStock - 3);
    expect(updatedProduct.stock).toBe(97);
  });

  it('should create inventory log entry when order is created', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const cart = await Cart.create({
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

    // Create checkout session
    const checkoutResponse = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
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
        paymentMethod: 'cash_on_delivery',
      })
      .expect(200);

    const checkoutSessionId = checkoutResponse.body.checkoutSessionId;

    // Confirm checkout
    const confirmResponse = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Cookie', `sessionId=test-session`)
      .send({
        checkoutSessionId,
        paymentMethod: 'cash_on_delivery',
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
      })
      .expect(200);

    const orderId = confirmResponse.body._id;

    // Verify inventory log was created
    const inventoryLogs = await InventoryLog.find({ productId: product._id });
    expect(inventoryLogs.length).toBeGreaterThan(0);
    
    const saleLog = inventoryLogs.find(log => log.changeType === 'sale');
    expect(saleLog).toBeDefined();
    expect(saleLog.quantityChange).toBe(-2);
    expect(saleLog.orderId.toString()).toBe(orderId.toString());
  });

  it('should prevent order creation if inventory is insufficient', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 5,
      images: ['https://example.com/img.jpg'],
    });

    const cart = await Cart.create({
      sessionId: 'test-session',
      items: [
        {
          productId: product._id,
          quantity: 10, // More than available stock
          unitPrice: 10.99,
          subtotal: 109.90,
        },
      ],
      total: 109.90,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create checkout session should fail due to insufficient inventory
    const checkoutResponse = await request(app)
      .post('/api/v1/checkout')
      .set('Cookie', `sessionId=test-session`)
      .send({
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
        paymentMethod: 'cash_on_delivery',
      })
      .expect(400);

    expect(checkoutResponse.body).toHaveProperty('error');

    // Verify inventory was not decremented
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(5);
  });
});

