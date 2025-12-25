const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const crypto = require('crypto');

describe('POST /api/v1/auth/reset-password - Contract Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should return 200 and reset password with valid token', async () => {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.create({
      email: 'test@example.com',
      password: 'OldPassword123',
      firstName: 'Test',
      lastName: 'User',
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewPassword123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('message');

    // Verify password was changed
    const updatedUser = await User.findById(user._id);
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare('NewPassword123', updatedUser.password);
    expect(isMatch).toBe(true);
  });

  it('should return 400 for invalid token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'invalid-token',
        password: 'NewPassword123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for expired token', async () => {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.create({
      email: 'test@example.com',
      password: 'OldPassword123',
      firstName: 'Test',
      lastName: 'User',
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() - 1000), // Expired
    });

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewPassword123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for weak password', async () => {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.create({
      email: 'test@example.com',
      password: 'OldPassword123',
      firstName: 'Test',
      lastName: 'User',
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'weak',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 for missing token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        password: 'NewPassword123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

