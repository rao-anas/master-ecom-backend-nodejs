const Product = require('../models/Product');
const logger = require('../config/logger');

class ProductService {
  /**
   * List products with pagination, search, and filtering
   */
  async listProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
    } = options;

    // Build query
    const query = {};

    // Search query (text search on name and description)
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        query.price.$lte = parseFloat(maxPrice);
      }
    }

    // Stock availability filter
    if (inStock !== undefined) {
      if (inStock === 'true' || inStock === true) {
        query.stock = { $gt: 0 };
      } else {
        query.stock = { $eq: 0 };
      }
    }

    try {
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Product.countDocuments(query);

      // Build find options
      const findOptions = {
        skip,
        limit: parseInt(limit),
      };

      // Add text search score if searching
      if (search) {
        findOptions.sort = { score: { $meta: 'textScore' } };
      } else {
        // Default sort options
        let sortConfig = { createdAt: -1 };

        // Handle custom sort
        if (options.sort) {
          switch (options.sort) {
            case 'price_asc':
              sortConfig = { price: 1 };
              break;
            case 'price_desc':
              sortConfig = { price: -1 };
              break;
            case 'name_asc':
              sortConfig = { name: 1 };
              break;
            case 'name_desc':
              sortConfig = { name: -1 };
              break;
            default:
              sortConfig = { createdAt: -1 };
          }
        }
        findOptions.sort = sortConfig;
      }

      // Execute query
      const products = await Product.find(query, null, findOptions)
        .select('-__v')
        .lean();

      return {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('Error listing products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    try {
      const product = await Product.findById(productId).select('-__v').lean();

      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      return product;
    } catch (error) {
      if (error.name === 'CastError') {
        error.statusCode = 400;
        error.message = 'Invalid product ID format';
      }
      logger.error('Error getting product by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new product (admin only)
   */
  async createProduct(productData) {
    try {
      const product = await Product.create(productData);

      logger.info('Product created', {
        productId: product._id,
        name: product.name,
      });

      return product;
    } catch (error) {
      if (error.name === 'ValidationError') {
        error.statusCode = 400;
      }
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update a product (admin only)
   */
  async updateProduct(productId, updateData) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-__v');

      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info('Product updated', {
        productId: product._id,
        name: product.name,
      });

      return product;
    } catch (error) {
      if (error.name === 'CastError') {
        error.statusCode = 400;
        error.message = 'Invalid product ID format';
      } else if (error.name === 'ValidationError') {
        error.statusCode = 400;
      }
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete a product (admin only)
   */
  async deleteProduct(productId) {
    try {
      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info('Product deleted', {
        productId,
        name: product.name,
      });

      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error.name === 'CastError') {
        error.statusCode = 400;
        error.message = 'Invalid product ID format';
      }
      logger.error('Error deleting product:', error);
      throw error;
    }
  }
}

module.exports = new ProductService();

