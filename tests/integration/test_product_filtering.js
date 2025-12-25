const request = require('supertest');
const app = require('../../src/app');
const Product = require('../../src/models/Product');

describe('Product Filtering Integration Tests', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  it('should filter products by category', async () => {
    await Product.create([
      {
        name: 'Laptop',
        description: 'Description',
        price: 999.99,
        category: 'Electronics',
        stock: 10,
        images: ['https://example.com/laptop.jpg'],
      },
      {
        name: 'T-Shirt',
        description: 'Description',
        price: 19.99,
        category: 'Clothing',
        stock: 50,
        images: ['https://example.com/tshirt.jpg'],
      },
      {
        name: 'Phone',
        description: 'Description',
        price: 699.99,
        category: 'Electronics',
        stock: 20,
        images: ['https://example.com/phone.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?category=Electronics')
      .expect(200);

    expect(response.body.products.length).toBe(2);
    expect(response.body.products.every(p => p.category === 'Electronics')).toBe(true);
  });

  it('should filter products by price range', async () => {
    await Product.create([
      {
        name: 'Cheap Product',
        description: 'Description',
        price: 5.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/cheap.jpg'],
      },
      {
        name: 'Mid Product',
        description: 'Description',
        price: 49.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/mid.jpg'],
      },
      {
        name: 'Expensive Product',
        description: 'Description',
        price: 999.99,
        category: 'Electronics',
        stock: 10,
        images: ['https://example.com/expensive.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?minPrice=10&maxPrice=100')
      .expect(200);

    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].price).toBeGreaterThanOrEqual(10);
    expect(response.body.products[0].price).toBeLessThanOrEqual(100);
  });

  it('should filter products by stock availability', async () => {
    await Product.create([
      {
        name: 'In Stock',
        description: 'Description',
        price: 10.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/instock.jpg'],
      },
      {
        name: 'Out of Stock',
        description: 'Description',
        price: 20.99,
        category: 'Electronics',
        stock: 0,
        images: ['https://example.com/outofstock.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?inStock=true')
      .expect(200);

    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].stock).toBeGreaterThan(0);
  });

  it('should combine multiple filters', async () => {
    await Product.create([
      {
        name: 'Product 1',
        description: 'Description',
        price: 25.99,
        category: 'Electronics',
        stock: 50,
        images: ['https://example.com/img1.jpg'],
      },
      {
        name: 'Product 2',
        description: 'Description',
        price: 75.99,
        category: 'Electronics',
        stock: 30,
        images: ['https://example.com/img2.jpg'],
      },
      {
        name: 'Product 3',
        description: 'Description',
        price: 15.99,
        category: 'Clothing',
        stock: 100,
        images: ['https://example.com/img3.jpg'],
      },
    ]);

    const response = await request(app)
      .get('/api/v1/products?category=Electronics&minPrice=20&maxPrice=50')
      .expect(200);

    expect(response.body.products.length).toBe(1);
    expect(response.body.products[0].category).toBe('Electronics');
    expect(response.body.products[0].price).toBeGreaterThanOrEqual(20);
    expect(response.body.products[0].price).toBeLessThanOrEqual(50);
  });
});

