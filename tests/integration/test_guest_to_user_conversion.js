const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Cart = require('../../src/models/Cart');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Guest to User Conversion Integration Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
  });

  it('should convert guest cart to user cart on registration', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    // Create guest cart
    const guestCart = await Cart.create({
      sessionId: 'guest-session-123',
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

    // Register user with session cookie to convert guest cart
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', `sessionId=guest-session-123`)
      .send({
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(201);

    const token = registerResponse.body.token;
    const userId = registerResponse.body.user._id;

    // Check if cart was converted
    const userCart = await Cart.findOne({ userId });
    expect(userCart).toBeDefined();
    expect(userCart.items).toHaveLength(1);
    expect(userCart.items[0].quantity).toBe(2);
    expect(userCart.total).toBe(21.98);

    // Verify guest cart no longer exists or is empty
    const oldGuestCart = await Cart.findOne({ sessionId: 'guest-session-123' });
    expect(oldGuestCart).toBeNull();
  });

  it('should merge guest cart with existing user cart on login', async () => {
    const product1 = await Product.create({
      name: 'Product 1',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img1.jpg'],
    });

    const product2 = await Product.create({
      name: 'Product 2',
      description: 'Test',
      price: 20.99,
      category: 'Electronics',
      stock: 50,
      images: ['https://example.com/img2.jpg'],
    });

    // Create user with existing cart (plain password - model will hash it)
    const user = await User.create({
      email: 'existing@example.com',
      password: 'Password123',
      firstName: 'Existing',
      lastName: 'User',
    });

    const userCart = await Cart.create({
      userId: user._id,
      items: [
        {
          productId: product1._id,
          quantity: 1,
          unitPrice: 10.99,
          subtotal: 10.99,
        },
      ],
      total: 10.99,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Create guest cart with different product
    const guestCart = await Cart.create({
      sessionId: 'guest-session-456',
      items: [
        {
          productId: product2._id,
          quantity: 1,
          unitPrice: 20.99,
          subtotal: 20.99,
        },
      ],
      total: 20.99,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Login user
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', `sessionId=guest-session-456`)
      .send({
        email: 'existing@example.com',
        password: 'Password123',
      })
      .expect(200);

    // Check if carts were merged
    const mergedCart = await Cart.findOne({ userId: user._id });
    expect(mergedCart).toBeDefined();
    expect(mergedCart.items).toHaveLength(2);
    expect(mergedCart.total).toBeCloseTo(31.98, 2);

    // Verify guest cart no longer exists
    const oldGuestCart = await Cart.findOne({ sessionId: 'guest-session-456' });
    expect(oldGuestCart).toBeNull();
  });

  it('should link guest orders to user account on registration', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    // Create guest order
    const guestOrder = await Order.create({
      customerEmail: 'guest@example.com',
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
      paymentMethod: 'cash_on_delivery',
      subtotal: 10.99,
      shippingCost: 5.99,
      total: 16.98,
    });

    // Register user with same email
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'guest@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(201);

    const userId = registerResponse.body.user._id;

    // Check if order was linked
    const linkedOrder = await Order.findById(guestOrder._id);
    expect(linkedOrder.customerId.toString()).toBe(userId.toString());
    expect(linkedOrder.customerEmail).toBe('guest@example.com');
  });
});

