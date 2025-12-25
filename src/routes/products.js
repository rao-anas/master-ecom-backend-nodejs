const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const validateProductList = require('../middleware/validateProductList');
const validateProduct = require('../middleware/validateProduct');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validators } = require('../utils/validators');

// Public routes
// GET /api/v1/products - List products with pagination, search, and filtering
router.get(
  '/',
  validateProductList,
  productController.listProducts.bind(productController)
);

// Admin routes (require authentication and admin role)
// These must come BEFORE the parameterized routes to avoid route conflicts
// POST /api/v1/products - Create a new product
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validateProduct.create,
  productController.createProduct.bind(productController)
);

// GET /api/v1/products/:productId - Get product by ID
router.get(
  '/:productId',
  validators.mongoId('productId'),
  productController.getProduct.bind(productController)
);

// PUT /api/v1/products/:productId - Update a product
router.put(
  '/:productId',
  requireAuth,
  requireRole('admin'),
  validateProduct.productId,
  validateProduct.update,
  productController.updateProduct.bind(productController)
);

// DELETE /api/v1/products/:productId - Delete a product
router.delete(
  '/:productId',
  requireAuth,
  requireRole('admin'),
  validateProduct.productId,
  productController.deleteProduct.bind(productController)
);

module.exports = router;

