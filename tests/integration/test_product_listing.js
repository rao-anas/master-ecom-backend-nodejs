const request = require('supertest');
const app = require('../../src/app');
const Product = require('../../src/models/Product');

describe('Product Listing Integration Tests', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  it('should list products with default pagination', async () => {
    // Create 25 products
    const products = Array.from({ length: 25 }, (_, i) => ({
      name: `Product ${i + 1}`,
      description: `Description ${i + 1}`,
      price: (i + 1) * 10,
      category: 'Electronics',
      stock: 100,
      images: [`https://example.com/img${i + 1}.jpg`],
    }));
    await Product.create(products);

    const response = await request(app)
      .get('/api/v1/products')
      .expect(200);

    expect(response.body.products.length).toBeLessThanOrEqual(20); // default limit
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.total).toBe(25);
  });

  it('should handle empty product list', async () => {
    const response = await request(app)
      .get('/api/v1/products')
      .expect(200);

    expect(response.body.products).toHaveLength(0);
    expect(response.body.pagination.total).toBe(0);
  });

  it('should return correct pagination metadata', async () => {
    const products = Array.from({ length: 35 }, (_, i) => ({
      name: `Product ${i + 1}`,
      description: `Description ${i + 1}`,
      price: (i + 1) * 10,
      category: 'Electronics',
      stock: 100,
      images: [`https://example.com/img${i + 1}.jpg`],
    }));
    await Product.create(products);

    const response = await request(app)
      .get('/api/v1/products?page=2&limit=10')
      .expect(200);

    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.pagination.total).toBe(35);
    expect(response.body.pagination.totalPages).toBe(4);
    expect(response.body.products).toHaveLength(10);
  });
});

