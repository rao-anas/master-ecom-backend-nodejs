const request = require('supertest');
const app = require('../../src/app');
const Product = require('../../src/models/Product');

describe('GET /api/v1/products - Contract Tests', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  it('should return 200 with products array and pagination', async () => {
    // Create test products
    await Product.create([
      {
        name: 'Product 1',
        description: 'Description 1',
        price: 10.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/img1.jpg'],
      },
      {
        name: 'Product 2',
        description: 'Description 2',
        price: 20.99,
        category: 'Clothing',
        stock: 30,
        images: ['https://example.com/img2.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products')
      .expect(200);

    expect(response.body).toHaveProperty('products');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.products)).toBe(true);
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
  });

  it('should support pagination with page and limit query params', async () => {
    // Create 15 products
    const products = Array.from({ length: 15 }, (_, i) => ({
      name: `Product ${i + 1}`,
      description: `Description ${i + 1}`,
      price: (i + 1) * 10,
      category: 'Electronics',
      stock: 100,
      images: [`https://example.com/img${i + 1}.jpg`],
    }));
    await Product.create(products);

    const response = await request(app)
      .get('/api/v1/products?page=2&limit=5')
      .expect(200);

    expect(response.body.products).toHaveLength(5);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(5);
    expect(response.body.pagination.total).toBe(15);
  });

  it('should support search query parameter', async () => {
    await Product.create([
      {
        name: 'Laptop Computer',
        description: 'High performance laptop',
        price: 999.99,
        category: 'Electronics',
        stock: 10,
        images: ['https://example.com/laptop.jpg'],
      },
      {
        name: 'Mouse Pad',
        description: 'Computer mouse pad',
        price: 9.99,
        category: 'Accessories',
        stock: 50,
        images: ['https://example.com/mousepad.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?search=laptop')
      .expect(200);

    expect(response.body.products.length).toBeGreaterThan(0);
    expect(response.body.products[0].name.toLowerCase()).toContain('laptop');
  });

  it('should support category filter', async () => {
    await Product.create([
      {
        name: 'Product 1',
        description: 'Description 1',
        price: 10.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/img1.jpg'],
      },
      {
        name: 'Product 2',
        description: 'Description 2',
        price: 20.99,
        category: 'Clothing',
        stock: 30,
        images: ['https://example.com/img2.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?category=Electronics')
      .expect(200);

    expect(response.body.products.every(p => p.category === 'Electronics')).toBe(true);
  });

  it('should support price range filters (minPrice, maxPrice)', async () => {
    await Product.create([
      {
        name: 'Cheap Product',
        description: 'Description',
        price: 5.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/img1.jpg'],
      },
      {
        name: 'Expensive Product',
        description: 'Description',
        price: 99.99,
        category: 'Electronics',
        stock: 30,
        images: ['https://example.com/img2.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?minPrice=10&maxPrice=50')
      .expect(200);

    expect(response.body.products.every(p => p.price >= 10 && p.price <= 50)).toBe(true);
  });

  it('should support inStock filter', async () => {
    await Product.create([
      {
        name: 'In Stock Product',
        description: 'Description',
        price: 10.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/img1.jpg'],
      },
      {
        name: 'Out of Stock Product',
        description: 'Description',
        price: 20.99,
        category: 'Electronics',
        stock: 0,
        images: ['https://example.com/img2.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?inStock=true')
      .expect(200);

    expect(response.body.products.every(p => p.stock > 0)).toBe(true);
  });

  it('should return 400 for invalid page parameter', async () => {
    const response = await request(app)
      .get('/api/v1/products?page=invalid')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('requestId');
  });

  it('should return 400 for invalid limit parameter (exceeds max)', async () => {
    const response = await request(app)
      .get('/api/v1/products?limit=200')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

