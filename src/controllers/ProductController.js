const productService = require('../services/ProductService');
const logger = require('../config/logger');

class ProductController {
  /**
   * List products with pagination, search, and filtering
   */
  async listProducts(req, res, next) {
    try {
      const {
        page,
        limit,
        search,
        category,
        minPrice,
        maxPrice,
        inStock,
        sort,
      } = req.query;

      const result = await productService.listProducts({
        page,
        limit,
        search,
        category,
        minPrice,
        maxPrice,
        inStock,
        sort,
      });

      logger.info('Products listed', {
        requestId: req.id,
        page: result.pagination.page,
        total: result.pagination.total,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const product = await productService.getProductById(productId);

      logger.info('Product retrieved', {
        requestId: req.id,
        productId,
      });

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new product (admin only)
   */
  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);

      logger.info('Product created', {
        requestId: req.id,
        productId: product._id,
        userId: req.userId,
      });

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a product (admin only)
   */
  async updateProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const product = await productService.updateProduct(productId, req.body);

      logger.info('Product updated', {
        requestId: req.id,
        productId,
        userId: req.userId,
      });

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a product (admin only)
   */
  async deleteProduct(req, res, next) {
    try {
      const { productId } = req.params;
      await productService.deleteProduct(productId);

      logger.info('Product deleted', {
        requestId: req.id,
        productId,
        userId: req.userId,
      });

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();

