const request = require('supertest');
const app = require('../../src/app');
const Product = require('../../src/models/Product');

describe('Product Search Integration Tests', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  it('should search products by name', async () => {
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
        name: 'Desktop Computer',
        description: 'Powerful desktop',
        price: 1299.99,
        category: 'Electronics',
        stock: 5,
        images: ['https://example.com/desktop.jpg'],
      },
      {
        name: 'Mouse Pad',
        description: 'Computer accessory',
        price: 9.99,
        category: 'Accessories',
        stock: 50,
        images: ['https://example.com/mousepad.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?search=computer')
      .expect(200);

    // Text search matches both name and description, so "Mouse Pad" with "Computer accessory" also matches
    expect(response.body.products.length).toBeGreaterThanOrEqual(2);
    // Verify at least the expected products are in results
    const productNames = response.body.products.map(p => p.name.toLowerCase());
    expect(productNames).toContain('laptop computer');
    expect(productNames).toContain('desktop computer');
  });

  it('should search products by description', async () => {
    await Product.create([
      {
        name: 'Product A',
        description: 'Wireless bluetooth headphones',
        price: 79.99,
        category: 'Electronics',
        stock: 20,
        images: ['https://example.com/headphones.jpg'],
      },
      {
        name: 'Product B',
        description: 'Wired headphones',
        price: 29.99,
        category: 'Electronics',
        stock: 30,
        images: ['https://example.com/wired.jpg'],
      },
      {
        name: 'Product C',
        description: 'Computer mouse',
        price: 19.99,
        category: 'Accessories',
        stock: 50,
        images: ['https://example.com/mouse.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?search=headphones')
      .expect(200);

    expect(response.body.products.length).toBe(2);
    expect(response.body.products.every(p => 
      p.description.toLowerCase().includes('headphones')
    )).toBe(true);
  });

  it('should return empty array for no search results', async () => {
    await Product.create({
      name: 'Test Product',
      description: 'Test description',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const response = await request(app)
      .get('/api/v1/products?search=nonexistent')
      .expect(200);

    expect(response.body.products).toHaveLength(0);
  });

  it('should be case-insensitive', async () => {
    await Product.create({
      name: 'Laptop Computer',
      description: 'High performance laptop',
      price: 999.99,
      category: 'Electronics',
      stock: 10,
      images: ['https://example.com/laptop.jpg'],
    });

    const response = await request(app)
      .get('/api/v1/products?search=LAPTOP')
      .expect(200);

    expect(response.body.products.length).toBeGreaterThan(0);
  });
});

