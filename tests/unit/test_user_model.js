const mongoose = require('mongoose');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  beforeAll(async () => {
    // MongoDB Memory Server is set up in tests/setup.js
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('Validation', () => {
    it('should require email field', async () => {
      const user = new User({
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password field', async () => {
      const user = new User({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require firstName field', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123',
        lastName: 'User',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require lastName field', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password to be at least 8 characters', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Pass123',
        firstName: 'Test',
        lastName: 'User',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password to contain uppercase, lowercase, and number', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should create a valid user', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const savedUser = await user.save();
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.password).not.toBe('Password123'); // Should be hashed
      expect(savedUser.firstName).toBe('Test');
      expect(savedUser.lastName).toBe('User');
      expect(savedUser.role).toBe('customer');
      expect(savedUser.isEmailVerified).toBe(false);
    });

    it('should hash password before saving', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const savedUser = await user.save();
      expect(savedUser.password).not.toBe('Password123');
      
      // Verify password can be compared
      const isMatch = await bcrypt.compare('Password123', savedUser.password);
      expect(isMatch).toBe(true);
    });

    it('should set default role to customer', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const savedUser = await user.save();
      expect(savedUser.role).toBe('customer');
    });

    it('should set default isEmailVerified to false', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const savedUser = await user.save();
      expect(savedUser.isEmailVerified).toBe(false);
    });
  });

  describe('Indexes', () => {
    it('should have unique index on email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    it('should have index on role', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('role_1');
    });
  });
});

