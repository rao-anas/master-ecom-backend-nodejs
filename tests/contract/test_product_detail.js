const request = require('supertest');
const app = require('../../src/app');
const Product = require('../../src/models/Product');
const mongoose = require('mongoose');

describe('GET /api/v1/products/:productId - Contract Tests', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  it('should return 200 with product details for valid productId', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      specifications: { color: 'red', size: 'large' },
    });

    const response = await request(app)
      .get(`/api/v1/products/${product._id}`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body).toHaveProperty('name', 'Test Product');
    expect(response.body).toHaveProperty('description', 'Test description');
    expect(response.body).toHaveProperty('price', 29.99);
    expect(response.body).toHaveProperty('category', 'Electronics');
    expect(response.body).toHaveProperty('stock', 100);
    expect(response.body).toHaveProperty('images');
    expect(response.body).toHaveProperty('isAvailable', true);
    expect(response.body).toHaveProperty('specifications');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
  });

  it('should return 404 for non-existent productId', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .get(`/api/v1/products/${fakeId}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('requestId');
  });

  it('should return 400 for invalid productId format', async () => {
    const response = await request(app)
      .get('/api/v1/products/invalid-id')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('requestId');
  });

  it('should include all product fields in response', async () => {
    const product = await Product.create({
      name: 'Complete Product',
      description: 'Complete description',
      price: 49.99,
      category: 'Electronics',
      stock: 50,
      images: ['https://example.com/img1.jpg'],
      specifications: { brand: 'Test', model: 'XYZ' },
    });

    const response = await request(app)
      .get(`/api/v1/products/${product._id}`)
      .expect(200);

    const requiredFields = [
      '_id',
      'name',
      'description',
      'price',
      'images',
      'category',
      'stock',
      'isAvailable',
      'specifications',
      'createdAt',
      'updatedAt',
    ];

    requiredFields.forEach(field => {
      expect(response.body).toHaveProperty(field);
    });
  });
});

