const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Public routes
router.get('/', categoryController.listCategories.bind(categoryController));

// Admin routes
router.post(
    '/',
    requireAuth,
    requireRole('admin'),
    categoryController.createCategory.bind(categoryController)
);

router.put(
    '/:id',
    requireAuth,
    requireRole('admin'),
    categoryController.updateCategory.bind(categoryController)
);

router.delete(
    '/:id',
    requireAuth,
    requireRole('admin'),
    categoryController.deleteCategory.bind(categoryController)
);

module.exports = router;
