const Category = require('../models/Category');
const logger = require('../config/logger');

class CategoryController {
    /**
     * List all categories
     */
    async listCategories(req, res, next) {
        try {
            const categories = await Category.find().sort({ name: 1 }).lean();

            logger.info('Categories listed', {
                requestId: req.id,
                count: categories.length
            });

            res.json(categories);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Start a new category
     */
    async createCategory(req, res, next) {
        try {
            const category = await Category.create(req.body);

            logger.info('Category created', {
                requestId: req.id,
                categoryId: category._id,
                userId: req.userId
            });

            res.status(201).json(category);
        } catch (error) {
            if (error.code === 11000) {
                error.statusCode = 400;
                error.message = 'Category already exists';
            }
            next(error);
        }
    }

    /**
     * Update a category
     */
    async updateCategory(req, res, next) {
        try {
            const { id } = req.params;
            const category = await Category.findByIdAndUpdate(
                id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!category) {
                const error = new Error('Category not found');
                error.statusCode = 404;
                throw error;
            }

            logger.info('Category updated', {
                requestId: req.id,
                categoryId: category._id,
                userId: req.userId
            });

            res.json(category);
        } catch (error) {
            if (error.code === 11000) {
                error.statusCode = 400;
                error.message = 'Category already exists';
            }
            next(error);
        }
    }

    /**
     * Delete a category
     */
    async deleteCategory(req, res, next) {
        try {
            const { id } = req.params;
            const category = await Category.findByIdAndDelete(id);

            if (!category) {
                const error = new Error('Category not found');
                error.statusCode = 404;
                throw error;
            }

            logger.info('Category deleted', {
                requestId: req.id,
                categoryId: category._id,
                userId: req.userId
            });

            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CategoryController();
