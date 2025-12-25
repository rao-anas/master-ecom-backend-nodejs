const request = require('supertest');
const app = require('../../src/app');
const Wishlist = require('../../src/models/Wishlist');
const Product = require('../../src/models/Product');
const User = require('../../src/models/User');
const Cart = require('../../src/models/Cart');
const jwt = require('jsonwebtoken');

describe('Wishlist Operations Integration Tests', () => {
  let user;
  let token;
  let product1;
  let product2;

  beforeEach(async () => {
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Cart.deleteMany({});

    product1 = await Product.create({
      name: 'Product 1',
      description: 'Test product 1',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img1.jpg'],
    });

    product2 = await Product.create({
      name: 'Product 2',
      description: 'Test product 2',
      price: 19.99,
      category: 'Clothing',
      stock: 50,
      images: ['https://example.com/img2.jpg'],
    });

    user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    });

    token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('should create wishlist, add products, and retrieve wishlist', async () => {
    // Add first product to wishlist (creates wishlist automatically)
    const addResponse1 = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
      })
      .expect(200);

    const wishlistId = addResponse1.body._id;

    // Add second product
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product2._id.toString(),
      })
      .expect(200);

    // Retrieve wishlist
    const getResponse = await request(app)
      .get('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(getResponse.body)).toBe(true);
    expect(getResponse.body.length).toBe(1);
    expect(getResponse.body[0].productIds.length).toBe(2);
  });

  it('should create multiple wishlists for authenticated user', async () => {
    // Create first wishlist
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gift Ideas',
      })
      .expect(200);

    // Create second wishlist
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'For Mom',
      })
      .expect(200);

    // Retrieve all wishlists
    const getResponse = await request(app)
      .get('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.length).toBe(2);
    const names = getResponse.body.map(w => w.name);
    expect(names).toContain('Gift Ideas');
    expect(names).toContain('For Mom');
  });

  it('should add products to specific wishlist', async () => {
    // Create named wishlist
    const createResponse = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gift Ideas',
      })
      .expect(200);

    const wishlistId = createResponse.body._id;

    // Add product to specific wishlist
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
        wishlistId: wishlistId.toString(),
      })
      .expect(200);

    // Verify product is in correct wishlist
    const getResponse = await request(app)
      .get(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.productIds.length).toBe(1);
    // Handle both ObjectId and populated object formats
    const productId = typeof getResponse.body.productIds[0] === 'object' && getResponse.body.productIds[0]._id 
      ? getResponse.body.productIds[0]._id.toString() 
      : getResponse.body.productIds[0].toString();
    expect(productId).toBe(product1._id.toString());
  });

  it('should remove product from wishlist', async () => {
    // Create wishlist with products
    const addResponse = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
      })
      .expect(200);

    const wishlistId = addResponse.body._id;

    // Add second product
    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product2._id.toString(),
      })
      .expect(200);

    // Remove first product
    await request(app)
      .delete(`/api/v1/wishlists/${wishlistId}/products/${product1._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify product removed
    const getResponse = await request(app)
      .get(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.productIds.length).toBe(1);
    // Handle both ObjectId and populated object formats
    const productId = typeof getResponse.body.productIds[0] === 'object' && getResponse.body.productIds[0]._id 
      ? getResponse.body.productIds[0]._id.toString() 
      : getResponse.body.productIds[0].toString();
    expect(productId).toBe(product2._id.toString());
  });

  it('should add wishlist items to cart', async () => {
    // Create wishlist with products
    const addResponse = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
      })
      .expect(200);

    const wishlistId = addResponse.body._id;

    await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product2._id.toString(),
      })
      .expect(200);

    // Add wishlist items to cart
    const addToCartResponse = await request(app)
      .post(`/api/v1/wishlists/${wishlistId}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(addToCartResponse.body).toHaveProperty('cart');
    expect(addToCartResponse.body).toHaveProperty('itemsAdded', 2);
    expect(addToCartResponse.body.cart.items.length).toBe(2);

    // Verify products remain in wishlist
    const wishlistResponse = await request(app)
      .get(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(wishlistResponse.body.productIds.length).toBe(2);
  });

  it('should update wishlist name', async () => {
    // Create wishlist
    const createResponse = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Old Name',
      })
      .expect(200);

    const wishlistId = createResponse.body._id;

    // Update name
    const updateResponse = await request(app)
      .put(`/api/v1/wishlists/${wishlistId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'New Name',
      })
      .expect(200);

    expect(updateResponse.body.name).toBe('New Name');
  });

  it('should share and view shared wishlist', async () => {
    // Create wishlist
    const createResponse = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
      })
      .expect(200);

    const wishlistId = createResponse.body._id;

    // Share wishlist
    const shareResponse = await request(app)
      .post(`/api/v1/wishlists/${wishlistId}/share`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(shareResponse.body).toHaveProperty('shareToken');
    expect(shareResponse.body).toHaveProperty('shareUrl');

    // View shared wishlist (no auth required)
    const viewResponse = await request(app)
      .get(`/api/v1/wishlists/shared/${shareResponse.body.shareToken}`)
      .expect(200);

    expect(viewResponse.body._id.toString()).toBe(wishlistId.toString());
    expect(viewResponse.body.isShared).toBe(true);
  });

  it('should prevent duplicate products in wishlist', async () => {
    // Add product first time
    const addResponse1 = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
      })
      .expect(200);

    const wishlistId = addResponse1.body._id;

    // Try to add same product again
    const addResponse2 = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product1._id.toString(),
      })
      .expect(200);

    // Should still have only 1 product
    expect(addResponse2.body.productIds.length).toBe(1);
  });

  it('should enforce 50 product limit', async () => {
    // Create 50 products
    const products = [];
    for (let i = 0; i < 50; i++) {
      const p = await Product.create({
        name: `Product ${i}`,
        description: 'Test',
        price: 10.99,
        category: 'Electronics',
        stock: 100,
        images: ['https://example.com/img.jpg'],
      });
      products.push(p);
    }

    // Create wishlist and add 50 products
    const wishlist = await Wishlist.create({
      userId: user._id,
      name: 'Full Wishlist',
      productIds: products.map(p => p._id),
      isDefault: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Try to add 51st product
    const newProduct = await Product.create({
      name: 'New Product',
      description: 'Test',
      price: 10.99,
      category: 'Electronics',
      stock: 100,
      images: ['https://example.com/img.jpg'],
    });

    const response = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: newProduct._id.toString(),
        wishlistId: wishlist._id.toString(),
      })
      .expect(400);

    expect(response.body.error).toContain('50 products');
  });
});

